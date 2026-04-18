import { findPath } from './findPath.js'
import { isTraversableWorldTile } from './isTraversableTile.js'

function getCastleSiegeCandidates(castle) {
  const footprint = castle.footprint ?? { w: 1, h: 1 }
  const centerY = castle.gridPos.y + Math.floor(footprint.h / 2)

  return [
    {
      x: castle.gridPos.x - 1,
      y: centerY,
      side: 'left',
    },
    {
      x: castle.gridPos.x + footprint.w,
      y: centerY,
      side: 'right',
    },
  ]
}

function getEntityTile(entity) {
  if (entity?.gridPos) {
    return entity.gridPos
  }

  if (Number.isFinite(entity?.x) && Number.isFinite(entity?.y)) {
    return {
      x: Math.round(entity.x),
      y: Math.round(entity.y),
    }
  }

  return null
}

function getDistanceScore(entity, tile) {
  const entityTile = getEntityTile(entity)

  if (!entityTile) {
    return 0
  }

  return Math.abs(entityTile.x - tile.x) + Math.abs(entityTile.y - tile.y)
}

export function findCastleSiegeTile(castle, worldStore, entity = null) {
  if (!castle?.gridPos) {
    return null
  }

  const width = worldStore.world?.width ?? 0
  const height = worldStore.world?.height ?? 0
  const currentTile = getEntityTile(entity)

  const candidates = getCastleSiegeCandidates(castle)
    .filter((candidate) => {
      return (
        candidate.x >= 0 &&
        candidate.y >= 0 &&
        candidate.x < width &&
        candidate.y < height &&
        isTraversableWorldTile(worldStore, candidate)
      )
    })
    .map((candidate) => {
      const pathLength =
        currentTile && currentTile.x >= 0 && currentTile.y >= 0 && currentTile.x < width && currentTile.y < height
          ? findPath(worldStore, currentTile, candidate).length
          : Number.POSITIVE_INFINITY

      return {
        ...candidate,
        pathLength,
        score: getDistanceScore(entity, candidate),
      }
    })

  if (candidates.length === 0) {
    return null
  }

  candidates.sort((a, b) => {
    if (a.pathLength !== b.pathLength) {
      return a.pathLength - b.pathLength
    }

    if (a.score !== b.score) {
      return a.score - b.score
    }

    if (a.side === b.side) {
      return 0
    }

    return a.side === 'left' ? -1 : 1
  })

  return {
    x: candidates[0].x,
    y: candidates[0].y,
  }
}
