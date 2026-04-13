import {
  CHILD_GROW_DURATION_TICKS,
  REPRODUCTION_COOLDOWN_TICKS,
  REPRODUCTION_DURATION_TICKS,
  REPRODUCTION_FOOD_THRESHOLD_PER_UNIT,
  REPRODUCTION_SEARCH_RADIUS_TILES,
  TILE_SIZE,
} from '../../config/constants.js'
import { getOccupiedTiles } from '../../core/getOccupiedTiles.js'
import { findPath } from '../../core/findPath.js'
import { createVillager } from '../../domain/factories/createVillager.js'

function getTick(worldStore) {
  return worldStore?.tick ?? 0
}

function getTileKey(tile) {
  return `${tile.x}:${tile.y}`
}

function getHouseReproductionTiles(house) {
  if (!house?.gridPos) {
    return null
  }

  return {
    left: {
      x: house.gridPos.x,
      y: house.gridPos.y - 1,
    },
    right: {
      x: house.gridPos.x + 1,
      y: house.gridPos.y - 1,
    },
  }
}

function getHouseReproductionVisualPosition(house) {
  const tiles = getHouseReproductionTiles(house)

  if (!tiles?.left || !tiles?.right) {
    return null
  }

  return {
    x: house.gridPos.x * TILE_SIZE + TILE_SIZE,
    y: house.gridPos.y * TILE_SIZE + TILE_SIZE,
  }
}

function getUnitGridTile(unit) {
  if (unit?.gridPos && Number.isFinite(unit.gridPos.x) && Number.isFinite(unit.gridPos.y)) {
    return unit.gridPos
  }

  return null
}

function isUnitAvailableForReproduction(unit, currentTick) {
  if (!unit || unit.kind !== 'unit') {
    return false
  }

  if (unit.role !== 'villager') {
    return false
  }

  if (unit.isChild) {
    return false
  }

  if (unit.state !== 'idle') {
    return false
  }

  if (unit.reproductionTaskId) {
    return false
  }

  const lastReproduceTick = unit.lastReproduceTick

  if (Number.isFinite(lastReproduceTick) && currentTick - lastReproduceTick < REPRODUCTION_COOLDOWN_TICKS) {
    return false
  }

  if (unit.constructionDelivery || unit.constructionBuild) {
    return false
  }

  return true
}

function getPopulation(worldStore) {
  return (worldStore?.units ?? []).filter((unit) => unit?.kind === 'unit').length
}

function getHouseCount(worldStore) {
  return (worldStore?.houses ?? []).length
}

function getOngoingReproductions(worldStore) {
  if (!Array.isArray(worldStore?.ongoingReproductions)) {
    worldStore.ongoingReproductions = []
  }

  return worldStore.ongoingReproductions
}

function getAvailableHouses(worldStore) {
  const houseCount = getHouseCount(worldStore)
  const ongoingCount = getOngoingReproductions(worldStore).length

  return Math.max(0, houseCount - ongoingCount)
}

function getGlobalFoodThreshold(worldStore) {
  const population = getPopulation(worldStore)

  return population * REPRODUCTION_FOOD_THRESHOLD_PER_UNIT
}

function canReproduceGlobally(worldStore) {
  const kingdom = worldStore?.kingdom
  const currentFood = Number(kingdom?.resources?.meat ?? 0)
  const housingCapacity = Number(kingdom?.housingCapacity ?? 0)
  const population = getPopulation(worldStore)
  const houseCount = getHouseCount(worldStore)
  const ongoingCount = getOngoingReproductions(worldStore).length
  const availableHouses = Math.max(0, houseCount - ongoingCount)

  return (
    currentFood > getGlobalFoodThreshold(worldStore) &&
    housingCapacity >= population &&
    availableHouses > 0
  )
}

function getIdleUnitCount(worldStore) {
  return (worldStore?.units ?? []).filter((unit) => {
    return unit?.kind === 'unit' && unit?.state === 'idle'
  }).length
}

function getHouseDistanceScore(unit, partner, house) {
  const unitTile = getUnitGridTile(unit)
  const partnerTile = getUnitGridTile(partner)
  const targets = getHouseReproductionTiles(house)

  if (!unitTile || !partnerTile || !targets) {
    return Number.POSITIVE_INFINITY
  }

  const midpoint = {
    x: (unitTile.x + partnerTile.x) / 2,
    y: (unitTile.y + partnerTile.y) / 2,
  }

  const leftScore = Math.hypot(midpoint.x - targets.left.x, midpoint.y - targets.left.y)
  const rightScore = Math.hypot(midpoint.x - targets.right.x, midpoint.y - targets.right.y)

  return Math.min(leftScore, rightScore)
}

function getBestReproductionAssignment(worldStore, unit, partner, house) {
  const unitTile = getUnitGridTile(unit)
  const partnerTile = getUnitGridTile(partner)
  const targets = getHouseReproductionTiles(house)

  if (!unitTile || !partnerTile || !targets?.left || !targets?.right) {
    return null
  }

  const occupiedTiles = new Set()

  for (const entity of [
    ...(worldStore?.buildings ?? []),
    ...(worldStore?.constructionSites ?? []),
    ...(worldStore?.houses ?? []),
    ...(worldStore?.resources ?? []),
    ...(worldStore?.decorations ?? []),
  ]) {
    if (!entity?.gridPos) {
      continue
    }

    for (const tile of getOccupiedTiles(entity)) {
      occupiedTiles.add(getTileKey(tile))
    }
  }

  const leftTile = targets.left
  const rightTile = targets.right
  const directUnitPath = findPath(worldStore, unitTile, leftTile)
  const directPartnerPath = findPath(worldStore, partnerTile, rightTile)
  const swappedUnitPath = findPath(worldStore, unitTile, rightTile)
  const swappedPartnerPath = findPath(worldStore, partnerTile, leftTile)

  const directValid =
    (unitTile.x === leftTile.x && unitTile.y === leftTile.y || directUnitPath.length > 0) &&
    (partnerTile.x === rightTile.x && partnerTile.y === rightTile.y || directPartnerPath.length > 0) &&
    !occupiedTiles.has(getTileKey(leftTile)) &&
    !occupiedTiles.has(getTileKey(rightTile))

  const swappedValid =
    (unitTile.x === rightTile.x && unitTile.y === rightTile.y || swappedUnitPath.length > 0) &&
    (partnerTile.x === leftTile.x && partnerTile.y === leftTile.y || swappedPartnerPath.length > 0) &&
    !occupiedTiles.has(getTileKey(leftTile)) &&
    !occupiedTiles.has(getTileKey(rightTile))

  if (!directValid && !swappedValid) {
    return null
  }

  if (directValid && !swappedValid) {
    return {
      unitTargetTile: leftTile,
      partnerTargetTile: rightTile,
    }
  }

  if (!directValid && swappedValid) {
    return {
      unitTargetTile: rightTile,
      partnerTargetTile: leftTile,
    }
  }

  const directScore = (directUnitPath.length ?? 0) + (directPartnerPath.length ?? 0)
  const swappedScore = (swappedUnitPath.length ?? 0) + (swappedPartnerPath.length ?? 0)

  if (directScore <= swappedScore) {
    return {
      unitTargetTile: leftTile,
      partnerTargetTile: rightTile,
    }
  }

  return {
    unitTargetTile: rightTile,
    partnerTargetTile: leftTile,
  }
}

export class ReproductionSystem {
  static update(worldStore) {
    const tasks = [...getOngoingReproductions(worldStore)]
    const currentTick = getTick(worldStore)

    for (const task of tasks) {
      this.updateTask(worldStore, task, currentTick)
    }
  }

  static updateTask(worldStore, task, currentTick) {
    if (!task?.id) {
      return
    }

    const house = (worldStore?.houses ?? []).find((candidate) => candidate?.id === task.houseId) ?? null
    const unitsById = new Map((worldStore?.units ?? []).map((unit) => [unit.id, unit]))
    const unitA = unitsById.get(task.unitIds?.[0] ?? null) ?? null
    const unitB = unitsById.get(task.unitIds?.[1] ?? null) ?? null

    if (!house || house.reproductionTaskId !== task.id || !unitA || !unitB) {
      this.cancelTask(worldStore, task, currentTick)
      return
    }

    if (
      unitA.reproductionTaskId !== task.id ||
      unitB.reproductionTaskId !== task.id ||
      unitA.isChild ||
      unitB.isChild
    ) {
      this.cancelTask(worldStore, task, currentTick)
      return
    }

    const targetAssignment = getBestReproductionAssignment(worldStore, unitA, unitB, house)

    if (!targetAssignment) {
      this.cancelTask(worldStore, task, currentTick)
      return
    }

    const unitATile = getUnitGridTile(unitA)
    const unitBTile = getUnitGridTile(unitB)
    const unitATargetTile = task.unitTargetTiles?.[0] ?? targetAssignment.unitTargetTile
    const unitBTargetTile = task.unitTargetTiles?.[1] ?? targetAssignment.partnerTargetTile

    if (!unitATile || !unitBTile || !unitATargetTile || !unitBTargetTile) {
      this.cancelTask(worldStore, task, currentTick)
      return
    }

    const atTarget =
      unitATile.x === unitATargetTile.x &&
      unitATile.y === unitATargetTile.y &&
      unitBTile.x === unitBTargetTile.x &&
      unitBTile.y === unitBTargetTile.y

    if (!atTarget) {
      return
    }

    if (task.startedTick == null) {
      task.startedTick = currentTick
      task.finishTick = currentTick + REPRODUCTION_DURATION_TICKS
      const visualPosition = getHouseReproductionVisualPosition(house)
      unitA.reproductionOriginPos = unitA.pos ? { ...unitA.pos } : null
      unitB.reproductionOriginPos = unitB.pos ? { ...unitB.pos } : null
      unitA.state = 'reproducing'
      unitB.state = 'reproducing'
      unitA.reproductionReadyTick = currentTick
      unitB.reproductionReadyTick = currentTick
      unitA.reproductionUntilTick = task.finishTick
      unitB.reproductionUntilTick = task.finishTick
      if (visualPosition) {
        unitA.pos = { ...visualPosition }
        unitB.pos = { ...visualPosition }
      }
      return
    }

    if (currentTick < Number(task.finishTick ?? 0)) {
      return
    }

    this.completeTask(worldStore, task, currentTick)
  }

  static completeTask(worldStore, task, currentTick) {
    const house = (worldStore?.houses ?? []).find((candidate) => candidate?.id === task.houseId) ?? null
    const unitsById = new Map((worldStore?.units ?? []).map((unit) => [unit.id, unit]))
    const unitA = unitsById.get(task.unitIds?.[0] ?? null) ?? null
    const unitB = unitsById.get(task.unitIds?.[1] ?? null) ?? null
    const parent = unitA ?? unitB

    if (!house || house.reproductionTaskId !== task.id || !unitA || !unitB || !parent) {
      this.cancelTask(worldStore, task, currentTick)
      return
    }

    const spawnTile = getUnitGridTile(parent) ?? house.gridPos
    const visualPosition = getHouseReproductionVisualPosition(house) ?? {
      x: spawnTile.x * TILE_SIZE + TILE_SIZE / 2,
      y: spawnTile.y * TILE_SIZE + TILE_SIZE / 2,
    }
    const child = createVillager(spawnTile.x, spawnTile.y, parent.facing ?? 'right', {
      isChild: true,
      growAtTick: currentTick + CHILD_GROW_DURATION_TICKS,
      state: 'spawning',
      visualPos: { ...visualPosition },
      reproductionTaskId: null,
      reproductionHouseId: null,
      reproductionPartnerId: null,
      reproductionReadyTick: null,
      reproductionUntilTick: null,
      lastReproduceTick: null,
    })

    child.gridPos = { x: spawnTile.x, y: spawnTile.y }
    child.pos = { ...visualPosition }
    child.stateUntilTick = currentTick + 1
    child.nextState = 'idle'

    worldStore.units = worldStore.units ?? []
    worldStore.units.push(child)

    this.resetUnitAfterReproduction(unitA, currentTick)
    this.resetUnitAfterReproduction(unitB, currentTick)

    this.releaseHouse(worldStore, house)
    this.removeTask(worldStore, task.id)
  }

  static resetUnitAfterReproduction(unit, currentTick) {
    if (!unit) {
      return
    }

    unit.state = 'idle'
    unit.idleSince = currentTick
    unit.intent = null
    unit.target = null
    unit.targetId = null
    unit.workTargetId = null
    unit.workTargetType = null
    unit.workTargetTile = null
    unit.constructionDelivery = null
    unit.constructionBuild = null
    unit.interactionFacing = null
    unit.stateUntilTick = null
    unit.nextState = null
    unit.path = []
    unit.pathGoalKey = null
    unit.reproductionTaskId = null
    unit.reproductionHouseId = null
    unit.reproductionPartnerId = null
    unit.reproductionReadyTick = null
    unit.reproductionUntilTick = null
    unit.reproductionOriginPos = null
    unit.visualPos = null
    unit.lastReproduceTick = currentTick
    unit.decisionLockUntilTick = currentTick + 1
  }

  static cancelTask(worldStore, task, currentTick) {
    const unitsById = new Map((worldStore?.units ?? []).map((unit) => [unit.id, unit]))

    for (const unitId of task?.unitIds ?? []) {
      const unit = unitsById.get(unitId)

      if (!unit) {
        continue
      }

      unit.state = 'idle'
      unit.idleSince = currentTick
      unit.intent = null
      unit.target = null
      unit.targetId = null
      unit.workTargetId = null
      unit.workTargetType = null
      unit.workTargetTile = null
      unit.constructionDelivery = null
      unit.constructionBuild = null
      unit.interactionFacing = null
      unit.stateUntilTick = null
      unit.nextState = null
      unit.path = []
      unit.pathGoalKey = null
      unit.reproductionTaskId = null
      unit.reproductionHouseId = null
      unit.reproductionPartnerId = null
      unit.reproductionReadyTick = null
      unit.reproductionUntilTick = null
      if (unit.reproductionOriginPos) {
        unit.pos = { ...unit.reproductionOriginPos }
      }
      unit.reproductionOriginPos = null
      unit.visualPos = null
      unit.decisionLockUntilTick = currentTick + 1
    }

    const house = (worldStore?.houses ?? []).find((candidate) => candidate?.id === task?.houseId) ?? null

    if (house?.reproductionTaskId === task?.id) {
      house.reproductionTaskId = null
    }

    this.removeTask(worldStore, task?.id)
  }

  static cancelUnitParticipation(worldStore, unit, currentTick = getTick(worldStore)) {
    if (!unit) {
      return
    }

    const taskId = unit.reproductionTaskId

    if (!taskId) {
      unit.state = unit.state === 'dead' ? 'dead' : 'idle'
      unit.idleSince = currentTick
      unit.intent = null
      unit.target = null
      unit.targetId = null
      unit.workTargetId = null
      unit.workTargetType = null
      unit.workTargetTile = null
      unit.path = []
      unit.pathGoalKey = null
      unit.reproductionTaskId = null
      unit.reproductionHouseId = null
      unit.reproductionPartnerId = null
      unit.reproductionReadyTick = null
      unit.reproductionUntilTick = null
      if (unit.reproductionOriginPos) {
        unit.pos = { ...unit.reproductionOriginPos }
      }
      unit.reproductionOriginPos = null
      unit.visualPos = null
      return
    }

    const task = getOngoingReproductions(worldStore).find((candidate) => candidate?.id === taskId)

    if (task) {
      this.cancelTask(worldStore, task, currentTick)
      return
    }

    unit.state = 'idle'
    unit.idleSince = currentTick
    unit.intent = null
    unit.target = null
    unit.targetId = null
    unit.workTargetId = null
    unit.workTargetType = null
    unit.workTargetTile = null
    unit.interactionFacing = null
    unit.stateUntilTick = null
    unit.nextState = null
    unit.path = []
    unit.pathGoalKey = null
    unit.reproductionTaskId = null
    unit.reproductionHouseId = null
    unit.reproductionPartnerId = null
    unit.reproductionReadyTick = null
    unit.reproductionUntilTick = null
    unit.reproductionOriginPos = null
    unit.visualPos = null
    unit.decisionLockUntilTick = currentTick + 1
  }

  static removeTask(worldStore, taskId) {
    if (!taskId || !Array.isArray(worldStore?.ongoingReproductions)) {
      return
    }

    worldStore.ongoingReproductions = worldStore.ongoingReproductions.filter((task) => task?.id !== taskId)
  }

  static releaseHouse(worldStore, house) {
    if (!house) {
      return
    }

    if (house.reproductionTaskId) {
      house.reproductionTaskId = null
    }
  }

  static getHouseCount(worldStore) {
    return getHouseCount(worldStore)
  }

  static getOngoingReproductions(worldStore) {
    return getOngoingReproductions(worldStore)
  }

  static getAvailableHouses(worldStore) {
    return getAvailableHouses(worldStore)
  }

  static canReproduceGlobally(worldStore) {
    return canReproduceGlobally(worldStore)
  }

  static isEligibleReproductionCandidate(unit, worldStore, currentTick = getTick(worldStore)) {
    return isUnitAvailableForReproduction(unit, currentTick) && canReproduceGlobally(worldStore)
  }

  static getReproductionContext(worldStore) {
    const currentTick = getTick(worldStore)
    const houseCount = getHouseCount(worldStore)
    const ongoingReproductions = getOngoingReproductions(worldStore).length
    const availableHouses = Math.max(0, houseCount - ongoingReproductions)
    const population = getPopulation(worldStore)
    const idleUnits = getIdleUnitCount(worldStore)
    const housingCapacity = Number(worldStore?.kingdom?.housingCapacity ?? 0)
    const currentFood = Number(worldStore?.kingdom?.resources?.meat ?? 0)
    const hungerThreshold = getGlobalFoodThreshold(worldStore)

    return {
      currentTick,
      houseCount,
      ongoingReproductions,
      availableHouses,
      population,
      idleUnits,
      housingCapacity,
      currentFood,
      hungerThreshold,
      canReproduce: currentFood > hungerThreshold && housingCapacity >= population && availableHouses > 0,
    }
  }

  static findAvailablePartner(unit, worldStore, claimedUnitIds = new Set()) {
    const currentTick = getTick(worldStore)
    const unitTile = getUnitGridTile(unit)

    if (!unitTile || !isUnitAvailableForReproduction(unit, currentTick)) {
      return null
    }

    let bestPartner = null
    let bestDistance = Number.POSITIVE_INFINITY

    for (const candidate of worldStore?.units ?? []) {
      if (candidate?.id === unit.id) {
        continue
      }

      if (claimedUnitIds.has(candidate.id)) {
        continue
      }

      if (!isUnitAvailableForReproduction(candidate, currentTick)) {
        continue
      }

      const candidateTile = getUnitGridTile(candidate)

      if (!candidateTile) {
        continue
      }

      const distance = Math.hypot(candidateTile.x - unitTile.x, candidateTile.y - unitTile.y)

      if (distance > REPRODUCTION_SEARCH_RADIUS_TILES) {
        continue
      }

      if (distance < bestDistance || (distance === bestDistance && candidate.id < (bestPartner?.id ?? ''))) {
        bestPartner = candidate
        bestDistance = distance
      }
    }

    return bestPartner
  }

  static findAvailableHouse(unit, partner, worldStore, claimedHouseIds = new Set()) {
    if (!unit || !partner) {
      return null
    }

    const unitTile = getUnitGridTile(unit)
    const partnerTile = getUnitGridTile(partner)

    if (!unitTile || !partnerTile) {
      return null
    }

    let bestHouse = null
    let bestScore = Number.POSITIVE_INFINITY

    for (const house of worldStore?.houses ?? []) {
      if (!house?.gridPos) {
        continue
      }

      if (house.reproductionTaskId) {
        continue
      }

      if (claimedHouseIds.has(house.id)) {
        continue
      }

      const targetAssignment = getBestReproductionAssignment(worldStore, unit, partner, house)

      if (!targetAssignment) {
        continue
      }

      const unitPath = findPath(worldStore, unitTile, targetAssignment.unitTargetTile)
      const partnerPath = findPath(worldStore, partnerTile, targetAssignment.partnerTargetTile)
      const score = (unitPath.length ?? 0) + (partnerPath.length ?? 0)

      if (score < bestScore) {
        bestScore = score
        bestHouse = house
      }
    }

    return bestHouse
  }

  static buildIntent(unit, worldStore, claimedUnitIds = new Set(), claimedHouseIds = new Set()) {
    if (!this.isEligibleReproductionCandidate(unit, worldStore)) {
      return null
    }

    if (!canReproduceGlobally(worldStore)) {
      return null
    }

    const partner = this.findAvailablePartner(unit, worldStore, claimedUnitIds)

    if (!partner) {
      return null
    }

    const house = this.findAvailableHouse(unit, partner, worldStore, claimedHouseIds)

    if (!house) {
      return null
    }

    const targetAssignment = getBestReproductionAssignment(worldStore, unit, partner, house)

    if (!targetAssignment) {
      return null
    }

    return {
      type: 'reproduce',
      targetId: house.id,
      targetPos: targetAssignment.unitTargetTile,
      partnerId: partner.id,
      houseId: house.id,
      unitTargetTile: targetAssignment.unitTargetTile,
      partnerTargetTile: targetAssignment.partnerTargetTile,
      createdTick: getTick(worldStore),
    }
  }

  static tryStartReproduction(unit, worldStore, intent, currentTick, claimedUnitIds = new Set(), claimedHouseIds = new Set()) {
    if (!unit || !intent?.partnerId || !intent?.houseId) {
      return false
    }

    if (!this.isEligibleReproductionCandidate(unit, worldStore, currentTick)) {
      return false
    }

    if (!canReproduceGlobally(worldStore)) {
      return false
    }

    const partner = (worldStore?.units ?? []).find((candidate) => candidate?.id === intent.partnerId) ?? null
    const house = (worldStore?.houses ?? []).find((candidate) => candidate?.id === intent.houseId) ?? null

    if (!partner || !house || claimedUnitIds.has(partner.id) || claimedHouseIds.has(house.id)) {
      return false
    }

    if (!isUnitAvailableForReproduction(partner, currentTick)) {
      return false
    }

    if (house.reproductionTaskId) {
      return false
    }

    const targetAssignment =
      intent.unitTargetTile && intent.partnerTargetTile
        ? {
            unitTargetTile: intent.unitTargetTile,
            partnerTargetTile: intent.partnerTargetTile,
          }
        : getBestReproductionAssignment(worldStore, unit, partner, house)

    if (!targetAssignment) {
      return false
    }

    const unitTile = getUnitGridTile(unit)
    const partnerTile = getUnitGridTile(partner)

    if (!unitTile || !partnerTile) {
      return false
    }

    const unitPath = findPath(worldStore, unitTile, targetAssignment.unitTargetTile)
    const partnerPath = findPath(worldStore, partnerTile, targetAssignment.partnerTargetTile)

    if (
      (unitTile.x !== targetAssignment.unitTargetTile.x || unitTile.y !== targetAssignment.unitTargetTile.y) &&
      unitPath.length === 0
    ) {
      return false
    }

    if (
      (partnerTile.x !== targetAssignment.partnerTargetTile.x || partnerTile.y !== targetAssignment.partnerTargetTile.y) &&
      partnerPath.length === 0
    ) {
      return false
    }

    const reproductionTaskId = globalThis.crypto?.randomUUID?.() ?? `reproduction-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const task = {
      id: reproductionTaskId,
      houseId: house.id,
      unitIds: [unit.id, partner.id],
      unitTargetTiles: [targetAssignment.unitTargetTile, targetAssignment.partnerTargetTile],
      startedTick: null,
      finishTick: null,
    }

    getOngoingReproductions(worldStore).push(task)
    house.reproductionTaskId = task.id

    for (const subject of [unit, partner]) {
      subject.reproductionTaskId = task.id
      subject.reproductionHouseId = house.id
      subject.reproductionPartnerId = subject.id === unit.id ? partner.id : unit.id
      subject.reproductionReadyTick = null
      subject.reproductionUntilTick = null
      subject.intent = null
      subject.targetId = house.id
      subject.workTargetId = null
      subject.workTargetType = null
      subject.workTargetTile = null
      subject.constructionDelivery = null
      subject.constructionBuild = null
      subject.target = {
        type: 'house',
        id: house.id,
        tile: {
          ...(subject.id === unit.id ? targetAssignment.unitTargetTile : targetAssignment.partnerTargetTile),
        },
      }
      subject.path = []
      subject.pathGoalKey = null
      subject.idleSince = null
      subject.idleAction = null
      subject.state = 'moving'
      subject.decisionLockUntilTick = currentTick + 1
    }

    claimedUnitIds.add(unit.id)
    claimedUnitIds.add(partner.id)
    claimedHouseIds.add(house.id)

    return true
  }
}
