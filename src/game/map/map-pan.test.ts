// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { bindMapPan } from './map-pan'

function pointer(
  el: HTMLElement,
  type: string,
  init: Partial<PointerEvent> = {},
): Event {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(e, {
    button: { value: init.button ?? 0 },
    isPrimary: { value: init.isPrimary ?? true },
    pointerId: { value: init.pointerId ?? 1 },
    clientX: { value: init.clientX ?? 20 },
    clientY: { value: init.clientY ?? 30 },
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
  const onStart = vi.fn()
  const onPan = vi.fn()
  let enabled = true
  const binding = bindMapPan(host, {
    enabled: () => enabled,
    acceptsTarget: target => target instanceof Element && !!target.closest('#map-grid'),
    onStart,
    onPan,
  })
  return { host, map, onStart, onPan, binding, disable: () => { enabled = false } }
}

afterEach(() => { document.body.innerHTML = '' })

describe('map pan gesture', () => {
  it('claims movement outside tap slop and reports displacement from pointerdown', () => {
    const h = setup()
    pointer(h.map, 'pointerdown', { clientX: 20, clientY: 30 })
    pointer(h.map, 'pointermove', { clientX: 26, clientY: 36 })
    expect(h.onStart).not.toHaveBeenCalled()
    pointer(h.map, 'pointermove', { clientX: 32, clientY: 35 })
    expect(h.onStart).toHaveBeenCalledOnce()
    expect(h.onPan).toHaveBeenLastCalledWith(12, 5)
    pointer(h.map, 'pointermove', { clientX: 40, clientY: 20 })
    expect(h.onPan).toHaveBeenLastCalledWith(20, -10)
  })

  it('does not claim a tap, secondary contact, or off-map drag', () => {
    const h = setup()
    pointer(h.map, 'pointerdown')
    pointer(h.map, 'pointerup')
    pointer(h.map, 'pointerdown', { isPrimary: false })
    pointer(h.map, 'pointermove', { isPrimary: false, clientX: 60 })
    pointer(h.host, 'pointerdown')
    pointer(h.host, 'pointermove', { clientX: 60 })
    expect(h.onStart).not.toHaveBeenCalled()
    expect(h.onPan).not.toHaveBeenCalled()
  })

  it('stops when disabled or explicitly cancelled', () => {
    const h = setup()
    pointer(h.map, 'pointerdown')
    h.disable()
    pointer(h.map, 'pointermove', { clientX: 60 })
    expect(h.onPan).not.toHaveBeenCalled()

    const next = setup()
    pointer(next.map, 'pointerdown')
    next.binding.cancel()
    pointer(next.map, 'pointermove', { clientX: 60 })
    expect(next.onPan).not.toHaveBeenCalled()
  })
})
