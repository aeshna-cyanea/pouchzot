const TAP_DELAY_MS = 300
const LONG_PRESS_MS = 500
const MOVE_SLOP = 10
const CONTEXT_MENU_SUPPRESS_MS = 1000

export interface MapPressOptions<T> {
  enabled: () => boolean
  acceptsTarget: (target: EventTarget | null) => boolean
  resolvePoint: (clientX: number, clientY: number) => T | null
  onTap: (point: T) => void
  onLongPress: (point: T) => void
}

export interface MapPressBinding {
  cancel: () => void
  destroy: () => void
}

// A primary touch/pen contact becomes a delayed tap or a long press. Delaying
// taps by the double-tap window lets the zoom recognizer claim the second tap
// without first sending a movement command. Mouse clicks remain immediate.
export function bindMapPress<T>(element: HTMLElement, opts: MapPressOptions<T>): MapPressBinding {
  let contact: {
    pointerId: number
    pointerType: string
    startX: number
    startY: number
    startTime: number
    point: T
    longPressed: boolean
  } | null = null
  let longPressTimer: ReturnType<typeof setTimeout> | undefined
  let tapTimer: ReturnType<typeof setTimeout> | undefined
  let suppressContextMenuUntil = 0

  const clearLongPress = (): void => {
    if (longPressTimer !== undefined) clearTimeout(longPressTimer)
    longPressTimer = undefined
  }

  const clearTap = (): void => {
    if (tapTimer !== undefined) clearTimeout(tapTimer)
    tapTimer = undefined
  }

  const releaseCapture = (): void => {
    if (contact && element.hasPointerCapture?.(contact.pointerId)) {
      element.releasePointerCapture(contact.pointerId)
    }
  }

  const clearContact = (): void => {
    clearLongPress()
    releaseCapture()
    contact = null
  }

  const cancel = (): void => {
    clearTap()
    clearContact()
  }

  const onPointerDown = (e: PointerEvent): void => {
    if (!opts.enabled() || e.button !== 0 || !e.isPrimary || !opts.acceptsTarget(e.target)) return
    const point = opts.resolvePoint(e.clientX, e.clientY)
    if (point === null) return

    clearTap()
    clearContact()
    contact = {
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      startX: e.clientX,
      startY: e.clientY,
      startTime: e.timeStamp,
      point,
      longPressed: false,
    }
    element.setPointerCapture?.(e.pointerId)

    if (e.pointerType !== 'mouse') {
      longPressTimer = setTimeout(() => {
        longPressTimer = undefined
        if (!contact || contact.pointerId !== e.pointerId) return
        contact.longPressed = true
        suppressContextMenuUntil = Date.now() + CONTEXT_MENU_SUPPRESS_MS
        opts.onLongPress(contact.point)
      }, LONG_PRESS_MS)
      // Suppress the compatibility click/context-menu generated after a touch.
      e.preventDefault()
    }
  }

  const onPointerMove = (e: PointerEvent): void => {
    if (!contact || e.pointerId !== contact.pointerId) return
    const dx = e.clientX - contact.startX
    const dy = e.clientY - contact.startY
    if (dx * dx + dy * dy <= MOVE_SLOP ** 2) return
    clearContact()
  }

  const onPointerUp = (e: PointerEvent): void => {
    if (!contact || e.pointerId !== contact.pointerId) return
    const { point, pointerType, startTime, longPressed } = contact
    clearContact()
    if (longPressed) return

    if (pointerType === 'mouse') {
      opts.onTap(point)
      return
    }
    const elapsed = Math.max(0, e.timeStamp - startTime)
    tapTimer = setTimeout(() => {
      tapTimer = undefined
      opts.onTap(point)
    }, Math.max(0, TAP_DELAY_MS - elapsed))
    e.preventDefault()
  }

  const onPointerCancel = (e: PointerEvent): void => {
    if (contact?.pointerId === e.pointerId) clearContact()
  }

  const onContextMenu = (e: MouseEvent): void => {
    if (!opts.enabled() || !opts.acceptsTarget(e.target)) return
    e.preventDefault()
    cancel()
    if (Date.now() < suppressContextMenuUntil) return
    const point = opts.resolvePoint(e.clientX, e.clientY)
    if (point !== null) opts.onLongPress(point)
  }

  element.addEventListener('pointerdown', onPointerDown)
  element.addEventListener('pointermove', onPointerMove)
  element.addEventListener('pointerup', onPointerUp)
  element.addEventListener('pointercancel', onPointerCancel)
  element.addEventListener('contextmenu', onContextMenu)

  return {
    cancel,
    destroy: () => {
      cancel()
      element.removeEventListener('pointerdown', onPointerDown)
      element.removeEventListener('pointermove', onPointerMove)
      element.removeEventListener('pointerup', onPointerUp)
      element.removeEventListener('pointercancel', onPointerCancel)
      element.removeEventListener('contextmenu', onContextMenu)
    },
  }
}
