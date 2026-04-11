import { getBlockingEntities } from './getBlockingEntities.js'
import { getOccupiedTiles } from './getOccupiedTiles.js'
import { isTraversableWorldTile } from './isTraversableTile.js'

function tileKey(tile) {
  return `${tile.x}:${tile.y}`
}

export function getPerimeterCandidates(entity) {
  const position = entity?.gridPos ?? { x: entity?.x ?? 0, y: entity?.y ?? 0 }
  const footprint = entity?.footprint ?? { w: 1, h: 1 }
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

export function hasClearPerimeter(entity, worldStore, ignoredIds = new Set()) {
  if (!entity?.gridPos) {
    return false
  }

  const occupiedTiles = new Set()
  const entities = getBlockingEntities(worldStore)

  for (const blockingEntity of entities) {
    if (!blockingEntity?.gridPos || ignoredIds.has(blockingEntity.id)) {
      continue
    }

    for (const occupiedTile of getOccupiedTiles(blockingEntity)) {
      const key = tileKey(occupiedTile)
      occupiedTiles.add(key)
    }
  }

  for (const candidate of getPerimeterCandidates(entity)) {
    const candidateKey = tileKey(candidate)

    if (occupiedTiles.has(candidateKey)) {
      return false
    }

    if (!isTraversableWorldTile(worldStore, candidate)) {
      return false
    }
  }

  return true
}
