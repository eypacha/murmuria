import {
  GRID_HEIGHT,
  GRID_WIDTH,
  INITIAL_GOLD_COUNT,
  INITIAL_PAWNS,
  INITIAL_SHEEP_COUNT,
  INITIAL_TREE_COUNT,
  TILE_SIZE,
} from '../config/constants.js'
import {
  CASTLE_FOOTPRINT,
  createCastle,
} from '../domain/factories/createCastle.js'
import { createGoldStone } from '../domain/factories/createGoldStone.js'
import { createPawn } from '../domain/factories/createPawn.js'
import { createSheep } from '../domain/factories/createSheep.js'
import { createTree } from '../domain/factories/createTree.js'
import { isTraversableTile } from './isTraversableTile.js'
import {
  SHEEP_VARIANT_CONFIGS,
  TREE_VARIANT_CONFIGS,
} from '../config/resourceVariants.js'
import { getOccupiedTiles } from './getOccupiedTiles.js'
import { seededRandom } from './seededRandom.js'
import { createKingdomState } from './createKingdomState.js'

const LAND_RATIO = 0.55
const MAX_ELEVATION_LEVEL = 2
const PLATEAU_COUNT = 3
const PLATEAU_SIZE = 24
const PLATEAU_SMOOTH_PASSES = 2
const GOLD_CLUSTER_COUNT = 4
const GOLD_CLUSTER_SIZE_MIN = 3
const GOLD_CLUSTER_SIZE_MAX = 5
const GOLD_SEED_SPACING = 4
const GOLD_ISOLATED_SPACING = 2
const TREE_CLUSTER_COUNT = 4
const TREE_CLUSTER_SIZE_MIN = 3
const TREE_CLUSTER_SIZE_MAX = 5
const TREE_SEED_SPACING = 6
const TREE_ISOLATED_SPACING = 3
const CASTLE_VISUAL_RESERVED_OFFSET_X = -1
const CASTLE_VISUAL_RESERVED_OFFSET_Y = -3
const CASTLE_VISUAL_RESERVED_WIDTH = CASTLE_FOOTPRINT.w + 2
const CASTLE_VISUAL_RESERVED_HEIGHT = CASTLE_FOOTPRINT.h + 4
const CARDINAL_NEIGHBOR_OFFSETS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
]
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
    cliffWaterBelow: false,
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
    cliffWaterBelow: false,
    ramp: false,
    walkable: true,
    movementCost: 1,
  }
}

function tileKey(tile) {
  return `${tile.x}:${tile.y}`
}

function positionKey(x, y) {
  return `${x}:${y}`
}

function getTile(tiles, x, y) {
  return tiles[y]?.[x] ?? null
}

function getCastleIdealPosition(width, height) {
  return {
    x: Math.max(0, Math.floor((width - CASTLE_FOOTPRINT.w) / 2)),
    y: Math.max(0, Math.floor((height - CASTLE_FOOTPRINT.h) / 2)),
  }
}

function isCastleFootprintTile(tile) {
  return tile?.terrain === 'grass' && tile.walkable && !tile.cliff
}

function isCastleDropTile(tile) {
  return tile?.walkable ?? false
}

function isPlateauTile(tile) {
  return tile?.terrain === 'grass' && tile.elevation === MAX_ELEVATION_LEVEL
}

function getPlateauTiles(tiles) {
  const plateauTiles = []

  for (const row of tiles) {
    if (!Array.isArray(row)) {
      continue
    }

    for (const tile of row) {
      if (isPlateauTile(tile)) {
        plateauTiles.push(tile)
      }
    }
  }

  return plateauTiles
}

function getNearestDistance(tile, targets) {
  if (targets.length === 0) {
    return Number.POSITIVE_INFINITY
  }

  let nearestDistance = Number.POSITIVE_INFINITY

  for (const target of targets) {
    const distance = Math.max(Math.abs(tile.x - target.x), Math.abs(tile.y - target.y))

    if (distance < nearestDistance) {
      nearestDistance = distance
    }
  }

  return nearestDistance
}

function pickWeightedItem(items, getWeight, rng) {
  let totalWeight = 0
  const weightedItems = []

  for (const item of items) {
    const weight = Math.max(0, Number(getWeight(item) ?? 0))

    if (weight <= 0) {
      continue
    }

    totalWeight += weight
    weightedItems.push({ item, weight })
  }

  if (totalWeight <= 0 || weightedItems.length === 0) {
    return null
  }

  let cursor = rng.next() * totalWeight

  for (const { item, weight } of weightedItems) {
    cursor -= weight

    if (cursor <= 0) {
      return item
    }
  }

  return weightedItems[weightedItems.length - 1]?.item ?? null
}

function shuffleInPlace(items, rng) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = rng.nextInt(i + 1)
    const temp = items[i]
    items[i] = items[j]
    items[j] = temp
  }
}

function getSpawnFacing() {
  return Math.random() < 0.5 ? 'left' : 'right'
}

function createSheepStateBag() {
  const states = ['idle', 'moving', 'eating'].slice(0, Math.min(3, INITIAL_SHEEP_COUNT))
  const fallbackStates = ['idle', 'idle', 'moving', 'moving', 'eating']

  while (states.length < INITIAL_SHEEP_COUNT) {
    const randomIndex = Math.floor(Math.random() * fallbackStates.length)
    states.push(fallbackStates[randomIndex] ?? 'idle')
  }

  for (let i = states.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = states[i]
    states[i] = states[j]
    states[j] = temp
  }

  return states
}

function createSheepMotionState(seed, x, y) {
  const motionRng = seededRandom(`${seed}:sheep-motion:${x}:${y}`)
  const turnIntervalTicks = 4 + motionRng.nextInt(4)

  return {
    seed: `${seed}:sheep-motion:${x}:${y}`,
    cycle: 0,
    direction: Math.random() < 0.5 ? 'left' : 'right',
    speed: 36 + motionRng.nextInt(9),
    turnIntervalTicks,
    nextTurnTick: turnIntervalTicks,
  }
}

const GOLD_CLUSTER_PATTERNS = {
  1: [[{ x: 0, y: 0 }]],
  2: [
    [{ x: 0, y: 0 }, { x: 1, y: 0 }],
    [{ x: 0, y: 0 }, { x: -1, y: 0 }],
    [{ x: 0, y: 0 }, { x: 0, y: 1 }],
    [{ x: 0, y: 0 }, { x: 0, y: -1 }],
  ],
  3: [
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }],
    [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }],
    [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 0, y: -1 }],
  ],
  4: [
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
    [
      { x: 0, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 1 },
    ],
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: 1, y: -1 },
    ],
    [
      { x: 0, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: -1 },
      { x: -1, y: -1 },
    ],
  ],
  5: [
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 0 },
    ],
    [
      { x: 0, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 1 },
      { x: -2, y: 0 },
    ],
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: 1, y: -1 },
      { x: 2, y: 0 },
    ],
    [
      { x: 0, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: -1 },
      { x: -1, y: -1 },
      { x: -2, y: 0 },
    ],
  ],
}

const GOLD_LARGE_VARIANT_INDICES = [4, 5]
const GOLD_SMALL_VARIANT_INDICES = [0, 1, 2, 3]

function pickGoldVariantIndex(worldSeed, resourceX, resourceY, goldState, rng) {
  const smallCandidateIndices = [...GOLD_SMALL_VARIANT_INDICES]
  const largeCandidateIndices = [...GOLD_LARGE_VARIANT_INDICES]

  if (goldState.largePlaced) {
    return smallCandidateIndices[rng.nextInt(smallCandidateIndices.length)] ?? 0
  }

  const variantRng = seededRandom(`${worldSeed}:gold-variant:${resourceX}:${resourceY}`)
  const shouldUseLargeVariant = variantRng.next() < 0.18

  if (shouldUseLargeVariant) {
    goldState.largePlaced = true
    return largeCandidateIndices[variantRng.nextInt(largeCandidateIndices.length)] ?? 4
  }

  return smallCandidateIndices[rng.nextInt(smallCandidateIndices.length)] ?? 0
}

function tryBuildGoldCluster(seed, targetSize, candidateKeys, occupiedKeys, tiles, plateauTiles, rng) {
  const clusterSize = Math.max(1, Math.min(5, targetSize))
  const patterns = [...(GOLD_CLUSTER_PATTERNS[clusterSize] ?? GOLD_CLUSTER_PATTERNS[1])]
  shuffleInPlace(patterns, rng)

  for (const offsets of patterns) {
    const cluster = []
    let valid = true

    for (const offset of offsets) {
      const tile = getTile(tiles, seed.x + offset.x, seed.y + offset.y)

      if (!tile) {
        valid = false
        break
      }

      const key = positionKey(tile.x, tile.y)

      if (!candidateKeys.has(key) || occupiedKeys.has(key)) {
        valid = false
        break
      }

      if (!isGoldTerrainTile(tile, tiles)) {
        valid = false
        break
      }

      cluster.push(tile)
    }

    if (valid) {
      return cluster
    }
  }

  return []
}

function growGoldCluster(seed, targetSize, candidateKeys, occupiedKeys, tiles, plateauTiles, rng) {
  const clusterSize = Math.max(1, Math.min(5, targetSize))

  for (let size = clusterSize; size >= 1; size -= 1) {
    const cluster = tryBuildGoldCluster(seed, size, candidateKeys, occupiedKeys, tiles, plateauTiles, rng)

    if (cluster.length === size) {
      return cluster
    }
  }

  return []
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

function touchesCliff(tile, tiles) {
  for (const offset of NEIGHBOR_OFFSETS) {
    const neighbor = getTile(tiles, tile.x + offset.x, tile.y + offset.y)

    if (neighbor?.cliff) {
      return true
    }
  }

  return false
}

function isTreeTerrainTile(tile, tiles) {
  if (!tile) {
    return false
  }

  if (tile.terrain !== 'grass' || !tile.walkable) {
    return false
  }

  if (tile.cliff) {
    return false
  }

  if (touchesWater(tile, tiles)) {
    return false
  }

  if (touchesCliff(tile, tiles)) {
    return false
  }

  return true
}

function isPawnSpawnTile(tile) {
  return isTraversableTile(tile)
}

function isGoldTerrainTile(tile, tiles) {
  if (!tile) {
    return false
  }

  if (tile.terrain !== 'grass' || !tile.walkable) {
    return false
  }

  if (tile.elevation <= 0) {
    return false
  }

  if (tile.cliff) {
    return false
  }

  if (touchesWater(tile, tiles)) {
    return false
  }

  return true
}

function isCastlePlacementValid(tiles, width, height, x, y) {
  if (x < 0 || y < 0) {
    return false
  }

  if (x + CASTLE_FOOTPRINT.w > width || y + CASTLE_FOOTPRINT.h > height) {
    return false
  }

  for (let dy = 0; dy < CASTLE_FOOTPRINT.h; dy += 1) {
    for (let dx = 0; dx < CASTLE_FOOTPRINT.w; dx += 1) {
      const tile = getTile(tiles, x + dx, y + dy)

      if (!isCastleFootprintTile(tile)) {
        return false
      }
    }
  }

  const dropTile = getTile(tiles, x + Math.floor(CASTLE_FOOTPRINT.w / 2), y + CASTLE_FOOTPRINT.h)

  return isCastleDropTile(dropTile)
}

function findCastlePlacement(tiles, width, height) {
  const idealPosition = getCastleIdealPosition(width, height)
  let bestPosition = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (let y = 0; y <= height - CASTLE_FOOTPRINT.h; y += 1) {
    for (let x = 0; x <= width - CASTLE_FOOTPRINT.w; x += 1) {
      if (!isCastlePlacementValid(tiles, width, height, x, y)) {
        continue
      }

      const distance = Math.abs(x - idealPosition.x) + Math.abs(y - idealPosition.y)

      if (distance < bestDistance) {
        bestDistance = distance
        bestPosition = { x, y }
      }
    }
  }

  return bestPosition ?? idealPosition
}

function flattenCastlePlateau(tiles, castle) {
  if (!castle) {
    return false
  }

  const footprint = castle.footprint ?? CASTLE_FOOTPRINT
  const seeds = []

  for (let dy = 0; dy < footprint.h; dy += 1) {
    for (let dx = 0; dx < footprint.w; dx += 1) {
      const tile = getTile(tiles, castle.gridPos.x + dx, castle.gridPos.y + dy)

      if (isPlateauTile(tile)) {
        seeds.push(tile)
      }
    }
  }

  if (seeds.length === 0) {
    return false
  }

  const visited = new Set()
  const frontier = [...seeds]
  let flattenedAny = false

  while (frontier.length > 0) {
    const current = frontier.pop()

    if (!current) {
      continue
    }

    const currentKey = positionKey(current.x, current.y)

    if (visited.has(currentKey)) {
      continue
    }

    visited.add(currentKey)

    const tile = getTile(tiles, current.x, current.y)

    if (!isPlateauTile(tile)) {
      continue
    }

    tile.elevation = 1
    flattenedAny = true

    for (const offset of NEIGHBOR_OFFSETS) {
      const neighbor = getTile(tiles, current.x + offset.x, current.y + offset.y)

      if (!isPlateauTile(neighbor)) {
        continue
      }

      const neighborKey = positionKey(neighbor.x, neighbor.y)

      if (!visited.has(neighborKey)) {
        frontier.push(neighbor)
      }
    }
  }

  return flattenedAny
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

function getGoldCandidates(tiles, reservedKeys) {
  const candidates = []

  for (const row of tiles) {
    if (!Array.isArray(row)) {
      continue
    }

    for (const tile of row) {
      const key = positionKey(tile.x, tile.y)

      if (reservedKeys.has(key)) {
        continue
      }

      if (!isGoldTerrainTile(tile, tiles)) {
        continue
      }

      candidates.push(tile)
    }
  }

  return candidates
}

function getGoldSeedWeight(tile, plateauTiles) {
  const distance = getNearestDistance(tile, plateauTiles)

  if (!Number.isFinite(distance)) {
    return 1
  }

  return Math.max(1, 8 - distance * 2)
}

function getCastleReservationKeys(castle) {
  const reservationKeys = new Set()
  const reservationX = castle.gridPos.x + CASTLE_VISUAL_RESERVED_OFFSET_X
  const reservationY = castle.gridPos.y + CASTLE_VISUAL_RESERVED_OFFSET_Y
  const reservationWidth = CASTLE_VISUAL_RESERVED_WIDTH
  const reservationHeight = CASTLE_VISUAL_RESERVED_HEIGHT

  // Reserve the visible castle volume plus one-tile padding around it.
  for (let dy = 0; dy < reservationHeight; dy += 1) {
    for (let dx = 0; dx < reservationWidth; dx += 1) {
      reservationKeys.add(positionKey(reservationX + dx, reservationY + dy))
    }
  }

  return reservationKeys
}

function createPawnPositions(castle, tiles, width, height, occupiedTiles, rng) {
  const footprint = castle.footprint ?? { w: 1, h: 1 }
  const preferredPositions = [
    { x: castle.gridPos.x - 1, y: castle.gridPos.y + 3 },
    { x: castle.gridPos.x + footprint.w, y: castle.gridPos.y + 3 },
  ]

  const validPreferredPositions = preferredPositions.filter((position) => {
    if (position.x < 0 || position.y < 0 || position.x >= width || position.y >= height) {
      return false
    }

    if (occupiedTiles.has(positionKey(position.x, position.y))) {
      return false
    }

    return isPawnSpawnTile(getTile(tiles, position.x, position.y))
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
      if (preferredPositions.some((position) => position.x === x && position.y === y)) {
        continue
      }

      if (occupiedTiles.has(positionKey(x, y))) {
        continue
      }

      if (!isPawnSpawnTile(getTile(tiles, x, y))) {
        continue
      }

      fallbackPositions.push({ x, y })
    }
  }

  shuffleInPlace(fallbackPositions, rng)

  return [...validPreferredPositions, ...fallbackPositions].slice(0, INITIAL_PAWNS)
}

function isDistanceFarEnough(tile, points, minimumDistance) {
  return points.every((point) => {
    const distance = Math.max(Math.abs(tile.x - point.x), Math.abs(tile.y - point.y))
    return distance >= minimumDistance
  })
}

function getTreeCandidates(tiles, reservedKeys) {
  const candidates = []

  for (const row of tiles) {
    if (!Array.isArray(row)) {
      continue
    }

    for (const tile of row) {
      const key = positionKey(tile.x, tile.y)

      if (reservedKeys.has(key)) {
        continue
      }

      if (!isTreeTerrainTile(tile, tiles)) {
        continue
      }

      candidates.push(tile)
    }
  }

  return candidates
}

function growTreeCluster(seed, targetSize, candidateKeys, occupiedKeys, tiles, rng) {
  const cluster = [seed]
  const clusterKeys = new Set([positionKey(seed.x, seed.y)])
  const frontier = [seed]

  occupiedKeys.add(positionKey(seed.x, seed.y))

  while (frontier.length > 0 && cluster.length < targetSize) {
    const frontierIndex = rng.nextInt(frontier.length)
    const current = frontier[frontierIndex]

    frontier[frontierIndex] = frontier[frontier.length - 1]
    frontier.pop()

    const neighbors = []

    for (const offset of NEIGHBOR_OFFSETS) {
      const neighbor = getTile(tiles, current.x + offset.x, current.y + offset.y)

      if (!neighbor) {
        continue
      }

      const key = positionKey(neighbor.x, neighbor.y)

      if (!candidateKeys.has(key) || occupiedKeys.has(key) || clusterKeys.has(key)) {
        continue
      }

      neighbors.push(neighbor)
    }

    shuffleInPlace(neighbors, rng)

    let addedNeighbor = false

    for (const neighbor of neighbors) {
      const key = positionKey(neighbor.x, neighbor.y)

      if (occupiedKeys.has(key) || clusterKeys.has(key)) {
        continue
      }

      cluster.push(neighbor)
      clusterKeys.add(key)
      occupiedKeys.add(key)
      frontier.push(neighbor)
      addedNeighbor = true
      break
    }

    if (!addedNeighbor && frontier.length === 0) {
      break
    }
  }

  return cluster
}

function spawnGold(tiles, castle, worldSeed, rng, extraReservedKeys = new Set()) {
  const resources = []
  const reservedKeys = new Set([...getCastleReservationKeys(castle), ...extraReservedKeys])
  const occupiedKeys = new Set(reservedKeys)
  const failedSeedKeys = new Set()
  const plateauTiles = getPlateauTiles(tiles)
  const candidateTiles = getGoldCandidates(tiles, reservedKeys)
  const candidateKeys = new Set(candidateTiles.map((tile) => positionKey(tile.x, tile.y)))
  const goldPositions = []
  const goldState = {
    largePlaced: false,
  }
  const clusterTargetCount = Math.min(
    GOLD_CLUSTER_COUNT,
    Math.max(1, Math.floor(INITIAL_GOLD_COUNT / GOLD_CLUSTER_SIZE_MIN)),
  )
  let clusterCount = 0

  while (
    resources.length < INITIAL_GOLD_COUNT &&
    clusterCount < clusterTargetCount &&
    failedSeedKeys.size < candidateTiles.length
  ) {
    const availableSeeds = candidateTiles.filter((tile) => {
      const key = positionKey(tile.x, tile.y)

      return (
        !occupiedKeys.has(key) &&
        !failedSeedKeys.has(key) &&
        isDistanceFarEnough(tile, goldPositions, GOLD_SEED_SPACING)
      )
    })

    if (availableSeeds.length === 0) {
      break
    }

    const seedTile = pickWeightedItem(
      availableSeeds,
      (tile) => getGoldSeedWeight(tile, plateauTiles),
      rng,
    )

    if (!seedTile) {
      break
    }

    const seedKey = positionKey(seedTile.x, seedTile.y)

    if (occupiedKeys.has(seedKey)) {
      continue
    }

    const remainingGoldSlots = INITIAL_GOLD_COUNT - resources.length

    if (remainingGoldSlots <= 0) {
      break
    }

    const desiredClusterSize = Math.min(
      GOLD_CLUSTER_SIZE_MIN + rng.nextInt(GOLD_CLUSTER_SIZE_MAX - GOLD_CLUSTER_SIZE_MIN + 1),
      remainingGoldSlots,
    )
    const cluster = growGoldCluster(
      seedTile,
      desiredClusterSize,
      candidateKeys,
      occupiedKeys,
      tiles,
      plateauTiles,
      rng,
    )

    if (cluster.length < 2) {
      failedSeedKeys.add(seedKey)

      for (const tile of cluster) {
        occupiedKeys.delete(positionKey(tile.x, tile.y))
      }

      continue
    }

    clusterCount += 1

    for (const tile of cluster) {
      occupiedKeys.add(positionKey(tile.x, tile.y))
      goldPositions.push(tile)
      resources.push(
        createGoldStone(
          tile.x,
          tile.y,
          pickGoldVariantIndex(worldSeed, tile.x, tile.y, goldState, rng),
          getSpawnFacing(),
        ),
      )
    }
  }

  if (resources.length < INITIAL_GOLD_COUNT) {
    let remainingCandidates = candidateTiles.filter(
      (tile) => !occupiedKeys.has(positionKey(tile.x, tile.y)),
    )

    while (resources.length < INITIAL_GOLD_COUNT && remainingCandidates.length > 0) {
      const availableCandidates = remainingCandidates.filter((tile) => {
        const key = positionKey(tile.x, tile.y)
        return !occupiedKeys.has(key) && isDistanceFarEnough(tile, goldPositions, GOLD_ISOLATED_SPACING)
      })

      if (availableCandidates.length === 0) {
        break
      }

      const tile = pickWeightedItem(
        availableCandidates,
        (candidate) => getGoldSeedWeight(candidate, plateauTiles),
        rng,
      )

      if (!tile) {
        break
      }

      const key = positionKey(tile.x, tile.y)

      if (occupiedKeys.has(key)) {
        remainingCandidates = remainingCandidates.filter(
          (candidate) => positionKey(candidate.x, candidate.y) !== key,
        )
        continue
      }

      occupiedKeys.add(key)
      goldPositions.push(tile)
      resources.push(
        createGoldStone(
          tile.x,
          tile.y,
          pickGoldVariantIndex(worldSeed, tile.x, tile.y, goldState, rng),
          getSpawnFacing(),
        ),
      )
      remainingCandidates = remainingCandidates.filter(
        (candidate) => positionKey(candidate.x, candidate.y) !== key,
      )
    }
  }

  if (resources.length < INITIAL_GOLD_COUNT) {
    let remainingCandidates = candidateTiles.filter(
      (tile) => !occupiedKeys.has(positionKey(tile.x, tile.y)),
    )

    while (resources.length < INITIAL_GOLD_COUNT && remainingCandidates.length > 0) {
      const tile = pickWeightedItem(
        remainingCandidates,
        (candidate) => getGoldSeedWeight(candidate, plateauTiles),
        rng,
      )

      if (!tile) {
        break
      }

      const key = positionKey(tile.x, tile.y)

      if (occupiedKeys.has(key)) {
        remainingCandidates = remainingCandidates.filter(
          (candidate) => positionKey(candidate.x, candidate.y) !== key,
        )
        continue
      }

      occupiedKeys.add(key)
      goldPositions.push(tile)
      resources.push(
        createGoldStone(
          tile.x,
          tile.y,
          pickGoldVariantIndex(worldSeed, tile.x, tile.y, goldState, rng),
          getSpawnFacing(),
        ),
      )
      remainingCandidates = remainingCandidates.filter(
        (candidate) => positionKey(candidate.x, candidate.y) !== key,
      )
    }
  }

  if (resources.length < INITIAL_GOLD_COUNT) {
    for (const tile of candidateTiles) {
      if (resources.length >= INITIAL_GOLD_COUNT) {
        break
      }

      const key = positionKey(tile.x, tile.y)

      if (occupiedKeys.has(key)) {
        continue
      }

      if (!isDistanceFarEnough(tile, goldPositions, GOLD_ISOLATED_SPACING)) {
        continue
      }

      occupiedKeys.add(key)
      goldPositions.push(tile)
      resources.push(
        createGoldStone(
          tile.x,
          tile.y,
          pickGoldVariantIndex(worldSeed, tile.x, tile.y, goldState, rng),
          getSpawnFacing(),
        ),
      )
    }
  }

  return resources
}

function spawnPawns(tiles, castle, width, height, rng) {
  const units = []
  const occupiedKeys = new Set(getOccupiedTiles(castle).map((tile) => positionKey(tile.x, tile.y)))
  const pawnPositions = createPawnPositions(castle, tiles, width, height, occupiedKeys, rng)

  for (const position of pawnPositions) {
    const facing = getSpawnFacing()

    units.push(createPawn(position.x, position.y, facing))
    occupiedKeys.add(positionKey(position.x, position.y))
  }

  return units
}

function spawnTrees(tiles, castle, worldSeed, rng, extraReservedKeys = new Set()) {
  const resources = []
  const reservedKeys = new Set([...getCastleReservationKeys(castle), ...extraReservedKeys])
  const occupiedKeys = new Set(reservedKeys)
  const candidateTiles = getTreeCandidates(tiles, reservedKeys)
  const candidateKeys = new Set(candidateTiles.map((tile) => positionKey(tile.x, tile.y)))
  const validClusterCandidates = [...candidateTiles]
  const treePositions = []

  shuffleInPlace(validClusterCandidates, rng)

  const clusterTargetCount = Math.min(
    TREE_CLUSTER_COUNT,
    Math.max(2, Math.floor(INITIAL_TREE_COUNT / 5)),
  )

  let clusterCount = 0

  for (const seedTile of validClusterCandidates) {
    if (resources.length >= INITIAL_TREE_COUNT || clusterCount >= clusterTargetCount) {
      break
    }

    const seedKey = positionKey(seedTile.x, seedTile.y)

    if (occupiedKeys.has(seedKey)) {
      continue
    }

    if (!isDistanceFarEnough(seedTile, treePositions, TREE_SEED_SPACING)) {
      continue
    }

    const desiredClusterSize = TREE_CLUSTER_SIZE_MIN + rng.nextInt(TREE_CLUSTER_SIZE_MAX - TREE_CLUSTER_SIZE_MIN + 1)
    const cluster = growTreeCluster(
      seedTile,
      desiredClusterSize,
      candidateKeys,
      occupiedKeys,
      tiles,
      rng,
    )

    if (cluster.length < 2) {
      for (const tile of cluster) {
        occupiedKeys.delete(positionKey(tile.x, tile.y))
      }

      continue
    }

    clusterCount += 1

    for (const tile of cluster) {
      treePositions.push(tile)
      resources.push(
        createTree(
          tile.x,
          tile.y,
          rng.nextInt(TREE_VARIANT_CONFIGS.length),
          getSpawnFacing(),
        ),
      )
    }
  }

  const remainingCandidates = candidateTiles.filter((tile) => !occupiedKeys.has(positionKey(tile.x, tile.y)))
  shuffleInPlace(remainingCandidates, rng)

  for (const tile of remainingCandidates) {
    if (resources.length >= INITIAL_TREE_COUNT) {
      break
    }

    const key = positionKey(tile.x, tile.y)

    if (occupiedKeys.has(key)) {
      continue
    }

    if (!isDistanceFarEnough(tile, treePositions, TREE_ISOLATED_SPACING)) {
      continue
    }

    occupiedKeys.add(key)
    treePositions.push(tile)
    resources.push(
      createTree(
        tile.x,
        tile.y,
        rng.nextInt(TREE_VARIANT_CONFIGS.length),
        getSpawnFacing(),
      ),
    )
  }

  if (resources.length < INITIAL_TREE_COUNT) {
    for (const tile of remainingCandidates) {
      if (resources.length >= INITIAL_TREE_COUNT) {
        break
      }

      const key = positionKey(tile.x, tile.y)

      if (occupiedKeys.has(key)) {
        continue
      }

      occupiedKeys.add(key)
      treePositions.push(tile)
      resources.push(
        createTree(
          tile.x,
          tile.y,
          rng.nextInt(TREE_VARIANT_CONFIGS.length),
          getSpawnFacing(),
        ),
      )
    }
  }

  return resources
}

const SHEEP_CLUSTER_PATTERNS = {
  1: [[{ x: 0, y: 0 }]],
  2: [
    [{ x: 0, y: 0 }, { x: 1, y: 0 }],
    [{ x: 0, y: 0 }, { x: -1, y: 0 }],
    [{ x: 0, y: 0 }, { x: 0, y: 1 }],
    [{ x: 0, y: 0 }, { x: 0, y: -1 }],
  ],
  3: [
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }],
    [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }],
    [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 0, y: -1 }],
  ],
}

function tryBuildSheepCluster(seed, targetSize, candidateKeys, occupiedKeys, tiles, rng) {
  const clusterSize = Math.max(1, Math.min(3, targetSize))
  const patterns = [...(SHEEP_CLUSTER_PATTERNS[clusterSize] ?? SHEEP_CLUSTER_PATTERNS[1])]
  shuffleInPlace(patterns, rng)

  for (const offsets of patterns) {
    const cluster = []
    let valid = true

    for (const offset of offsets) {
      const tile = getTile(tiles, seed.x + offset.x, seed.y + offset.y)

      if (!tile) {
        valid = false
        break
      }

      const key = positionKey(tile.x, tile.y)

      if (!candidateKeys.has(key) || occupiedKeys.has(key)) {
        valid = false
        break
      }

      cluster.push(tile)
    }

    if (valid) {
      return cluster
    }
  }

  return []
}

function growSheepCluster(seed, targetSize, candidateKeys, occupiedKeys, tiles, rng) {
  const clusterSize = Math.max(1, Math.min(3, targetSize))

  for (let size = clusterSize; size >= 1; size -= 1) {
    const cluster = tryBuildSheepCluster(seed, size, candidateKeys, occupiedKeys, tiles, rng)

    if (cluster.length === size) {
      return cluster
    }
  }

  return []
}

function spawnSheep(tiles, castle, worldSeed, rng, extraReservedKeys = new Set()) {
  const resources = []
  const reservedKeys = new Set([...getCastleReservationKeys(castle), ...extraReservedKeys])
  const occupiedKeys = new Set(reservedKeys)
  const failedSeedKeys = new Set()
  const candidateTiles = getTreeCandidates(tiles, reservedKeys)
  const candidateKeys = new Set(candidateTiles.map((tile) => positionKey(tile.x, tile.y)))
  const sheepPositions = []
  const sheepStates = createSheepStateBag()
  let sheepStateIndex = 0
  const clusterTargetCount = Math.min(
    4,
    Math.max(1, Math.floor(INITIAL_SHEEP_COUNT / 2)),
  )
  let clusterCount = 0

  function nextSheepState() {
    const nextState = sheepStates[sheepStateIndex]
    sheepStateIndex += 1

    return nextState ?? 'idle'
  }

  while (
    resources.length < INITIAL_SHEEP_COUNT &&
    clusterCount < clusterTargetCount &&
    failedSeedKeys.size < candidateTiles.length
  ) {
    const availableSeeds = candidateTiles.filter((tile) => {
      const key = positionKey(tile.x, tile.y)

      return (
        !occupiedKeys.has(key) &&
        !failedSeedKeys.has(key) &&
        isDistanceFarEnough(tile, sheepPositions, 5)
      )
    })

    if (availableSeeds.length === 0) {
      break
    }

    const seedTile = availableSeeds[rng.nextInt(availableSeeds.length)]

    if (!seedTile) {
      break
    }

    const seedKey = positionKey(seedTile.x, seedTile.y)

    if (occupiedKeys.has(seedKey)) {
      continue
    }

    const remainingSlots = INITIAL_SHEEP_COUNT - resources.length

    if (remainingSlots <= 0) {
      break
    }

    const desiredClusterSize = Math.min(1 + rng.nextInt(3), remainingSlots)
    const cluster = growSheepCluster(
      seedTile,
      desiredClusterSize,
      candidateKeys,
      occupiedKeys,
      tiles,
      rng,
    )

    if (cluster.length === 0) {
      failedSeedKeys.add(seedKey)

      continue
    }

    clusterCount += 1

    for (const tile of cluster) {
      occupiedKeys.add(positionKey(tile.x, tile.y))
      sheepPositions.push(tile)
      const facing = getSpawnFacing()
      const sheep = createSheep(
        tile.x,
        tile.y,
        rng.nextInt(SHEEP_VARIANT_CONFIGS.length),
        facing,
        nextSheepState(),
      )

      sheep.pos = {
        x: tile.x * TILE_SIZE + TILE_SIZE / 2,
        y: tile.y * TILE_SIZE + TILE_SIZE / 2,
      }
      sheep.motion = createSheepMotionState(worldSeed, tile.x, tile.y)

      resources.push(sheep)
    }
  }

  const remainingCandidates = candidateTiles.filter((tile) => !occupiedKeys.has(positionKey(tile.x, tile.y)))
  shuffleInPlace(remainingCandidates, rng)

  for (const tile of remainingCandidates) {
    if (resources.length >= INITIAL_SHEEP_COUNT) {
      break
    }

    const key = positionKey(tile.x, tile.y)

    if (occupiedKeys.has(key)) {
      continue
    }

    if (!isDistanceFarEnough(tile, sheepPositions, 2)) {
      continue
    }

    occupiedKeys.add(key)
    sheepPositions.push(tile)
    const facing = getSpawnFacing()
    const sheep = createSheep(
      tile.x,
      tile.y,
      rng.nextInt(SHEEP_VARIANT_CONFIGS.length),
      facing,
      nextSheepState(),
    )

    sheep.pos = {
      x: tile.x * TILE_SIZE + TILE_SIZE / 2,
      y: tile.y * TILE_SIZE + TILE_SIZE / 2,
    }
    sheep.motion = createSheepMotionState(worldSeed, tile.x, tile.y)

    resources.push(sheep)
  }

  if (resources.length < INITIAL_SHEEP_COUNT) {
    for (const tile of remainingCandidates) {
      if (resources.length >= INITIAL_SHEEP_COUNT) {
        break
      }

      const key = positionKey(tile.x, tile.y)

      if (occupiedKeys.has(key)) {
        continue
      }

      occupiedKeys.add(key)
      sheepPositions.push(tile)
      const facing = getSpawnFacing()
      const sheep = createSheep(
        tile.x,
        tile.y,
        rng.nextInt(SHEEP_VARIANT_CONFIGS.length),
        facing,
        nextSheepState(),
      )

      sheep.pos = {
        x: tile.x * TILE_SIZE + TILE_SIZE / 2,
        y: tile.y * TILE_SIZE + TILE_SIZE / 2,
      }
      sheep.motion = createSheepMotionState(worldSeed, tile.x, tile.y)

      resources.push(sheep)
    }
  }

  return resources
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

  for (const row of tiles) {
    if (!Array.isArray(row)) {
      continue
    }

    for (const tile of row) {
      if (tile) {
        tile.cliff = false
        tile.cliffWaterBelow = false
      }
    }
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

      if (y === height - 1) {
        continue
      }

      const southTile = getTile(tiles, x, y + 1)

      if (tile.elevation === MAX_ELEVATION_LEVEL && southTile && tile.elevation > southTile.elevation) {
        southTile.cliff = true
        southTile.cliffWaterBelow = southTile.terrain === 'water'
      }
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
  const maxAttempts = width * height * 10
  let attempts = 0

  while (landTiles.length < targetLandTiles && attempts < maxAttempts) {
    attempts += 1
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
  const castlePosition = findCastlePlacement(tiles, width, height)
  const castle = createCastle(castlePosition.x, castlePosition.y)
  flattenCastlePlateau(tiles, castle)
  detectCliffs(tiles, width, height)
  const pawnUnits = spawnPawns(tiles, castle, width, height, rng)
  const pawnReservedKeys = new Set(
    pawnUnits.map((pawn) => positionKey(pawn.gridPos.x, pawn.gridPos.y)),
  )
  const goldResources = spawnGold(tiles, castle, seed, rng, pawnReservedKeys)
  const goldReservedKeys = new Set(
    goldResources.map((resource) => positionKey(resource.gridPos.x, resource.gridPos.y)),
  )
  const treeReservedKeys = new Set([...pawnReservedKeys, ...goldReservedKeys])
  const treeResources = spawnTrees(tiles, castle, seed, rng, treeReservedKeys)
  const treeResourceKeys = new Set(
    treeResources.map((resource) => positionKey(resource.gridPos.x, resource.gridPos.y)),
  )
  const sheepReservedKeys = new Set([...treeReservedKeys, ...treeResourceKeys])
  const sheepResources = spawnSheep(tiles, castle, seed, rng, sheepReservedKeys)
  const resources = [...goldResources, ...treeResources, ...sheepResources]

  worldStore.tick = 0
  worldStore.seed = seed
  worldStore.kingdom = createKingdomState()
  Object.assign(worldStore.world, {
    width,
    height,
    tiles,
  })
  worldStore.resources = resources
  worldStore.buildings = [castle]
  worldStore.units = pawnUnits
}
