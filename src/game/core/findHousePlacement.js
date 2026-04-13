import { CASTLE_FOOTPRINT } from '../domain/factories/createCastle.js'
import { HOUSE_FOOTPRINT } from '../domain/factories/createHouse.js'
import { buildNoBuildZoneTileSet } from './getNoBuildZoneTiles.js'
import { getOccupiedTiles } from './getOccupiedTiles.js'
import { hasClearPerimeter } from './getPerimeterTiles.js'
import { isTraversableTile } from './isTraversableTile.js'

function getTile(tiles, x, y) {
  return tiles?.[y]?.[x] ?? null
}

function tileKey(tile) {
  return `${tile.x}:${tile.y}`
}

function buildBlockedTileSet(blockedEntities = [], reservedKeys = new Set()) {
  const blockedKeys = new Set(reservedKeys)

  for (const entity of blockedEntities) {
    for (const tile of getOccupiedTiles(entity)) {
      blockedKeys.add(tileKey(tile))
    }
  }

  return blockedKeys
}

function isValidHouseFootprint(tiles, x, y, width, height, blockedKeys, noBuildZoneKeys) {
  if (x < 0 || y < 0) {
    return false
  }

  if (x + HOUSE_FOOTPRINT.w > width || y + HOUSE_FOOTPRINT.h > height) {
    return false
  }

  for (let dy = 0; dy < HOUSE_FOOTPRINT.h; dy += 1) {
    for (let dx = 0; dx < HOUSE_FOOTPRINT.w; dx += 1) {
      const tile = getTile(tiles, x + dx, y + dy)

      if (!isTraversableTile(tile)) {
        return false
      }

      if (blockedKeys.has(`${x + dx}:${y + dy}`)) {
        return false
      }

      if (noBuildZoneKeys.has(`${x + dx}:${y + dy}`)) {
        return false
      }
    }
  }

  return true
}

function isValidHousePlacement(worldStore, tiles, x, y, width, height, blockedKeys, noBuildZoneKeys) {
  if (!worldStore?.world) {
    return false
  }

  if (
    !isValidHouseFootprint(
      tiles,
      x,
      y,
      width,
      height,
      blockedKeys,
      noBuildZoneKeys,
    )
  ) {
    return false
  }

  return hasClearPerimeter(
    {
      gridPos: { x, y },
      footprint: { ...HOUSE_FOOTPRINT },
    },
    worldStore,
  )
}

export function findHousePlacement({
  worldStore = null,
  tiles,
  castle,
  width,
  height,
  blockedEntities = [],
  reservedKeys = new Set(),
  allowFallback = true,
  searchRadius = 8,
} = {}) {
  if (!Array.isArray(tiles) || !castle || !Number.isFinite(width) || !Number.isFinite(height)) {
    return null
  }

  const castleFootprint = castle.footprint ?? CASTLE_FOOTPRINT
  const castleCenterX = castle.gridPos.x + Math.floor(castleFootprint.w / 2)
  const castleCenterY = castle.gridPos.y + Math.floor(castleFootprint.h / 2)
  const blockedKeys = buildBlockedTileSet([castle, ...blockedEntities], reservedKeys)
  const noBuildZoneKeys = buildNoBuildZoneTileSet([castle, ...blockedEntities], reservedKeys)
  const preferredPositions = [
    { x: castle.gridPos.x + castleFootprint.w + 1, y: castle.gridPos.y },
    { x: castle.gridPos.x - HOUSE_FOOTPRINT.w - 1, y: castle.gridPos.y },
    { x: castle.gridPos.x, y: castle.gridPos.y + castleFootprint.h + 1 },
    { x: castle.gridPos.x, y: castle.gridPos.y - HOUSE_FOOTPRINT.h - 1 },
  ]

  for (const position of preferredPositions) {
    if (
      isValidHousePlacement(
        worldStore,
        tiles,
        position.x,
        position.y,
        width,
        height,
        blockedKeys,
        noBuildZoneKeys,
      )
    ) {
      return position
    }
  }

  const fallbackPositions = []

  for (
    let y = Math.max(0, castleCenterY - searchRadius);
    y <= Math.min(height - HOUSE_FOOTPRINT.h, castleCenterY + searchRadius);
    y += 1
  ) {
    for (
      let x = Math.max(0, castleCenterX - searchRadius);
      x <= Math.min(width - HOUSE_FOOTPRINT.w, castleCenterX + searchRadius);
      x += 1
    ) {
      fallbackPositions.push({
        x,
        y,
        distance: Math.abs(x - castleCenterX) + Math.abs(y - castleCenterY),
      })
    }
  }

  fallbackPositions.sort((a, b) => a.distance - b.distance)

  for (const position of fallbackPositions) {
    if (
      isValidHousePlacement(
        worldStore,
        tiles,
        position.x,
        position.y,
        width,
        height,
        blockedKeys,
        noBuildZoneKeys,
      )
    ) {
      return position
    }
  }

  if (!allowFallback) {
    return null
  }

  return {
    x: Math.max(0, Math.min(width - HOUSE_FOOTPRINT.w, castle.gridPos.x + castleFootprint.w + 1)),
    y: Math.max(0, Math.min(height - HOUSE_FOOTPRINT.h, castle.gridPos.y)),
  }
}
