import { FOAM_ANIMATION, DEBUG_MODE, DEPTH_GRID, TILE_SIZE } from '../../config/constants.js'

const TERRAIN_TEXTURE_KEY = 'terrain_tileset'
const WATER_FOAM_TEXTURE_KEY = 'water-foam'
const WATER_FOAM_ANIMATION_KEY = 'water-foam_anim'
const SKY_BACKGROUND_COLOR = 0x87ceeb
const GRID_LINE_COLOR = 0x000000
const GRID_LINE_ALPHA = 0.35
const WATER_FOAM_DEPTH = DEPTH_GRID - 1
const DEBUG_TILE_TEXT_STYLE = {
  fontFamily: 'monospace',
  fontSize: '12px',
  color: '#000000',
  align: 'center',
  stroke: '#ffffff',
  strokeThickness: 4,
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

function resolveGrassTileIndex(x, y, tiles) {
  const mask = computeGrassMask(x, y, tiles)

  return {
    mask,
    tileIndex: GRASS_AUTOTILE[mask],
  }
}

export function getGrassTileIndex(x, y, tiles) {
  return resolveGrassTileIndex(x, y, tiles).tileIndex
}

function addDebugTileLabel(scene, x, y, key, value) {
  const label = scene.add.text(x, y, `${key}\n${value}`, DEBUG_TILE_TEXT_STYLE)

  label.setOrigin(0.5)
  label.setDepth(DEPTH_GRID + 2)

  return label
}

function addWaterFoam(scene, x, y) {
  const sprite = scene.add.sprite(x, y, WATER_FOAM_TEXTURE_KEY)

  sprite.setDepth(WATER_FOAM_DEPTH)
  sprite.play(WATER_FOAM_ANIMATION_KEY)

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
        continue
      }

      if (tile.terrain === 'grass') {
        const grassTile = resolveGrassTileIndex(tile.x, tile.y, tiles)

        if (FOAM_ANIMATION && grassTile.mask !== 15) {
          addWaterFoam(scene, x, y)
        }

        const sprite = scene.add.image(x, y, TERRAIN_TEXTURE_KEY, grassTile.tileIndex)

        if (DEBUG_MODE) {
          tile.debugMask = grassTile.mask
          addDebugTileLabel(scene, x, y, grassTile.mask, grassTile.tileIndex)
        }

        sprite.setDepth(DEPTH_GRID)
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
