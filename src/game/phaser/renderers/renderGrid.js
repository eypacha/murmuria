import { FOAM_ANIMATION, DEBUG_MODE, DEPTH_GRID, TILE_SIZE } from '../../config/constants.js'

const TERRAIN_TEXTURE_KEY = 'terrain_tileset'
const PLATEAU_TEXTURE_KEY = 'terrain_tileset_plateau'
const WATER_FOAM_TEXTURE_KEY = 'water-foam'
const WATER_FOAM_ANIMATION_KEY = 'water-foam_anim'
const SKY_BACKGROUND_COLOR = 0x87ceeb
const GRID_LINE_COLOR = 0x000000
const GRID_LINE_ALPHA = 0.35
const WATER_FOAM_DEPTH = DEPTH_GRID - 1
const PLATEAU_TOP_DEPTH = DEPTH_GRID + 0.5
const CLIFF_DEPTH = DEPTH_GRID + 0.75
const PLATEAU_ELEVATION = 2
const PLATEAU_TILE_INDEX_OFFSET = 5
const CLIFF_AUTOTILE = {
  0: 44,
  1: 43,
  2: 41,
  3: 42,
}

export const GRASS_AUTOTILE = {
  0: 30, // isolated
  1: 21, // N
  2: 27, // E
  3: 18, // N + E
  4: 3,  // S
  5: 12, // N + S
  6: 0,  // E + S
  7: 9,  // N + E + S
  8: 29, // W
  9: 20, // N + W
  10: 28, // E + W
  11: 19, // N + E + W
  12: 2,  // S + W
  13: 11, // N + S + W
  14: 1,  // E + S + W
  15: 10, // N + E + S + W
}

function getTileTerrain(tiles, x, y) {
  return tiles[y]?.[x]?.terrain
}

function getTileElevation(tiles, x, y) {
  return tiles[y]?.[x]?.elevation
}

function getTileCliff(tiles, x, y) {
  return tiles[y]?.[x]?.cliff ?? false
}

function isConnectedCliffNeighbor(tiles, x, y) {
  return getTileCliff(tiles, x, y) || getTileElevation(tiles, x, y) === PLATEAU_ELEVATION
}

function isBlockedByUpperDiagonalCliff(tiles, x, y, side) {
  const diagonalX = side === 'left' ? x - 1 : x + 1

  return getTileCliff(tiles, diagonalX, y - 1)
}

export function computeGrassMask(x, y, tiles) {
  let mask = 0

  if (getTileTerrain(tiles, x, y - 1) === 'grass') {
    mask |= 1
  }

  if (getTileTerrain(tiles, x + 1, y) === 'grass') {
    mask |= 2
  }

  if (getTileTerrain(tiles, x, y + 1) === 'grass') {
    mask |= 4
  }

  if (getTileTerrain(tiles, x - 1, y) === 'grass') {
    mask |= 8
  }

  return mask
}

function computeElevationOneMask(x, y, tiles) {
  let mask = 0

  if (getTileElevation(tiles, x, y - 1) === 1) {
    mask |= 1
  }

  if (getTileElevation(tiles, x + 1, y) === 1) {
    mask |= 2
  }

  if (getTileElevation(tiles, x, y + 1) === 1) {
    mask |= 4
  }

  if (getTileElevation(tiles, x - 1, y) === 1) {
    mask |= 8
  }

  return mask
}

function computeElevationMask(x, y, tiles, elevation) {
  let mask = 0

  if (getTileElevation(tiles, x, y - 1) === elevation) {
    mask |= 1
  }

  if (getTileElevation(tiles, x + 1, y) === elevation) {
    mask |= 2
  }

  if (getTileElevation(tiles, x, y + 1) === elevation) {
    mask |= 4
  }

  if (getTileElevation(tiles, x - 1, y) === elevation) {
    mask |= 8
  }

  return mask
}

function computeCliffMask(x, y, tiles) {
  let mask = 0

  if (isConnectedCliffNeighbor(tiles, x - 1, y) && !isBlockedByUpperDiagonalCliff(tiles, x, y, 'left')) {
    mask |= 1
  }

  if (isConnectedCliffNeighbor(tiles, x + 1, y) && !isBlockedByUpperDiagonalCliff(tiles, x, y, 'right')) {
    mask |= 2
  }

  return mask
}

function resolveGrassTileIndex(x, y, tiles) {
  const mask = computeGrassMask(x, y, tiles)

  return {
    mask,
    tileIndex: GRASS_AUTOTILE[mask],
  }
}

function resolveElevationTileIndex(x, y, tiles, elevation) {
  const mask = computeElevationMask(x, y, tiles, elevation)
  const baseTileIndex = GRASS_AUTOTILE[mask]

  return {
    mask,
    tileIndex: baseTileIndex + PLATEAU_TILE_INDEX_OFFSET,
  }
}

function resolveElevationOneTileIndex(x, y, tiles) {
  const mask = computeElevationOneMask(x, y, tiles)

  return {
    mask,
    tileIndex: GRASS_AUTOTILE[mask],
  }
}

function resolveCliffTileIndex(tile, tiles) {
  const mask = computeCliffMask(tile.x, tile.y, tiles)
  const tileIndex = CLIFF_AUTOTILE[mask] + (tile.cliffWaterBelow ? 9 : 0)

  return {
    mask,
    tileIndex,
  }
}

export function getGrassTileIndex(x, y, tiles) {
  return resolveGrassTileIndex(x, y, tiles).tileIndex
}

function addWaterFoam(scene, x, y) {
  const sprite = scene.add.sprite(x, y, WATER_FOAM_TEXTURE_KEY)

  sprite.setDepth(WATER_FOAM_DEPTH)
  sprite.play(WATER_FOAM_ANIMATION_KEY)

  return sprite
}

function addTerrainSprite(scene, x, y, textureKey, tileIndex, depth = DEPTH_GRID) {
  const sprite = scene.add.image(x, y, textureKey, tileIndex)

  sprite.setDepth(depth)

  return sprite
}

export function renderGrid(scene, worldStore) {
  const tiles = worldStore.world.tiles
  const worldWidth = worldStore.world.width * TILE_SIZE
  const worldHeight = worldStore.world.height * TILE_SIZE

  scene.cameras.main.setBackgroundColor(SKY_BACKGROUND_COLOR)

  for (const row of tiles) {
    for (const tile of row) {
      const x = tile.x * TILE_SIZE + TILE_SIZE / 2
      const y = tile.y * TILE_SIZE + TILE_SIZE / 2

      if (tile.terrain === 'water') {
        if (tile.cliff) {
          if (FOAM_ANIMATION && tile.cliffWaterBelow) {
            addWaterFoam(scene, x, y)
          }

          const cliffTile = resolveCliffTileIndex(tile, tiles)

          addTerrainSprite(scene, x, y, PLATEAU_TEXTURE_KEY, cliffTile.tileIndex, CLIFF_DEPTH)
        }

        continue
      }

      if (tile.terrain === 'grass') {
        const isPlateau = tile.elevation === PLATEAU_ELEVATION
        const grassTile = resolveGrassTileIndex(tile.x, tile.y, tiles)
        const plateauTile = isPlateau
          ? resolveElevationTileIndex(tile.x, tile.y, tiles, PLATEAU_ELEVATION)
          : null
        const supportTile = isPlateau
          ? resolveElevationOneTileIndex(tile.x, tile.y, tiles)
          : null

        if (!isPlateau && FOAM_ANIMATION && grassTile.mask !== 15) {
          addWaterFoam(scene, x, y)
        }

        if (isPlateau) {
          addTerrainSprite(scene, x, y, TERRAIN_TEXTURE_KEY, supportTile.tileIndex)
        }

        addTerrainSprite(
          scene,
          x,
          y,
          isPlateau ? PLATEAU_TEXTURE_KEY : TERRAIN_TEXTURE_KEY,
          isPlateau ? plateauTile.tileIndex : grassTile.tileIndex,
          isPlateau ? PLATEAU_TOP_DEPTH : DEPTH_GRID,
        )

        if (tile.cliff) {
          const cliffTile = resolveCliffTileIndex(tile, tiles)

          addTerrainSprite(scene, x, y, PLATEAU_TEXTURE_KEY, cliffTile.tileIndex, CLIFF_DEPTH)
        }
      }
    }
  }

  if (!DEBUG_MODE) {
    return
  }

  const gridOverlay = scene.add.graphics()
  gridOverlay.lineStyle(1, GRID_LINE_COLOR, GRID_LINE_ALPHA)
  gridOverlay.setDepth(DEPTH_GRID + 1)

  for (let x = 0; x <= worldWidth; x += TILE_SIZE) {
    gridOverlay.lineBetween(x, 0, x, worldHeight)
  }

  for (let y = 0; y <= worldHeight; y += TILE_SIZE) {
    gridOverlay.lineBetween(0, y, worldWidth, y)
  }
}
