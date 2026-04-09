import {
  GRID_HEIGHT,
  GRID_WIDTH,
  INITIAL_TREE_COUNT,
  INITIAL_VILLAGERS,
} from '../config/constants.js'
import { createCastle } from '../domain/factories/createCastle.js'
import { createTree } from '../domain/factories/createTree.js'
import { createVillager } from '../domain/factories/createVillager.js'
import { seededRandom } from './seededRandom.js'

function createTileGrid(width, height) {
  const tiles = []

  for (let y = 0; y < height; y += 1) {
    const row = []

    for (let x = 0; x < width; x += 1) {
      row.push({
        x,
        y,
        terrain: 'grass',
        elevation: 0,
        walkable: true,
        movementCost: 1,
      })
    }

    tiles.push(row)
  }

  return tiles
}

function positionKey(x, y) {
  return `${x}:${y}`
}

function shuffleInPlace(items, rng) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = rng.nextInt(i + 1)
    const temp = items[i]
    items[i] = items[j]
    items[j] = temp
  }
}

function createVillagerPositions(castle, width, height, rng) {
  const positions = []

  for (let y = castle.gridPos.y - 1; y <= castle.gridPos.y + 1; y += 1) {
    for (let x = castle.gridPos.x - 1; x <= castle.gridPos.x + 1; x += 1) {
      if (x < 0 || y < 0 || x >= width || y >= height) {
        continue
      }

      if (x === castle.gridPos.x && y === castle.gridPos.y) {
        continue
      }

      positions.push({ x, y })
    }
  }

  shuffleInPlace(positions, rng)

  return positions.slice(0, Math.min(INITIAL_VILLAGERS, positions.length))
}

export function createWorld(worldStore) {
  const seed = worldStore.seed ?? 1
  const rng = seededRandom(seed)
  const width = GRID_WIDTH
  const height = GRID_HEIGHT

  const tiles = createTileGrid(width, height)
  const castle = createCastle()
  const buildings = [castle]
  const resources = []
  const units = []
  const occupiedTiles = new Set([positionKey(castle.gridPos.x, castle.gridPos.y)])

  const villagerPositions = createVillagerPositions(castle, width, height, rng)

  for (const position of villagerPositions) {
    units.push(createVillager(position.x, position.y))
    occupiedTiles.add(positionKey(position.x, position.y))
  }

  const treeCandidates = []

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const key = positionKey(x, y)

      if (occupiedTiles.has(key)) {
        continue
      }

      treeCandidates.push({ x, y })
    }
  }

  shuffleInPlace(treeCandidates, rng)

  const treeCount = Math.min(INITIAL_TREE_COUNT, treeCandidates.length)

  for (let i = 0; i < treeCount; i += 1) {
    const position = treeCandidates[i]
    resources.push(createTree(position.x, position.y))
    occupiedTiles.add(positionKey(position.x, position.y))
  }

  worldStore.tick = 0
  worldStore.seed = seed
  worldStore.kingdom.resources.wood = 0
  worldStore.kingdom.policies.woodPriority = 0
  Object.assign(worldStore.world, {
    width,
    height,
    tiles,
  })
  worldStore.resources = resources
  worldStore.units = units
  worldStore.buildings = buildings
}
