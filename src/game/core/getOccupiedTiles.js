import { TILE_SIZE } from '../config/constants.js'

function getTilePosition(entity) {
  if (
    entity?.type === 'sheep' &&
    entity.pos &&
    Number.isFinite(entity.pos.x) &&
    Number.isFinite(entity.pos.y)
  ) {
    return {
      x: Math.round((entity.pos.x - TILE_SIZE / 2) / TILE_SIZE),
      y: Math.round((entity.pos.y - TILE_SIZE / 2) / TILE_SIZE),
    }
  }

  return entity.gridPos
}

export function getOccupiedTiles(entity) {
  const tilePosition = getTilePosition(entity)

  if (!tilePosition) {
    return []
  }

  const { x, y } = tilePosition
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
