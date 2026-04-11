import { isTraversableWorldTile } from './isTraversableTile.js'

function getCastleDropCandidates(castle) {
  const footprint = castle.footprint ?? { w: 1, h: 1 }
  const centerX = castle.gridPos.x + Math.floor(footprint.w / 2)

  return [
    {
      x: centerX,
      y: castle.gridPos.y - 1,
      side: 'top',
    },
    {
      x: centerX,
      y: castle.gridPos.y + footprint.h,
      side: 'bottom',
    },
  ]
}

function getDistanceScore(unit, tile) {
  const unitPos = unit?.gridPos ?? unit?.pos ?? null

  if (!unitPos) {
    return 0
  }

  const unitX = Number.isFinite(unitPos.x) ? unitPos.x : 0
  const unitY = Number.isFinite(unitPos.y) ? unitPos.y : 0

  return Math.abs(unitX - tile.x) + Math.abs(unitY - tile.y)
}

export function findCastleDropTile(castle, worldStore, unit = null) {
  if (!castle?.gridPos) {
    return null
  }

  const width = worldStore.world?.width ?? 0
  const height = worldStore.world?.height ?? 0
  const candidates = getCastleDropCandidates(castle)
    .filter((candidate) => {
      return (
        candidate.x >= 0 &&
        candidate.y >= 0 &&
        candidate.x < width &&
        candidate.y < height &&
        isTraversableWorldTile(worldStore, candidate)
      )
    })
    .map((candidate) => ({
      ...candidate,
      score: getDistanceScore(unit, candidate),
    }))

  if (candidates.length === 0) {
    return null
  }

  candidates.sort((a, b) => {
    if (a.score !== b.score) {
      return a.score - b.score
    }

    if (a.side === b.side) {
      return 0
    }

    return a.side === 'top' ? -1 : 1
  })

  return {
    x: candidates[0].x,
    y: candidates[0].y,
  }
}
