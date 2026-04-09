import { DEPTH_BUILDINGS, TILE_SIZE } from '../../config/constants.js'

const CASTLE_FILL = 0xd6d3d1
const CASTLE_STROKE = 0x334155

export function syncBuildings(scene, worldStore) {
  const castles = worldStore.buildings.filter((building) => building.type === 'castle')

  return castles.map((castle) => {
    const centerX = castle.gridPos.x * TILE_SIZE + TILE_SIZE / 2
    const centerY = castle.gridPos.y * TILE_SIZE + TILE_SIZE / 2

    const shape = scene.add.rectangle(
      centerX,
      centerY,
      TILE_SIZE * 0.86,
      TILE_SIZE * 0.86,
      CASTLE_FILL,
    )

    shape.setStrokeStyle(3, CASTLE_STROKE, 1)
    shape.setDepth(DEPTH_BUILDINGS)

    return shape
  })
}
