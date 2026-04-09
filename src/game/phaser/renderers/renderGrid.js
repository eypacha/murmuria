import { DEBUG_MODE, DEPTH_GRID, TILE_SIZE } from '../../config/constants.js'

const GRASS_FRAME_INDEX = 10
const GRID_LINE_COLOR = 0x000000
const GRID_LINE_ALPHA = 0.35

export function renderGrid(scene, worldStore) {
  const tiles = worldStore.world.tiles
  const worldWidth = worldStore.world.width * TILE_SIZE
  const worldHeight = worldStore.world.height * TILE_SIZE

  for (const row of tiles) {
    for (const tile of row) {
      const x = tile.x * TILE_SIZE + TILE_SIZE / 2
      const y = tile.y * TILE_SIZE + TILE_SIZE / 2

      scene.add.image(x, y, 'terrain_tileset', GRASS_FRAME_INDEX).setDepth(DEPTH_GRID)
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
