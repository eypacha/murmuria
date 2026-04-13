import { DEBUG_MODE, TILE_SIZE, UNIT_RENDER_OFFSET_Y } from '../../config/constants.js'

const VILLAGER_DISPLAY_SIZE = 192
const CHILD_UNIT_SCALE = 0.6
const DEBUG_UNIT_BORDER_COLOR = 0x5ad8ff

function getUnitAnimationKey(unit) {
  return unit.state === 'moving' ? 'villager-run' : 'villager-idle'
}

function isUnitFacingLeft(unit) {
  return unit.facing === 'left'
}

function drawDebugTileBorder(scene, gridX, gridY, depth) {
  const border = scene.add.graphics()

  border.lineStyle(2, DEBUG_UNIT_BORDER_COLOR, 1)
  border.setDepth(depth)
  border.strokeRect(gridX * TILE_SIZE, gridY * TILE_SIZE, TILE_SIZE, TILE_SIZE)
}

function getUnitWorldPosition(unit) {
  if (unit.pos) {
    return unit.pos
  }

  if (!unit.gridPos) {
    return { x: 0, y: 0 }
  }

  return {
    x: unit.gridPos.x * TILE_SIZE + TILE_SIZE / 2,
    y: unit.gridPos.y * TILE_SIZE + TILE_SIZE / 2,
  }
}

export function syncUnits(scene, worldStore) {
  const units = worldStore.units.filter((unit) => unit.role === 'villager')

  return units.map((unit) => {
    const pos = getUnitWorldPosition(unit)
    const x = pos.x
    const y = pos.y + UNIT_RENDER_OFFSET_Y
    const depth = y
    const animationKey = getUnitAnimationKey(unit)
    const facingLeft = isUnitFacingLeft(unit)

    const sprite = scene.add.sprite(x, y, 'villager-idle')
    sprite.setOrigin(0.5, 0.9)
    sprite.setDisplaySize(VILLAGER_DISPLAY_SIZE, VILLAGER_DISPLAY_SIZE)
    sprite.setScale(unit.isChild ? CHILD_UNIT_SCALE : 1)
    sprite.setFlipX(facingLeft)
    sprite.setDepth(depth)
    sprite.play(animationKey)
    sprite.setData('entityId', unit.id)
    sprite.setData('targetX', x)
    sprite.setData('targetY', y)
    sprite.setData('movementStartX', x)
    sprite.setData('movementStartY', y)
    sprite.setData('movementElapsed', 0)

    if (DEBUG_MODE) {
      drawDebugTileBorder(scene, unit.gridPos.x, unit.gridPos.y, depth - 1)
    }

    return sprite
  })
}
