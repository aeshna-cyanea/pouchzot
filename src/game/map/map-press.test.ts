// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { bindMapPress } from './map-press'

function pointer(
  el: HTMLElement,
  type: string,
  init: Partial<PointerEvent> & { timeStamp?: number } = {},
): Event {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(e, {
    button: { value: init.button ?? 0 },
    isPrimary: { value: init.isPrimary ?? true },
    pointerId: { value: init.pointerId ?? 1 },
    pointerType: { value: init.pointerType ?? 'touch' },
    clientX: { value: init.clientX ?? 20 },
    clientY: { value: init.clientY ?? 30 },
    timeStamp: { value: init.timeStamp ?? 100 },
  })
  el.dispatchEvent(e)
  return e
}

function setup() {
  const host = document.createElement('div')
  const map = document.createElement('div')
  map.id = 'map-grid'
  host.appendChild(map)
  document.body.appendChild(host)
  const onTap = vi.fn()
  const onLongPress = vi.fn()
  const binding = bindMapPress(host, {
    enabled: () => true,
    acceptsTarget: target => target instanceof Element && !!target.closest('#map-grid'),
    resolvePoint: (clientX, clientY) => ({ x: clientX, y: clientY }),
    onTap,
    onLongPress,
  })
  return { host, map, onTap, onLongPress, binding }
}

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('map press gesture', () => {
  it('delays a touch tap through the double-tap window', () => {
    vi.useFakeTimers()
    const h = setup()
    pointer(h.map, 'pointerdown', { clientX: 12, clientY: 34, timeStamp: 100 })
    pointer(h.map, 'pointerup', { clientX: 12, clientY: 34, timeStamp: 120 })
    vi.advanceTimersByTime(279)
    expect(h.onTap).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(h.onTap).toHaveBeenCalledWith({ x: 12, y: 34 })
    expect(h.onLongPress).not.toHaveBeenCalled()
  })

  it('turns a held touch into one right click without a later tap', () => {
    vi.useFakeTimers()
    const h = setup()
    pointer(h.map, 'pointerdown', { clientX: 12, clientY: 34 })
    vi.advanceTimersByTime(500)
    expect(h.onLongPress).toHaveBeenCalledWith({ x: 12, y: 34 })
    pointer(h.map, 'pointerup', { clientX: 12, clientY: 34 })
    vi.runAllTimers()
    expect(h.onTap).not.toHaveBeenCalled()
    expect(h.onLongPress).toHaveBeenCalledOnce()
  })

  it('cancels a press that moves beyond finger jitter', () => {
    vi.useFakeTimers()
    const h = setup()
    pointer(h.map, 'pointerdown')
    pointer(h.map, 'pointermove', { clientX: 31, clientY: 30 })
    pointer(h.map, 'pointerup', { clientX: 31, clientY: 30 })
    vi.runAllTimers()
    expect(h.onTap).not.toHaveBeenCalled()
    expect(h.onLongPress).not.toHaveBeenCalled()
  })

  it('cancels a pending tap when another recognizer claims the sequence', () => {
    vi.useFakeTimers()
    const h = setup()
    pointer(h.map, 'pointerdown')
    pointer(h.map, 'pointerup')
    h.binding.cancel()
    vi.runAllTimers()
    expect(h.onTap).not.toHaveBeenCalled()
  })

  it('sends mouse clicks immediately and maps native right clicks', () => {
    const h = setup()
    pointer(h.map, 'pointerdown', { pointerType: 'mouse', clientX: 9, clientY: 8 })
    pointer(h.map, 'pointerup', { pointerType: 'mouse', clientX: 9, clientY: 8 })
    expect(h.onTap).toHaveBeenCalledWith({ x: 9, y: 8 })

    const context = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 7,
      clientY: 6,
    })
    h.map.dispatchEvent(context)
    expect(context.defaultPrevented).toBe(true)
    expect(h.onLongPress).toHaveBeenCalledWith({ x: 7, y: 6 })
  })
})
