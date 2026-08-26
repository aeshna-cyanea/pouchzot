// Continuous user zoom shared by the ASCII and tile map renderers. Normal
// play starts at 1x; 0.5x provides the broad level overview that is the
// gesture's primary use case, while 2x intentionally allows cropping inside
// DCSS's full LOS for players who value glyph/tile size over context.
export const MIN_MAP_ZOOM = 0.5
export const MAX_MAP_ZOOM = 2

const DOUBLE_TAP_MS = 300
const DOUBLE_TAP_SLOP = 30
const DRAG_SLOP = 4
const PINCH_SLOP = 8
const PINCH_PAN_SLOP = 8
// Moving one phone-height-ish span would be far too sensitive. 240 px per
// doubling gives a thumb enough travel for fine adjustment while still
// reaching the full range in one comfortable drag.
const PX_PER_DOUBLING = 240

export function clampMapZoom(scale: number): number {
  return Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, scale))
}

export function zoomFromDrag(startScale: number, deltaY: number): number {
  return clampMapZoom(startScale * 2 ** (deltaY / PX_PER_DOUBLING))
}

export function zoomFromPinch(startScale: number, startSpan: number, currentSpan: number): number {
  if (startSpan <= 0 || !Number.isFinite(startSpan) || !Number.isFinite(currentSpan)) {
    return clampMapZoom(startScale)
  }
  return clampMapZoom(startScale * currentSpan / startSpan)
}

export interface ZoomDragOptions {
  enabled: () => boolean
  acceptsTarget: (target: EventTarget | null) => boolean
  getScale: () => number
  setScale: (scale: number) => void
  // The held second tap has claimed this contact sequence. Hosts use this to
  // cancel a pending ordinary map tap before it reaches the server.
  onStart?: () => void
}

export interface ZoomDragBinding {
  // Clears pending/active gesture recognition. Used when a second finger
  // lands so a pending one-finger gesture cannot also become a zoom drag.
  cancel: () => void
  destroy: () => void
}

export interface PinchPoint {
  x: number
  y: number
}

export interface PinchZoomOptions extends Omit<ZoomDragOptions, 'onStart'> {
  // Lets the host cancel a pending one-finger recognizer as soon as the
  // second contact makes this a pinch candidate. The midpoint lets it capture
  // the map location that should remain anchored beneath the gesture.
  onStart?: (midpoint: PinchPoint) => void
  // When present, owns both scale and midpoint updates. The simpler setScale
  // fallback preserves the standalone recognizer API for hosts that only zoom.
  onChange?: (scale: number, midpoint: PinchPoint) => void
}

// Google-Maps-style one-finger zoom: tap once, then press the second tap and
// drag down to zoom in or up to zoom out. Releasing a motionless second tap is
// deliberately a no-op; there is no legacy two-level toggle fallback.
export function bindZoomDrag(element: HTMLElement, opts: ZoomDragOptions): ZoomDragBinding {
  let lastTap: { t: number; x: number; y: number } | null = null
  let drag: { pointerId: number; startY: number; startScale: number; moved: boolean } | null = null

  const clear = (): void => {
    if (drag && element.hasPointerCapture?.(drag.pointerId)) {
      element.releasePointerCapture(drag.pointerId)
    }
    lastTap = null
    drag = null
  }

  const onPointerDown = (e: PointerEvent): void => {
    if (!opts.enabled()) { clear(); return }
    if (e.button !== 0 || !e.isPrimary || !opts.acceptsTarget(e.target)) return

    const now = e.timeStamp
    if (lastTap) {
      const dt = now - lastTap.t
      const dx = e.clientX - lastTap.x
      const dy = e.clientY - lastTap.y
      if (dt > 0 && dt < DOUBLE_TAP_MS && dx * dx + dy * dy < DOUBLE_TAP_SLOP ** 2) {
        opts.onStart?.()
        drag = {
          pointerId: e.pointerId,
          startY: e.clientY,
          startScale: opts.getScale(),
          moved: false,
        }
        lastTap = null
        element.setPointerCapture?.(e.pointerId)
        e.preventDefault()
        return
      }
    }

    lastTap = { t: now, x: e.clientX, y: e.clientY }
  }

  const onPointerMove = (e: PointerEvent): void => {
    if (!drag || e.pointerId !== drag.pointerId) return
    const deltaY = e.clientY - drag.startY
    if (!drag.moved && Math.abs(deltaY) < DRAG_SLOP) return
    drag.moved = true
    opts.setScale(zoomFromDrag(drag.startScale, deltaY))
    e.preventDefault()
  }

  const finishDrag = (e: PointerEvent): void => {
    if (!drag || e.pointerId !== drag.pointerId) return
    if (element.hasPointerCapture?.(e.pointerId)) element.releasePointerCapture(e.pointerId)
    drag = null
    // A completed second tap must not become the first tap of another gesture.
    lastTap = null
  }

  const onPointerCancel = (e: PointerEvent): void => {
    // A cancelled first tap must not seed a later gesture; cancellation means
    // the browser/OS took ownership of that contact sequence.
    if (!drag) { lastTap = null; return }
    finishDrag(e)
  }

  element.addEventListener('pointerdown', onPointerDown)
  element.addEventListener('pointermove', onPointerMove)
  element.addEventListener('pointerup', finishDrag)
  element.addEventListener('pointercancel', onPointerCancel)

  return {
    cancel: clear,
    destroy: () => {
      clear()
      element.removeEventListener('pointerdown', onPointerDown)
      element.removeEventListener('pointermove', onPointerMove)
      element.removeEventListener('pointerup', finishDrag)
      element.removeEventListener('pointercancel', onPointerCancel)
    },
  }
}

function touchSpan(a: Touch, b: Touch): number {
  return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY)
}

function touchMidpoint(a: Touch, b: Touch): PinchPoint {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }
}

// Conventional two-finger direct manipulation. Span changes zoom while
// midpoint changes pan; small independent slop thresholds keep contact jitter
// from rebuilding the map before the user has expressed either intent.
export function bindPinchZoom(element: HTMLElement, opts: PinchZoomOptions): ZoomDragBinding {
  let pinch: {
    startSpan: number
    startScale: number
    startMidpoint: PinchPoint
    active: boolean
  } | null = null

  const clear = (): void => { pinch = null }

  const onTouchStart = (e: TouchEvent): void => {
    if (!opts.enabled() || e.touches.length !== 2 || !opts.acceptsTarget(e.target)) {
      clear()
      return
    }
    const span = touchSpan(e.touches[0], e.touches[1])
    if (span <= 0) { clear(); return }
    const midpoint = touchMidpoint(e.touches[0], e.touches[1])
    opts.onStart?.(midpoint)
    pinch = { startSpan: span, startScale: opts.getScale(), startMidpoint: midpoint, active: false }
  }

  const onTouchMove = (e: TouchEvent): void => {
    if (!pinch) return
    if (e.touches.length !== 2) { clear(); return }
    const span = touchSpan(e.touches[0], e.touches[1])
    const midpoint = touchMidpoint(e.touches[0], e.touches[1])
    const midpointTravel = Math.hypot(
      midpoint.x - pinch.startMidpoint.x,
      midpoint.y - pinch.startMidpoint.y,
    )
    if (!pinch.active
      && Math.abs(span - pinch.startSpan) < PINCH_SLOP
      && midpointTravel < PINCH_PAN_SLOP) return
    pinch.active = true
    const scale = zoomFromPinch(pinch.startScale, pinch.startSpan, span)
    if (opts.onChange) opts.onChange(scale, midpoint)
    else opts.setScale(scale)
    e.preventDefault()
  }

  const onTouchEnd = (e: TouchEvent): void => {
    if (e.touches.length < 2) clear()
  }

  element.addEventListener('touchstart', onTouchStart, { passive: true })
  element.addEventListener('touchmove', onTouchMove, { passive: false })
  element.addEventListener('touchend', onTouchEnd, { passive: true })
  element.addEventListener('touchcancel', clear, { passive: true })

  return {
    cancel: clear,
    destroy: () => {
      clear()
      element.removeEventListener('touchstart', onTouchStart)
      element.removeEventListener('touchmove', onTouchMove)
      element.removeEventListener('touchend', onTouchEnd)
      element.removeEventListener('touchcancel', clear)
    },
  }
}
