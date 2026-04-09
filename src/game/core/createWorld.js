import {
  GRID_HEIGHT,
  GRID_WIDTH,
  INITIAL_GOLD_COUNT,
  INITIAL_TREE_COUNT,
  INITIAL_PAWNS,
} from '../config/constants.js'
import { createCastle } from '../domain/factories/createCastle.js'
import { createGoldStone } from '../domain/factories/createGoldStone.js'
import { createPawn } from '../domain/factories/createPawn.js'
import { createTree } from '../domain/factories/createTree.js'
import { getOccupiedTiles } from './getOccupiedTiles.js'
import { seededRandom } from './seededRandom.js'
import { GOLD_VARIANT_CONFIGS, TREE_VARIANT_KEYS } from '../config/resourceVariants.js'

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

function reserveEntityTiles(entity, occupiedTiles) {
  for (const tile of getOccupiedTiles(entity)) {
    occupiedTiles.add(positionKey(tile.x, tile.y))
  }
}

function createPawnPositions(castle, width, height, occupiedTiles, rng) {
  const footprint = castle.footprint ?? { w: 1, h: 1 }
  const preferredPositions = [
    { x: castle.gridPos.x - 1, y: castle.gridPos.y + 3 },
    { x: castle.gridPos.x + footprint.w, y: castle.gridPos.y + 3 },
  ]

  const validPreferredPositions = preferredPositions.filter((position) => {
    if (position.x < 0 || position.y < 0 || position.x >= width || position.y >= height) {
      return false
    }

    return !occupiedTiles.has(positionKey(position.x, position.y))
  })

  if (validPreferredPositions.length >= INITIAL_PAWNS) {
    return validPreferredPositions.slice(0, INITIAL_PAWNS)
  }

  const fallbackPositions = []

  const minX = Math.max(0, castle.gridPos.x - 3)
  const maxX = Math.min(width - 1, castle.gridPos.x + footprint.w + 2)
  const minY = Math.max(0, castle.gridPos.y + 1)
  const maxY = Math.min(height - 1, castle.gridPos.y + 5)

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (x < 0 || y < 0 || x >= width || y >= height) {
        continue
      }

      if (preferredPositions.some((position) => position.x === x && position.y === y)) {
        continue
      }

      if (occupiedTiles.has(positionKey(x, y))) {
        continue
      }

      fallbackPositions.push({ x, y })
    }
  }

  shuffleInPlace(fallbackPositions, rng)

  return [...validPreferredPositions, ...fallbackPositions].slice(0, INITIAL_PAWNS)
}

export function createWorld(worldStore) {
  const seed = worldStore.seed ?? 1
  const rng = seededRandom(seed)
  const width = GRID_WIDTH
  const height = GRID_HEIGHT

  const tiles = createTileGrid(width, height)
  const castle = createCastle(width, height)
  const buildings = [castle]
  const resources = []
  const units = []
  const occupiedTiles = new Set()

  for (const tile of getOccupiedTiles(castle)) {
    occupiedTiles.add(positionKey(tile.x, tile.y))
  }

  const pawnPositions = createPawnPositions(castle, width, height, occupiedTiles, rng)

  for (const position of pawnPositions) {
    const facing = rng.nextInt(2) === 0 ? 'left' : 'right'

    units.push(createPawn(position.x, position.y, facing))
    occupiedTiles.add(positionKey(position.x, position.y))
  }

  const goldCandidates = []

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const key = positionKey(x, y)

      if (occupiedTiles.has(key)) {
        continue
      }

      goldCandidates.push({ x, y })
    }
  }

  shuffleInPlace(goldCandidates, rng)

  const goldCount = Math.min(INITIAL_GOLD_COUNT, goldCandidates.length)

  for (const position of goldCandidates) {
    if (resources.length >= goldCount) {
      break
    }

    const variantIndex = rng.nextInt(GOLD_VARIANT_CONFIGS.length)
    const gold = createGoldStone(position.x, position.y, variantIndex)

    resources.push(gold)
    reserveEntityTiles(gold, occupiedTiles)
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
    const variant = rng.nextInt(TREE_VARIANT_KEYS.length)
    const tree = createTree(position.x, position.y, variant)

    resources.push(tree)
    occupiedTiles.add(positionKey(position.x, position.y))
  }

  worldStore.tick = 0
  worldStore.seed = seed
  worldStore.kingdom.resources.wood = 0
  worldStore.kingdom.resources.gold = 0
  worldStore.kingdom.policies.woodPriority = 0
  worldStore.kingdom.policies.goldPriority = 0
  Object.assign(worldStore.world, {
    width,
    height,
    tiles,
  })
  worldStore.resources = resources
  worldStore.units = units
  worldStore.buildings = buildings
}
