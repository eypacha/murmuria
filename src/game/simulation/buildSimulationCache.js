import { getBlockingEntities } from '../core/getBlockingEntities.js'
import { getOccupiedTiles } from '../core/getOccupiedTiles.js'
import { TILE_SIZE } from '../config/constants.js'

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

function getUnitGridPosition(unit) {
  if (unit?.gridPos && Number.isFinite(unit.gridPos.x) && Number.isFinite(unit.gridPos.y)) {
    return unit.gridPos
  }

  if (unit?.pos && Number.isFinite(unit.pos.x) && Number.isFinite(unit.pos.y)) {
    return {
      x: Math.floor(unit.pos.x / TILE_SIZE),
      y: Math.floor(unit.pos.y / TILE_SIZE),
    }
  }

  return null
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
  const unitsByTile = new Map()

  for (const unit of worldStore?.units ?? []) {
    if (unit?.kind !== 'unit') {
      continue
    }

    const tile = getUnitGridPosition(unit)

    if (!tile) {
      continue
    }

    const key = `${tile.x}:${tile.y}`
    const units = unitsByTile.get(key) ?? []
    units.push(unit)
    unitsByTile.set(key, units)
  }

  return {
    tick: worldStore?.tick ?? 0,
    occupiedTiles: buildTileSnapshot(occupiedTilesCache),
    staticOccupiedTiles: buildTileSnapshot(staticOccupiedTilesCache),
    unitsByTile,
  }
}
