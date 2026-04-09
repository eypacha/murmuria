function hasCarriedWood(pawn) {
  const woodCount = Number(pawn?.inventory?.wood ?? 0)

  if (woodCount > 0) {
    return true
  }

  const carrying = pawn?.carrying

  if (!carrying) {
    return false
  }

  if (carrying === 'wood') {
    return true
  }

  return carrying.type === 'wood' || carrying.resource === 'wood'
}

function hasEquippedAxe(pawn) {
  const equipment = pawn?.equipment

  if (!equipment) {
    return false
  }

  if (equipment === 'axe') {
    return true
  }

  const equippedItem = equipment.tool ?? equipment.type ?? equipment.name ?? equipment.item

  if (equippedItem === 'axe') {
    return true
  }

  return equipment.axe === true
}

function resolveIdleAnimation(pawn) {
  if (hasCarriedWood(pawn)) {
    return 'pawn-idle-wood'
  }

  if (hasEquippedAxe(pawn)) {
    return 'pawn-idle-axe'
  }

  return 'pawn-idle'
}

function resolveLegacyMovingAnimation(pawn) {
  const targetType = pawn?.target?.type

  if (targetType === 'tree') {
    return 'pawn-run-axe'
  }

  if (targetType === 'castle' || hasCarriedWood(pawn)) {
    return 'pawn-run-wood'
  }

  if (hasEquippedAxe(pawn)) {
    return 'pawn-run-axe'
  }

  return 'pawn-run'
}

export function resolvePawnAnimation(pawn) {
  const state = typeof pawn?.state === 'string' ? pawn.state : 'idle'

  if (state === 'moving_to_tree') {
    return 'pawn-run-axe'
  }

  if (state === 'gathering') {
    return 'pawn-interact-axe'
  }

  if (state === 'returning_to_castle') {
    return 'pawn-run-wood'
  }

  if (state === 'moving') {
    return resolveLegacyMovingAnimation(pawn)
  }

  return resolveIdleAnimation(pawn)
}
