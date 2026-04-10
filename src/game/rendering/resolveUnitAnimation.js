function hasCarriedWood(unit) {
  const woodCount = Number(unit?.inventory?.wood ?? 0)

  if (woodCount > 0) {
    return true
  }

  const carrying = unit?.carrying

  if (!carrying) {
    return false
  }

  if (carrying === 'wood') {
    return true
  }

  return carrying.type === 'wood' || carrying.resource === 'wood'
}

function hasCarriedGold(unit) {
  const goldCount = Number(unit?.inventory?.gold ?? 0)

  if (goldCount > 0) {
    return true
  }

  const carrying = unit?.carrying

  if (!carrying) {
    return false
  }

  if (carrying === 'gold') {
    return true
  }

  return carrying.type === 'gold' || carrying.resource === 'gold'
}

function hasCarriedMeat(unit) {
  const meatCount = Number(unit?.inventory?.meat ?? 0)

  if (meatCount > 0) {
    return true
  }

  const carrying = unit?.carrying

  if (!carrying) {
    return false
  }

  if (carrying === 'meat') {
    return true
  }

  return carrying.type === 'meat' || carrying.resource === 'meat'
}

function hasEquippedAxe(unit) {
  const equipment = unit?.equipment

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

function hasEquippedPickaxe(unit) {
  const equipment = unit?.equipment

  if (!equipment) {
    return false
  }

  const equippedItem = equipment.tool ?? equipment.type ?? equipment.name ?? equipment.item

  if (equippedItem === 'pickaxe') {
    return true
  }

  return equipment.pickaxe === true
}

function hasEquippedKnife(unit) {
  const equipment = unit?.equipment

  if (!equipment) {
    return false
  }

  if (equipment === 'knife') {
    return true
  }

  const equippedItem = equipment.tool ?? equipment.type ?? equipment.name ?? equipment.item

  if (equippedItem === 'knife') {
    return true
  }

  return equipment.knife === true
}

function resolveIdleAnimation(unit) {
  if (hasCarriedMeat(unit)) {
    return 'pawn-idle-meat'
  }

  if (hasCarriedWood(unit)) {
    return 'pawn-idle-wood'
  }

  if (hasCarriedGold(unit)) {
    return 'pawn-idle-gold'
  }

  if (hasEquippedAxe(unit)) {
    return 'pawn-idle-axe'
  }

  if (hasEquippedPickaxe(unit)) {
    return 'pawn-idle-pickaxe'
  }

  if (hasEquippedKnife(unit)) {
    return 'pawn-idle-knife'
  }

  return 'pawn-idle'
}

function resolveMovingAnimation(unit) {
  const targetType = unit?.target?.type
  const workTargetType = unit?.workTargetType

  if (targetType === 'castle') {
    if (hasCarriedMeat(unit) || workTargetType === 'sheep') {
      return 'pawn-run-meat'
    }

    if (hasCarriedGold(unit) || workTargetType === 'gold') {
      return 'pawn-run-gold'
    }

    if (hasCarriedWood(unit) || workTargetType === 'tree') {
      return 'pawn-run-wood'
    }
  }

  if (targetType === 'tree' || workTargetType === 'tree') {
    return 'pawn-run-axe'
  }

  if (targetType === 'gold' || workTargetType === 'gold') {
    return 'pawn-run-pickaxe'
  }

  if (targetType === 'sheep' || workTargetType === 'sheep') {
    return 'pawn-run-knife'
  }

  if (hasCarriedMeat(unit)) {
    return 'pawn-run-meat'
  }

  if (hasCarriedGold(unit)) {
    return 'pawn-run-gold'
  }

  if (hasCarriedWood(unit)) {
    return 'pawn-run-wood'
  }

  if (hasEquippedAxe(unit)) {
    return 'pawn-run-axe'
  }

  if (hasEquippedPickaxe(unit)) {
    return 'pawn-run-pickaxe'
  }

  return 'pawn-run'
}

export function resolveUnitAnimation(unit) {
  const state = typeof unit?.state === 'string' ? unit.state : 'idle'
  const workTargetType = unit?.workTargetType

  if (state === 'preparing_to_gold') {
    return 'pawn-idle-pickaxe'
  }

  if (state === 'preparing_to_tree') {
    return 'pawn-idle-axe'
  }

  if (state === 'preparing_to_meat') {
    return 'pawn-idle-knife'
  }

  if (state === 'moving_to_tree') {
    return 'pawn-run-axe'
  }

  if (state === 'moving_to_meat') {
    return 'pawn-run-knife'
  }

  if (state === 'moving_to_gold') {
    return 'pawn-run-pickaxe'
  }

  if (state === 'preparing_to_gather') {
    if (workTargetType === 'sheep') {
      return 'pawn-idle-knife'
    }

    if (workTargetType === 'gold') {
      return 'pawn-idle-pickaxe'
    }

    return 'pawn-idle-axe'
  }

  if (state === 'gathering') {
    if (workTargetType === 'sheep') {
      return 'pawn-interact-knife'
    }

    if (workTargetType === 'gold') {
      return 'pawn-interact-pickaxe'
    }

    return 'pawn-interact-axe'
  }

  if (
    state === 'preparing_to_return' ||
    state === 'gathering_complete' ||
    state === 'delivering_meat' ||
    state === 'delivering_wood' ||
    state === 'delivering_gold'
  ) {
    if (hasCarriedMeat(pawn) || workTargetType === 'sheep' || state === 'delivering_meat') {
      return 'pawn-idle-meat'
    }

    if (hasCarriedGold(pawn) || workTargetType === 'gold' || state === 'delivering_gold') {
      return 'pawn-idle-gold'
    }

    return 'pawn-idle-wood'
  }

  if (state === 'returning_to_castle') {
    if (hasCarriedMeat(pawn) || workTargetType === 'sheep') {
      return 'pawn-run-meat'
    }

    if (hasCarriedGold(pawn) || workTargetType === 'gold') {
      return 'pawn-run-gold'
    }

    return 'pawn-run-wood'
  }

  if (state === 'moving') {
    return resolveMovingAnimation(pawn)
  }

  return resolveIdleAnimation(unit)
}
