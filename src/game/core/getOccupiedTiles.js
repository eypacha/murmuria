export function getOccupiedTiles(entity) {
  const { x, y } = entity.gridPos
  const { w, h } = entity.footprint ?? { w: 1, h: 1 }

  const tiles = []

  for (let dy = 0; dy < h; dy += 1) {
    for (let dx = 0; dx < w; dx += 1) {
      tiles.push({
        x: x + dx,
        y: y + dy,
      })
    }
  }

  return tiles
}
