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
    return 'villager-idle-meat'
  }

  if (hasCarriedWood(unit)) {
    return 'villager-idle-wood'
  }

  if (hasCarriedGold(unit)) {
    return 'villager-idle-gold'
  }

  if (hasEquippedAxe(unit)) {
    return 'villager-idle-axe'
  }

  if (hasEquippedPickaxe(unit)) {
    return 'villager-idle-pickaxe'
  }

  if (hasEquippedKnife(unit)) {
    return 'villager-idle-knife'
  }

  return 'villager-idle'
}

function resolveMovingAnimation(unit) {
  const targetType = unit?.target?.type
  const workTargetType = unit?.workTargetType
  const isConstructionBuilder = Boolean(unit?.constructionBuild)

  if (targetType === 'castle') {
    if (hasCarriedMeat(unit) || workTargetType === 'sheep' || workTargetType === 'meat') {
      return 'villager-run-meat'
    }

    if (hasCarriedGold(unit) || workTargetType === 'gold') {
      return 'villager-run-gold'
    }

    if (hasCarriedWood(unit) || workTargetType === 'tree') {
      return 'villager-run-wood'
    }
  }

  if (targetType === 'tree' || workTargetType === 'tree') {
    return 'villager-run-axe'
  }

  if (targetType === 'gold' || workTargetType === 'gold') {
    return 'villager-run-pickaxe'
  }

  if (targetType === 'sheep' || targetType === 'meat' || workTargetType === 'sheep' || workTargetType === 'meat') {
    return 'villager-run-knife'
  }

  if (targetType === 'constructionSite' && isConstructionBuilder) {
    return 'villager-run-hammer'
  }

  if (hasCarriedMeat(unit)) {
    return 'villager-run-meat'
  }

  if (hasCarriedGold(unit)) {
    return 'villager-run-gold'
  }

  if (hasCarriedWood(unit)) {
    return 'villager-run-wood'
  }

  if (hasEquippedAxe(unit)) {
    return 'villager-run-axe'
  }

  if (hasEquippedPickaxe(unit)) {
    return 'villager-run-pickaxe'
  }

  return 'villager-run'
}

export function resolveUnitAnimation(unit) {
  const state = typeof unit?.state === 'string' ? unit.state : 'idle'
  const targetType = unit?.target?.type
  const workTargetType = unit?.workTargetType

  if (state === 'defending') {
    return 'villager-idle-knife'
  }

  if (state === 'preparing_to_gold') {
    return 'villager-idle-pickaxe'
  }

  if (state === 'preparing_to_tree') {
    return 'villager-idle-axe'
  }

  if (state === 'preparing_to_meat') {
    if (workTargetType === 'meat') {
      return 'villager-run'
    }

    return 'villager-idle-knife'
  }

  if (state === 'preparing_to_construction_site') {
    return 'villager-idle-hammer'
  }

  if (state === 'moving_to_tree') {
    return 'villager-run-axe'
  }

  if (state === 'moving_to_meat') {
    return workTargetType === 'meat' ? 'villager-run' : 'villager-run-knife'
  }

  if (state === 'moving_to_gold') {
    return 'villager-run-pickaxe'
  }

  if (state === 'moving_to_construction_site') {
    return 'villager-run-hammer'
  }

  if (state === 'reproducing' || state === 'spawning') {
    return resolveMovingAnimation(unit)
  }

  if (state === 'preparing_to_gather') {
    if (workTargetType === 'sheep' || workTargetType === 'meat') {
      return 'villager-idle-knife'
    }

    if (workTargetType === 'gold') {
      return 'villager-idle-pickaxe'
    }

    return 'villager-idle-axe'
  }

  if (state === 'gathering') {
    if (workTargetType === 'meat') {
      return 'villager-idle-meat'
    }

    if (workTargetType === 'sheep') {
      return 'villager-interact-knife'
    }

    if (workTargetType === 'gold') {
      return 'villager-interact-pickaxe'
    }

    return 'villager-interact-axe'
  }

  if (state === 'building') {
    return 'villager-interact-hammer'
  }

  if (
    state === 'preparing_to_return' ||
    state === 'gathering_complete' ||
    state === 'delivering_meat' ||
    state === 'delivering_wood' ||
    state === 'delivering_gold'
  ) {
    if (hasCarriedMeat(unit) || workTargetType === 'sheep' || workTargetType === 'meat' || state === 'delivering_meat') {
      return 'villager-idle-meat'
    }

    if (hasCarriedGold(unit) || workTargetType === 'gold' || state === 'delivering_gold') {
      return 'villager-idle-gold'
    }

    return 'villager-idle-wood'
  }

  if (state === 'returning_to_castle') {
    if (hasCarriedMeat(unit) || workTargetType === 'sheep' || workTargetType === 'meat') {
      return 'villager-run-meat'
    }

    if (hasCarriedGold(unit) || workTargetType === 'gold') {
      return 'villager-run-gold'
    }

    return 'villager-run-wood'
  }

  if (state === 'moving') {
    if (workTargetType === 'meat' || targetType === 'meat') {
      return 'villager-run'
    }

    return resolveMovingAnimation(unit)
  }

  return resolveIdleAnimation(unit)
}
