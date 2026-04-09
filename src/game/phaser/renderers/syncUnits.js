import { TILE_SIZE } from '../../config/constants.js'

const PAWN_SCALE = TILE_SIZE / 192

export function syncUnits(scene, worldStore) {
  const villagers = worldStore.units.filter((unit) => unit.role === 'villager')

  return villagers.map((villager) => {
    const pos = villager.pos ?? villager.gridPos
    const x = pos.x * TILE_SIZE + TILE_SIZE / 2
    const y = pos.y * TILE_SIZE + TILE_SIZE
    const depth = y

    const sprite = scene.add.sprite(x, y, 'pawn_idle')
    sprite.setOrigin(0.5, 0.9)
    sprite.setScale(PAWN_SCALE)
    sprite.setDepth(depth)
    sprite.play('pawn_idle_anim')

    return sprite
  })
}
