export interface MapRect {
  x: number
  y: number
  w: number
  h: number
}

interface ClientRect {
  left: number
  top: number
  width: number
  height: number
}

// Continuous screen→dungeon transform. Unlike cell picking this intentionally
// extrapolates beyond the rendered rectangle: a captured two-finger gesture
// may carry its midpoint just outside the element while still owning it.
export function mapPointAtClientPoint(
  clientX: number,
  clientY: number,
  rendered: ClientRect,
  map: MapRect,
): { x: number; y: number } | null {
  if (rendered.width <= 0 || rendered.height <= 0 || map.w <= 0 || map.h <= 0) return null
  return {
    x: map.x + (clientX - rendered.left) / rendered.width * map.w,
    y: map.y + (clientY - rendered.top) / rendered.height * map.h,
  }
}

// Convert a client-space point inside the rendered cell rectangle to the
// matching absolute dungeon coordinate. The rendered rectangle may extend
// beyond its clipped container (tile mode's partial edge cells).
export function mapCellAtClientPoint(
  clientX: number,
  clientY: number,
  rendered: ClientRect,
  map: MapRect,
): { x: number; y: number } | null {
  if (rendered.width <= 0 || rendered.height <= 0 || map.w <= 0 || map.h <= 0) return null

  const relX = clientX - rendered.left
  const relY = clientY - rendered.top
  if (relX < 0 || relY < 0 || relX >= rendered.width || relY >= rendered.height) return null

  const point = mapPointAtClientPoint(clientX, clientY, rendered, map)
  if (!point) return null
  const col = Math.floor(point.x - map.x)
  const row = Math.floor(point.y - map.y)
  if (col < 0 || col >= map.w || row < 0 || row >= map.h) return null
  return { x: map.x + col, y: map.y + row }
}

// Convert a client-space drag into a continuous map-cell displacement. The
// renderer uses its integer part for backing cells and its fractional part
// for visual translation.
export function mapDeltaFromClientDelta(
  clientDX: number,
  clientDY: number,
  rendered: Pick<ClientRect, 'width' | 'height'>,
  map: Pick<MapRect, 'w' | 'h'>,
): { x: number; y: number } | null {
  if (rendered.width <= 0 || rendered.height <= 0 || map.w <= 0 || map.h <= 0) return null
  return {
    x: clientDX / rendered.width * map.w,
    y: clientDY / rendered.height * map.h,
  }
}
