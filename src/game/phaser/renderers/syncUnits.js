import { DEPTH_UNITS, TILE_SIZE } from '../../config/constants.js'

const VILLAGER_COLORS = [0xf59e0b, 0x38bdf8, 0xfb7185]

export function syncUnits(scene, worldStore) {
  const villagers = worldStore.units.filter((unit) => unit.role === 'villager')

  return villagers.map((villager, index) => {
    const pos = villager.pos ?? villager.gridPos
    const centerX = pos.x * TILE_SIZE + TILE_SIZE / 2
    const centerY = pos.y * TILE_SIZE + TILE_SIZE / 2
    const color = VILLAGER_COLORS[index % VILLAGER_COLORS.length]

    const shape = scene.add.circle(centerX, centerY, TILE_SIZE * 0.16, color)

    shape.setStrokeStyle(2, 0xffffff, 0.65)
    shape.setDepth(DEPTH_UNITS)

    return shape
  })
}
