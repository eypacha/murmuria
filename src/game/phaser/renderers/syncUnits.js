import { DEBUG_MODE, TILE_SIZE, UNIT_RENDER_OFFSET_Y } from '../../config/constants.js'

const PAWN_DISPLAY_SIZE = 192
const DEBUG_UNIT_BORDER_COLOR = 0x5ad8ff

function drawDebugTileBorder(scene, gridX, gridY, depth) {
  const border = scene.add.graphics()

  border.lineStyle(2, DEBUG_UNIT_BORDER_COLOR, 1)
  border.setDepth(depth)
  border.strokeRect(gridX * TILE_SIZE, gridY * TILE_SIZE, TILE_SIZE, TILE_SIZE)
}

export function syncUnits(scene, worldStore) {
  const pawns = worldStore.units.filter((unit) => unit.role === 'pawn')

  return pawns.map((pawn) => {
    const pos = pawn.pos ?? pawn.gridPos
    const x = pos.x * TILE_SIZE + TILE_SIZE / 2
    const y = pos.y * TILE_SIZE + TILE_SIZE + UNIT_RENDER_OFFSET_Y
    const depth = y

    const sprite = scene.add.sprite(x, y, 'pawn_idle')
    sprite.setOrigin(0.5, 0.9)
    sprite.setDisplaySize(PAWN_DISPLAY_SIZE, PAWN_DISPLAY_SIZE)
    sprite.setDepth(depth)
    sprite.play('pawn_idle_anim')

    if (DEBUG_MODE) {
      drawDebugTileBorder(scene, pos.x, pos.y, depth - 1)
    }

    return sprite
  })
}
