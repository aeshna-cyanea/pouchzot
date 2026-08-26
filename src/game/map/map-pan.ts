const PAN_SLOP = 10

export interface MapPanOptions {
  enabled: () => boolean
  acceptsTarget: (target: EventTarget | null) => boolean
  onStart: () => void
  onPan: (clientDX: number, clientDY: number) => void
}

export interface MapPanBinding {
  cancel: () => void
  destroy: () => void
}

// A conventional one-contact direct-manipulation pan. It stays a candidate
// inside finger-jitter slop so taps and long presses retain their semantics;
// crossing the threshold claims the sequence and reports displacement from
// the original contact point.
export function bindMapPan(element: HTMLElement, opts: MapPanOptions): MapPanBinding {
  let drag: {
    pointerId: number
    startX: number
    startY: number
    active: boolean
  } | null = null

  const clear = (): void => {
    if (drag && element.hasPointerCapture?.(drag.pointerId)) {
      element.releasePointerCapture(drag.pointerId)
    }
    drag = null
  }

  const onPointerDown = (e: PointerEvent): void => {
    if (!opts.enabled() || e.button !== 0 || !e.isPrimary || !opts.acceptsTarget(e.target)) return
    clear()
    drag = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, active: false }
  }

  const onPointerMove = (e: PointerEvent): void => {
    if (!drag || e.pointerId !== drag.pointerId) return
    if (!opts.enabled()) { clear(); return }
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    if (!drag.active) {
      if (dx * dx + dy * dy <= PAN_SLOP ** 2) return
      drag.active = true
      element.setPointerCapture?.(e.pointerId)
      opts.onStart()
    }
    opts.onPan(dx, dy)
    e.preventDefault()
  }

  const onPointerEnd = (e: PointerEvent): void => {
    if (drag?.pointerId === e.pointerId) clear()
  }

  element.addEventListener('pointerdown', onPointerDown)
  element.addEventListener('pointermove', onPointerMove)
  element.addEventListener('pointerup', onPointerEnd)
  element.addEventListener('pointercancel', onPointerEnd)

  return {
    cancel: clear,
    destroy: () => {
      clear()
      element.removeEventListener('pointerdown', onPointerDown)
      element.removeEventListener('pointermove', onPointerMove)
      element.removeEventListener('pointerup', onPointerEnd)
      element.removeEventListener('pointercancel', onPointerEnd)
    },
  }
}
