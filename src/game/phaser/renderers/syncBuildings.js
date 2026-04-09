import { DEBUG_MODE, DEPTH_BUILDINGS, TILE_SIZE } from '../../config/constants.js'
import { getOccupiedTiles } from '../../core/getOccupiedTiles.js'

const CASTLE_DISPLAY_WIDTH = 320
const CASTLE_DISPLAY_HEIGHT = 256
const DEBUG_CASTLE_FILL = 0x5ad8ff
const DEBUG_CASTLE_STROKE = 0x5ad8ff
const DEBUG_CASTLE_DEPTH = DEPTH_BUILDINGS - 1

function drawDebugCastleTiles(scene, castle) {
  for (const tile of getOccupiedTiles(castle)) {
    const centerX = tile.x * TILE_SIZE + TILE_SIZE / 2
    const centerY = tile.y * TILE_SIZE + TILE_SIZE / 2

    const debugTile = scene.add.rectangle(
      centerX,
      centerY,
      TILE_SIZE,
      TILE_SIZE,
      DEBUG_CASTLE_FILL,
      0.12,
    )

    debugTile.setStrokeStyle(2, DEBUG_CASTLE_STROKE, 1)
    debugTile.setDepth(DEBUG_CASTLE_DEPTH)
  }
}

export function syncBuildings(scene, worldStore) {
  const castles = worldStore.buildings.filter((building) => building.type === 'castle')

  return castles.map((castle) => {
    const footprint = castle.footprint ?? { w: 1, h: 1 }
    const centerX = (castle.gridPos.x + footprint.w / 2) * TILE_SIZE
    const groundY = (castle.gridPos.y + footprint.h) * TILE_SIZE

    const sprite = scene.add.image(centerX, groundY, 'castle_blue')
    sprite.setOrigin(0.5, 1)
    sprite.setDisplaySize(CASTLE_DISPLAY_WIDTH, CASTLE_DISPLAY_HEIGHT)
    sprite.setDepth(DEPTH_BUILDINGS)

    if (DEBUG_MODE) {
      drawDebugCastleTiles(scene, castle)
    }

    return sprite
  })
}
