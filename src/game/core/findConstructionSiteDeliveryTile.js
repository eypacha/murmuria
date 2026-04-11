import { findPath } from './findPath.js'
import { getPerimeterCandidates, hasClearPerimeter } from './getPerimeterTiles.js'
import { isTraversableWorldTile } from './isTraversableTile.js'
import { getOccupiedTiles } from './getOccupiedTiles.js'

function tileKey(tile) {
  return `${tile.x}:${tile.y}`
}

function buildOccupiedTileSet(worldStore, ignoredIds = new Set()) {
  const occupiedTiles = new Set()
  const entities = [
    ...(worldStore.buildings ?? []),
    ...(worldStore.constructionSites ?? []),
    ...(worldStore.houses ?? []),
    ...(worldStore.resources ?? []),
    ...(worldStore.units ?? []),
  ]

  for (const entity of entities) {
    if (!entity?.gridPos || ignoredIds.has(entity.id)) {
      continue
    }

    for (const occupiedTile of getOccupiedTiles(entity)) {
      occupiedTiles.add(tileKey(occupiedTile))
    }
  }

  return occupiedTiles
}

function isInsideWorld(worldStore, tile) {
  const width = worldStore.world?.width ?? 0
  const height = worldStore.world?.height ?? 0

  return tile.x >= 0 && tile.y >= 0 && tile.x < width && tile.y < height
}

export function findConstructionSiteDeliveryTile(site, worldStore, unit, claimedTileKeys = new Set()) {
  if (!site?.gridPos || !unit?.gridPos) {
    return null
  }

  if (!hasClearPerimeter(site, worldStore, new Set([unit.id]))) {
    return null
  }

  const occupiedTiles = buildOccupiedTileSet(worldStore, new Set([unit.id]))
  let bestTile = null
  let bestPathLength = Number.POSITIVE_INFINITY

  for (const candidate of getPerimeterCandidates(site)) {
    const candidateKey = tileKey(candidate)

    if (claimedTileKeys.has(candidateKey)) {
      continue
    }

    if (occupiedTiles.has(candidateKey)) {
      continue
    }

    if (!isInsideWorld(worldStore, candidate)) {
      continue
    }

    if (!isTraversableWorldTile(worldStore, candidate)) {
      continue
    }

    const path = findPath(worldStore, unit.gridPos, candidate)
    const pathLength = candidate.x === unit.gridPos.x && candidate.y === unit.gridPos.y ? 0 : path.length

    if (pathLength === 0 && (candidate.x !== unit.gridPos.x || candidate.y !== unit.gridPos.y)) {
      continue
    }

    if (pathLength < bestPathLength) {
      bestPathLength = pathLength
      bestTile = candidate
    }
  }

  return bestTile
}
