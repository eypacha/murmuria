import { getOccupiedTiles } from './getOccupiedTiles.js'
import { isTraversableWorldTile } from './isTraversableTile.js'

export function findCastleDropTile(castle, worldStore) {
  if (!castle?.gridPos) {
    return null
  }

  const footprint = castle.footprint ?? { w: 1, h: 1 }
  const centerTile = {
    x: castle.gridPos.x + Math.floor(footprint.w / 2),
    y: castle.gridPos.y + footprint.h,
  }

  const width = worldStore.world?.width ?? 0
  const height = worldStore.world?.height ?? 0

  if (
    centerTile.x < 0 ||
    centerTile.y < 0 ||
    centerTile.x >= width ||
    centerTile.y >= height
  ) {
    return null
  }

  if (!isTraversableWorldTile(worldStore, centerTile)) {
    return null
  }

  const occupiedEntities = [
    ...(worldStore.buildings ?? []),
    ...(worldStore.constructionSites ?? []),
    ...(worldStore.houses ?? []),
    ...(worldStore.resources ?? []),
    ...(worldStore.decorations ?? []),
  ]

  for (const entity of occupiedEntities) {
    if (!entity?.gridPos) {
      continue
    }

    for (const tile of getOccupiedTiles(entity)) {
      if (tile.x === centerTile.x && tile.y === centerTile.y) {
        return null
      }
    }
  }

  return centerTile
}
