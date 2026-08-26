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

  const col = Math.floor(relX / rendered.width * map.w)
  const row = Math.floor(relY / rendered.height * map.h)
  if (col < 0 || col >= map.w || row < 0 || row >= map.h) return null
  return { x: map.x + col, y: map.y + row }
}

// Convert a client-space drag into whole map cells. Rounding symmetrically
// makes a cell snap when the finger crosses its midpoint in either direction.
export function mapCellDeltaFromClientDelta(
  clientDX: number,
  clientDY: number,
  rendered: Pick<ClientRect, 'width' | 'height'>,
  map: Pick<MapRect, 'w' | 'h'>,
): { x: number; y: number } | null {
  if (rendered.width <= 0 || rendered.height <= 0 || map.w <= 0 || map.h <= 0) return null

  const round = (n: number): number => {
    const magnitude = Math.floor(Math.abs(n) + 0.5)
    return magnitude === 0 ? 0 : Math.sign(n) * magnitude
  }
  return {
    x: round(clientDX / rendered.width * map.w),
    y: round(clientDY / rendered.height * map.h),
  }
}
