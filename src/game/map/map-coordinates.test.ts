import { describe, expect, it } from 'vitest'
import {
  mapCellAtClientPoint, mapDeltaFromClientDelta, mapPointAtClientPoint,
} from './map-coordinates'

describe('mapCellAtClientPoint', () => {
  const rendered = { left: -5, top: 10, width: 210, height: 210 }
  const map = { x: 40, y: 70, w: 21, h: 21 }

  it('maps rendered cell centers to absolute dungeon coordinates', () => {
    expect(mapCellAtClientPoint(0, 15, rendered, map)).toEqual({ x: 40, y: 70 })
    expect(mapCellAtClientPoint(100, 115, rendered, map)).toEqual({ x: 50, y: 80 })
    expect(mapCellAtClientPoint(204.9, 219.9, rendered, map)).toEqual({ x: 60, y: 90 })
  })

  it('rejects points outside the rendered cells and empty rectangles', () => {
    expect(mapCellAtClientPoint(-5.1, 20, rendered, map)).toBeNull()
    expect(mapCellAtClientPoint(205, 20, rendered, map)).toBeNull()
    expect(mapCellAtClientPoint(0, 220, rendered, map)).toBeNull()
    expect(mapCellAtClientPoint(0, 20, { ...rendered, width: 0 }, map)).toBeNull()
  })

  it('maps continuous points and extrapolates for a captured gesture', () => {
    expect(mapPointAtClientPoint(100, 115, rendered, map)).toEqual({ x: 50.5, y: 80.5 })
    expect(mapPointAtClientPoint(-15, 0, rendered, map)).toEqual({ x: 39, y: 69 })
    expect(mapPointAtClientPoint(0, 0, { ...rendered, height: 0 }, map)).toBeNull()
  })

  it('converts client drag distance into continuous map-cell deltas', () => {
    expect(mapDeltaFromClientDelta(14, -15, rendered, map)).toEqual({ x: 1.4, y: -1.5 })
    const small = mapDeltaFromClientDelta(4.9, -4.9, { width: 210, height: 210 }, map)!
    expect(small.x).toBeCloseTo(0.49)
    expect(small.y).toBeCloseTo(-0.49)
    expect(mapDeltaFromClientDelta(10, 10, { width: 0, height: 10 }, map)).toBeNull()
  })
})
