import { describe, expect, it } from 'vitest'
import { mapCellAtClientPoint } from './map-coordinates'

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
})
