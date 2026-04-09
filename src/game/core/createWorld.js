import {
  GRID_HEIGHT,
  GRID_WIDTH,
} from '../config/constants.js'
import { seededRandom } from './seededRandom.js'

const LAND_RATIO = 0.55
const NEIGHBOR_OFFSETS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: -1 },
  { x: 1, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
]

function isBorderTile(x, y, width, height) {
  return x === 0 || y === 0 || x === width - 1 || y === height - 1
}

function createWaterTile(x, y) {
  return {
    x,
    y,
    terrain: 'water',
    elevation: 0,
    cliff: false,
    ramp: false,
    walkable: false,
    movementCost: 1,
  }
}

function createGrassTile(x, y) {
  return {
    x,
    y,
    terrain: 'grass',
    elevation: 1,
    cliff: false,
    ramp: false,
    walkable: true,
    movementCost: 1,
  }
}

export function generateIslandMask(width, height, rng) {
  const mask = Array.from({ length: height }, () => Array.from({ length: width }, () => false))
  const interiorWidth = Math.max(0, width - 2)
  const interiorHeight = Math.max(0, height - 2)
  const maxLandTiles = interiorWidth * interiorHeight
  const targetLandTiles = Math.min(Math.floor(width * height * LAND_RATIO), maxLandTiles)

  if (targetLandTiles <= 0) {
    return mask
  }

  const centerX = Math.floor(width / 2)
  const centerY = Math.floor(height / 2)

  if (isBorderTile(centerX, centerY, width, height)) {
    return mask
  }

  const landTiles = [{ x: centerX, y: centerY }]
  mask[centerY][centerX] = true

  while (landTiles.length < targetLandTiles) {
    const origin = landTiles[rng.nextInt(landTiles.length)]
    const offset = NEIGHBOR_OFFSETS[rng.nextInt(NEIGHBOR_OFFSETS.length)]
    const x = origin.x + offset.x
    const y = origin.y + offset.y

    if (x < 0 || y < 0 || x >= width || y >= height) {
      continue
    }

    if (isBorderTile(x, y, width, height)) {
      continue
    }

    if (mask[y][x]) {
      continue
    }

    mask[y][x] = true
    landTiles.push({ x, y })
  }

  return mask
}

export function buildTilesFromMask(mask) {
  return mask.map((row, y) => {
    return row.map((isLand, x) => {
      return isLand ? createGrassTile(x, y) : createWaterTile(x, y)
    })
  })
}

export function createWorld(worldStore) {
  const seed = worldStore.seed ?? 1
  const rng = seededRandom(seed)
  const width = GRID_WIDTH
  const height = GRID_HEIGHT

  const mask = generateIslandMask(width, height, rng)
  const tiles = buildTilesFromMask(mask)

  worldStore.tick = 0
  worldStore.seed = seed
  worldStore.kingdom.resources.wood = 0
  worldStore.kingdom.resources.gold = 0
  worldStore.kingdom.desires.gatherWood = 0
  worldStore.kingdom.desires.gatherGold = 0
  Object.assign(worldStore.world, {
    width,
    height,
    tiles,
  })
  worldStore.resources = []
  worldStore.buildings = []
  worldStore.units = []
}
