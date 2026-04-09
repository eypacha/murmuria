import { DEPTH_GRID, TILE_SIZE } from '../../config/constants.js'

const GRASS_FILL = 0x4f8a3a
const GRASS_STROKE = 0x2f5d2a

export function renderGrid(scene, worldStore) {
  const graphics = scene.add.graphics()
  const tiles = worldStore.world.tiles

  graphics.fillStyle(GRASS_FILL, 1)
  graphics.lineStyle(1, GRASS_STROKE, 0.25)
  graphics.setDepth(DEPTH_GRID)

  for (const row of tiles) {
    for (const tile of row) {
      const x = tile.x * TILE_SIZE
      const y = tile.y * TILE_SIZE

      graphics.fillRect(x, y, TILE_SIZE, TILE_SIZE)
      graphics.strokeRect(x, y, TILE_SIZE, TILE_SIZE)
    }
  }

  return graphics
}
