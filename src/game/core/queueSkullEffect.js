function getEntityTile(entity) {
  if (entity?.gridPos && Number.isFinite(entity.gridPos.x) && Number.isFinite(entity.gridPos.y)) {
    return entity.gridPos
  }

  return null
}

function getDeathFacing(entity) {
  if (entity?.facing === 'left' || entity?.facing === 'right') {
    return entity.facing
  }

  if (entity?.interactionFacing === 'left' || entity?.interactionFacing === 'right') {
    return entity.interactionFacing
  }

  return 'right'
}

export function queueSkullEffect(worldStore, entity, currentTick) {
  if (!worldStore) {
    return
  }

  worldStore.pendingSkullEffects = worldStore.pendingSkullEffects ?? []
  const tile = getEntityTile(entity)

  if (!tile) {
    return
  }

  worldStore.pendingSkullEffects.push({
    id: `skull-${entity.id}-${currentTick}`,
    type: 'skull',
    x: tile.x,
    y: tile.y,
    facing: getDeathFacing(entity),
    createdTick: currentTick,
  })
}
