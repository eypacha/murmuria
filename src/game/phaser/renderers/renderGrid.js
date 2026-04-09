import { DEPTH_GRID, TILE_SIZE } from '../../config/constants.js'

const GRASS_FRAME_INDEX = 10

export function renderGrid(scene, worldStore) {
  const tiles = worldStore.world.tiles

  for (const row of tiles) {
    for (const tile of row) {
      const x = tile.x * TILE_SIZE + TILE_SIZE / 2
      const y = tile.y * TILE_SIZE + TILE_SIZE / 2

      scene.add.image(x, y, 'terrain_tileset', GRASS_FRAME_INDEX).setDepth(DEPTH_GRID)
    }
  }
}
