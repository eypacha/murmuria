import { findPath } from './findPath.js'
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

function getPerimeterCandidates(site) {
  const position = site.gridPos ?? { x: site.x ?? 0, y: site.y ?? 0 }
  const footprint = site.footprint ?? { w: 1, h: 1 }
  const candidates = []
  const seen = new Set()

  const pushCandidate = (x, y) => {
    const key = `${x}:${y}`

    if (seen.has(key)) {
      return
    }

    seen.add(key)
    candidates.push({ x, y })
  }

  for (let dx = 0; dx < footprint.w; dx += 1) {
    pushCandidate(position.x + dx, position.y - 1)
    pushCandidate(position.x + dx, position.y + footprint.h)
  }

  for (let dy = 0; dy < footprint.h; dy += 1) {
    pushCandidate(position.x - 1, position.y + dy)
    pushCandidate(position.x + footprint.w, position.y + dy)
  }

  return candidates
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
