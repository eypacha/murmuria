import { DEBUG_MODE, TILE_SIZE, UNIT_RENDER_OFFSET_Y } from '../../config/constants.js'

const PAWN_DISPLAY_SIZE = 192
const DEBUG_UNIT_BORDER_COLOR = 0x5ad8ff

function getPawnAnimationKey(pawn) {
  return pawn.state === 'moving' ? 'pawn_run_anim' : 'pawn_idle_anim'
}

function isPawnFacingLeft(pawn) {
  return pawn.facing === 'left'
}

function drawDebugTileBorder(scene, gridX, gridY, depth) {
  const border = scene.add.graphics()

  border.lineStyle(2, DEBUG_UNIT_BORDER_COLOR, 1)
  border.setDepth(depth)
  border.strokeRect(gridX * TILE_SIZE, gridY * TILE_SIZE, TILE_SIZE, TILE_SIZE)
}

function getPawnWorldPosition(pawn) {
  if (pawn.pos) {
    return pawn.pos
  }

  if (!pawn.gridPos) {
    return { x: 0, y: 0 }
  }

  return {
    x: pawn.gridPos.x * TILE_SIZE + TILE_SIZE / 2,
    y: pawn.gridPos.y * TILE_SIZE + TILE_SIZE / 2,
  }
}

export function syncUnits(scene, worldStore) {
  const pawns = worldStore.units.filter((unit) => unit.role === 'pawn')

  return pawns.map((pawn) => {
    const pos = getPawnWorldPosition(pawn)
    const x = pos.x
    const y = pos.y + UNIT_RENDER_OFFSET_Y
    const depth = y
    const animationKey = getPawnAnimationKey(pawn)
    const facingLeft = isPawnFacingLeft(pawn)

    const sprite = scene.add.sprite(x, y, 'pawn_idle')
    sprite.setOrigin(0.5, 0.9)
    sprite.setDisplaySize(PAWN_DISPLAY_SIZE, PAWN_DISPLAY_SIZE)
    sprite.setFlipX(facingLeft)
    sprite.setDepth(depth)
    sprite.play(animationKey)
    sprite.setData('entityId', pawn.id)
    sprite.setData('targetX', x)
    sprite.setData('targetY', y)
    sprite.setData('movementStartX', x)
    sprite.setData('movementStartY', y)
    sprite.setData('movementElapsed', 0)

    if (DEBUG_MODE) {
      drawDebugTileBorder(scene, pawn.gridPos.x, pawn.gridPos.y, depth - 1)
    }

    return sprite
  })
}
