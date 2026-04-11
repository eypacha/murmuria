import { getBlockingEntities } from '../core/getBlockingEntities.js'
import { getOccupiedTiles } from '../core/getOccupiedTiles.js'

function tileKey(tile) {
  return `${tile.x}:${tile.y}`
}

function ensureTileCount(cache, key) {
  const currentCount = cache.tileCounts.get(key) ?? 0
  const nextCount = currentCount + 1

  cache.tileCounts.set(key, nextCount)
  cache.occupiedTiles.add(key)
}

function buildOccupiedTileSet(worldStore, includeUnits = true) {
  const cache = {
    occupiedTiles: new Set(),
    tileCounts: new Map(),
  }
  const entities = getBlockingEntities(worldStore, { includeUnits })

  for (const entity of entities) {
    if (!entity?.gridPos) {
      continue
    }

    for (const occupiedTile of getOccupiedTiles(entity)) {
      ensureTileCount(cache, tileKey(occupiedTile))
    }
  }

  return cache
}

function buildTileSnapshot(cache) {
  return {
    occupiedTiles: cache.occupiedTiles,
    tileCounts: cache.tileCounts,
  }
}

export function buildSimulationCache(worldStore) {
  const occupiedTilesCache = buildOccupiedTileSet(worldStore, true)
  const staticOccupiedTilesCache = buildOccupiedTileSet(worldStore, false)

  return {
    tick: worldStore?.tick ?? 0,
    occupiedTiles: buildTileSnapshot(occupiedTilesCache),
    staticOccupiedTiles: buildTileSnapshot(staticOccupiedTilesCache),
  }
}
