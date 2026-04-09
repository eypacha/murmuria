import {
  GRID_HEIGHT,
  GRID_WIDTH,
} from '../config/constants.js'
import { seededRandom } from './seededRandom.js'

const LAND_RATIO = 0.55
const MAX_ELEVATION_LEVEL = 2
const PLATEAU_COUNT = 3
const PLATEAU_SIZE = 20
const PLATEAU_SMOOTH_PASSES = 2
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

function tileKey(tile) {
  return `${tile.x}:${tile.y}`
}

function getTile(tiles, x, y) {
  return tiles[y]?.[x] ?? null
}

function touchesWater(tile, tiles) {
  for (const offset of NEIGHBOR_OFFSETS) {
    const neighbor = getTile(tiles, tile.x + offset.x, tile.y + offset.y)

    if (neighbor?.terrain === 'water') {
      return true
    }
  }

  return false
}

function getEligibleLandTiles(tiles) {
  const eligibleTiles = []

  for (const row of tiles) {
    if (!Array.isArray(row)) {
      continue
    }

    for (const tile of row) {
      if (tile.terrain === 'grass' && tile.elevation === 1) {
        eligibleTiles.push(tile)
      }
    }
  }

  return eligibleTiles
}

export function generatePlateaus(tiles, rng) {
  if (!Array.isArray(tiles) || tiles.length === 0 || typeof rng?.nextInt !== 'function') {
    return
  }

  for (let plateauIndex = 0; plateauIndex < PLATEAU_COUNT; plateauIndex += 1) {
    const eligibleTiles = getEligibleLandTiles(tiles)
    const seedTiles = eligibleTiles.filter((tile) => {
      if (tile.terrain !== 'grass') {
        return false
      }

      if (tile.elevation !== 1) {
        return false
      }

      return !touchesWater(tile, tiles)
    })

    if (seedTiles.length === 0) {
      break
    }

    const seed = seedTiles[rng.nextInt(seedTiles.length)]

    if (!seed) {
      break
    }

    const plateauSize = Math.max(1, PLATEAU_SIZE + rng.nextInt(10) - 5)
    const frontier = [seed]
    const frontierKeys = new Set([tileKey(seed)])
    let plateauTiles = 0

    while (frontier.length > 0 && plateauTiles < plateauSize) {
      const frontierIndex = rng.nextInt(frontier.length)
      const current = frontier[frontierIndex]

      frontier[frontierIndex] = frontier[frontier.length - 1]
      frontier.pop()
      frontierKeys.delete(tileKey(current))

      const tile = getTile(tiles, current.x, current.y)

      if (!tile || tile.terrain !== 'grass' || tile.elevation !== 1) {
        continue
      }

      tile.elevation = MAX_ELEVATION_LEVEL
      plateauTiles += 1

      for (const offset of NEIGHBOR_OFFSETS) {
        const neighbor = getTile(tiles, current.x + offset.x, current.y + offset.y)

        if (!neighbor || neighbor.terrain !== 'grass' || neighbor.elevation !== 1) {
          continue
        }

        const neighborKey = tileKey(neighbor)

        if (frontierKeys.has(neighborKey)) {
          continue
        }

        frontier.push(neighbor)
        frontierKeys.add(neighborKey)
      }
    }
  }

  for (let pass = 0; pass < PLATEAU_SMOOTH_PASSES; pass += 1) {
    const tilesToDowngrade = []

    for (const row of tiles) {
      if (!Array.isArray(row)) {
        continue
      }

      for (const tile of row) {
        if (tile.terrain !== 'grass' || tile.elevation !== MAX_ELEVATION_LEVEL) {
          continue
        }

        let plateauNeighbors = 0

        for (const offset of NEIGHBOR_OFFSETS) {
          const neighbor = getTile(tiles, tile.x + offset.x, tile.y + offset.y)

          if (neighbor?.elevation === MAX_ELEVATION_LEVEL) {
            plateauNeighbors += 1
          }
        }

        if (plateauNeighbors < 3) {
          tilesToDowngrade.push(tile)
        }
      }
    }

    if (tilesToDowngrade.length === 0) {
      break
    }

    for (const tile of tilesToDowngrade) {
      tile.elevation = 1
    }
  }
}

function detectCliffs(tiles, width, height) {
  if (!Array.isArray(tiles) || width <= 0 || height <= 0) {
    return
  }

  for (let y = 0; y < height; y += 1) {
    const row = tiles[y]

    if (!Array.isArray(row)) {
      continue
    }

    for (let x = 0; x < width; x += 1) {
      const tile = row[x]

      if (!tile) {
        continue
      }

      if (tile.elevation !== MAX_ELEVATION_LEVEL) {
        tile.cliff = false
        continue
      }

      if (y === height - 1) {
        tile.cliff = false
        continue
      }

      const southTile = getTile(tiles, x, y + 1)

      tile.cliff = Boolean(southTile) && tile.elevation > southTile.elevation
    }
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
  generatePlateaus(tiles, rng)
  detectCliffs(tiles, width, height)

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
