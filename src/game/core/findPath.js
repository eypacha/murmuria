import { getOccupiedTiles } from './getOccupiedTiles.js'
import { isTraversableWorldTile } from './isTraversableTile.js'

function tileKey(tile) {
  return `${tile.x}:${tile.y}`
}

function isInsideWorld(worldStore, tile) {
  const width = worldStore.world?.width ?? 0
  const height = worldStore.world?.height ?? 0

  return tile.x >= 0 && tile.y >= 0 && tile.x < width && tile.y < height
}

function buildOccupiedTileSet(worldStore) {
  const occupiedTiles = new Set()
  const entities = [
    ...(worldStore.buildings ?? []),
    ...(worldStore.resources ?? []),
  ]

  for (const entity of entities) {
    if (!entity?.gridPos) {
      continue
    }

    for (const occupiedTile of getOccupiedTiles(entity)) {
      occupiedTiles.add(tileKey(occupiedTile))
    }
  }

  return occupiedTiles
}

function isOccupied(occupiedTiles, tile, startKey, goalKey) {
  const key = tileKey(tile)

  if (key === startKey || key === goalKey) {
    return false
  }

  return occupiedTiles.has(key)
}

function getNeighbors(tile) {
  return [
    { x: tile.x + 1, y: tile.y },
    { x: tile.x - 1, y: tile.y },
    { x: tile.x, y: tile.y + 1 },
    { x: tile.x, y: tile.y - 1 },
  ]
}

export function findPath(worldStore, startTile, goalTile) {
  if (!startTile || !goalTile) {
    return []
  }

  const startKey = tileKey(startTile)
  const goalKey = tileKey(goalTile)
  const occupiedTiles = buildOccupiedTileSet(worldStore)

  if (startKey === goalKey) {
    return []
  }

  const queue = [startTile]
  const visited = new Set([startKey])
  const cameFrom = new Map()

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]
    const currentKey = tileKey(current)

    if (currentKey === goalKey) {
      break
    }

    for (const neighbor of getNeighbors(current)) {
      const neighborKey = tileKey(neighbor)

      if (visited.has(neighborKey)) {
        continue
      }

      if (!isInsideWorld(worldStore, neighbor)) {
        continue
      }

      if (!isTraversableWorldTile(worldStore, neighbor)) {
        continue
      }

      if (isOccupied(occupiedTiles, neighbor, startKey, goalKey)) {
        continue
      }

      visited.add(neighborKey)
      cameFrom.set(neighborKey, currentKey)
      queue.push(neighbor)
    }
  }

  if (!visited.has(goalKey)) {
    return []
  }

  const path = []
  let cursor = goalKey

  while (cursor !== startKey) {
    const [x, y] = cursor.split(':').map(Number)
    path.push({ x, y })
    cursor = cameFrom.get(cursor)

    if (!cursor) {
      return []
    }
  }

  path.reverse()
  return path
}
