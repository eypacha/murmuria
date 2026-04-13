import { getOccupiedTiles } from '../../core/getOccupiedTiles.js'
import { getBlockingEntities } from '../../core/getBlockingEntities.js'
import { isTraversableWorldTile } from '../../core/isTraversableTile.js'
import { SIMULATION_TICK_MS, TILE_SIZE } from '../../config/constants.js'
import { VILLAGER_INTENT_ACTION_DELAY_TICKS } from '../../config/constants.js'
import { VILLAGER_INTENT_BUBBLE_DURATION_TICKS } from '../../config/constants.js'
import { UnitStateSystem } from './UnitStateSystem.js'
import { SheepStateSystem } from './SheepStateSystem.js'
import { ReproductionSystem } from './ReproductionSystem.js'
import { getIntentBubbleText } from './getIntentBubbleText.js'

export const MIN_INTENT_THRESHOLD = 0.01

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value ?? 0)))
}

function getCurrentTick(worldStore) {
  return worldStore?.tick ?? 0
}

function getIntentContract(type, targetId = null, targetPos = null, createdTick = 0) {
  return {
    type,
    targetId,
    targetPos,
    createdTick,
  }
}

function getFoodResourceTypes(resourceType) {
  return resourceType === 'sheep' ? ['sheep', 'meat'] : [resourceType]
}

export const IdleAction = {
  name: 'idle',
  isValid() {
    return true
  },
  score() {
    return 0.05
  },
  buildIntent(_unit, _worldStore, currentTick) {
    return getIntentContract('idle', null, null, currentTick)
  },
}

export const ReproduceAction = {
  name: 'reproduce',
  isValid(unit, worldStore) {
    return ReproductionSystem.isEligibleReproductionCandidate(unit, worldStore)
  },
  score(unit, worldStore) {
    const context = ReproductionSystem.getReproductionContext(worldStore)

    if (!context.canReproduce) {
      return 0
    }

    const population = Math.max(1, context.population)
    const idleFactor = Math.max(0, Math.min(1, context.idleUnits / population))
    const houseRatio = context.houseCount > 0 ? context.availableHouses / context.houseCount : 0
    const baseScore = 0.05

    return Math.max(0, baseScore * idleFactor * houseRatio)
  },
  buildIntent(unit, worldStore, currentTick) {
    const intent = ReproductionSystem.buildIntent(unit, worldStore)

    if (!intent) {
      return null
    }

    return {
      ...getIntentContract('reproduce', intent.houseId, intent.targetPos, currentTick),
      partnerId: intent.partnerId,
      houseId: intent.houseId,
    }
  },
}

function createGatherAction(resourceType, actionName) {
  return {
    name: actionName,
    resourceType,
    isValid(unit, worldStore) {
      if (!DecisionSystem.canUnitDecide(unit)) {
        return false
      }

      if (DecisionSystem.getProfileActions(unit.role).length === 0) {
        return false
      }

      return DecisionSystem.hasAvailableResourceType(worldStore, resourceType)
    },
    score(_unit, worldStore) {
      const totalNeed = Math.max(
        0,
        Number(worldStore?.kingdom?.needs?.wood ?? 0) +
          Number(worldStore?.kingdom?.needs?.gold ?? 0) +
          Number(worldStore?.kingdom?.needs?.food ?? 0),
      )

      if (totalNeed <= 0) {
        return 0
      }

      const needMap = {
        tree: Number(worldStore?.kingdom?.needs?.wood ?? 0),
        gold: Number(worldStore?.kingdom?.needs?.gold ?? 0),
        sheep: Number(worldStore?.kingdom?.needs?.food ?? 0),
      }

      return clamp01((needMap[resourceType] ?? 0) / totalNeed)
    },
    buildIntent(unit, worldStore, currentTick) {
      const selection = DecisionSystem.findBestResourceTarget(unit, worldStore, resourceType)

      if (!selection) {
        return null
      }

      return getIntentContract('gather', selection.resource.id, selection.targetTile, currentTick)
    },
  }
}

export const ACTION_REGISTRY = [
  createGatherAction('tree', 'gather_wood'),
  createGatherAction('gold', 'gather_gold'),
  createGatherAction('sheep', 'gather_food'),
  ReproduceAction,
  IdleAction,
]

export const ROLE_PROFILES = {
  villager: {
    actions: ['gather_wood', 'gather_gold', 'gather_food', 'reproduce', 'idle'],
  },
  default: {
    actions: ['idle'],
  },
}

export class DecisionSystem {
  static update(worldStore) {
    const units = worldStore.units ?? []
    const currentTick = getCurrentTick(worldStore)

    for (const unit of units) {
      if (!this.canUnitDecide(unit)) {
        continue
      }

      if (currentTick < Number(unit.decisionLockUntilTick ?? 0)) {
        continue
      }

      if (unit.state !== 'idle') {
        continue
      }

      if (unit.constructionDelivery || unit.constructionBuild) {
        continue
      }

      if (
        (unit.inventory?.wood ?? 0) > 0 ||
        (unit.inventory?.gold ?? 0) > 0 ||
        (unit.inventory?.meat ?? 0) > 0
      ) {
        continue
      }

      const availableActions = this.getAvailableActions(unit)
      const candidates = []

      for (const action of availableActions) {
        if (!action?.isValid?.(unit, worldStore)) {
          continue
        }

        const score = clamp01(action.score?.(unit, worldStore) ?? 0)

        if (score < 0) {
          continue
        }

        const intent = action.buildIntent?.(unit, worldStore, currentTick)

        if (!intent) {
          continue
        }

        candidates.push({
          action,
          score,
          intent,
        })
      }

      if (candidates.length === 0) {
        unit.intent = getIntentContract('idle', null, null, currentTick)
        unit.lastDecision = {
          action: 'idle',
          score: IdleAction.score(unit, worldStore),
          candidates: [],
          tick: currentTick,
        }
        unit.decisionLockUntilTick = currentTick + 1
        continue
      }

      candidates.sort((left, right) => right.score - left.score)
      const bestCandidate = candidates[0]

      if (!bestCandidate || bestCandidate.score < MIN_INTENT_THRESHOLD) {
        unit.intent = getIntentContract('idle', null, null, currentTick)
        unit.lastDecision = {
          action: 'idle',
          score: IdleAction.score(unit, worldStore),
          candidates: candidates.map((candidate) => ({
            action: candidate.action.name,
            score: candidate.score,
          })),
          tick: currentTick,
        }
        unit.decisionLockUntilTick = currentTick + 1
        continue
      }

      unit.intent = bestCandidate.intent
      unit.lastDecision = {
        action: bestCandidate.action.name,
        score: bestCandidate.score,
        candidates: candidates.map((candidate) => ({
          action: candidate.action.name,
          score: candidate.score,
        })),
        tick: currentTick,
      }
      unit.decisionLockUntilTick = currentTick + 1
    }
  }

  static resolveIntents(worldStore) {
    const currentTick = getCurrentTick(worldStore)
    const units = worldStore.units ?? []
    const claimedUnitIds = new Set()
    const claimedHouseIds = new Set()

    for (const unit of units) {
      const intent = unit.intent

      if (intent?.type !== 'reproduce') {
        continue
      }

      const started = ReproductionSystem.tryStartReproduction(
        unit,
        worldStore,
        intent,
        currentTick,
        claimedUnitIds,
        claimedHouseIds,
      )

      if (!started) {
        unit.intent = null
        unit.decisionLockUntilTick = currentTick + 1
      }
    }

    for (const unit of units) {
      const intent = unit.intent

      if (!intent || intent.type === 'idle' || intent.type === 'reproduce') {
        continue
      }

      if (intent.type !== 'gather') {
        continue
      }

      const resource = (worldStore.resources ?? []).find((candidate) => candidate.id === intent.targetId)

      if (!resource || !this.isResourceAvailable(resource)) {
        unit.intent = null
        unit.decisionLockUntilTick = currentTick + 1
        continue
      }

      const targetTile = intent.targetPos

      if (!targetTile) {
        unit.intent = null
        unit.decisionLockUntilTick = currentTick + 1
        continue
      }

      const claimResult = this.tryClaimResourceTarget(resource, targetTile, unit.id)

      if (!claimResult) {
        const fallbackSelection = this.findBestResourceTarget(unit, worldStore, resource.type)
        const fallbackTargetTile = fallbackSelection?.resource?.id === resource.id
          ? fallbackSelection.targetTile
          : null

        if (!fallbackTargetTile || !this.tryClaimResourceTarget(resource, fallbackTargetTile, unit.id)) {
          unit.intent = null
          unit.decisionLockUntilTick = currentTick + 1
          continue
        }

        targetTile.x = fallbackTargetTile.x
        targetTile.y = fallbackTargetTile.y
      }

      if (resource.type === 'sheep') {
        SheepStateSystem.lockSheepAtTileCenter(resource, currentTick)
      }

      unit.targetId = resource.id
      unit.workTargetId = resource.id
      unit.workTargetType = resource.type
      unit.workTargetTile = { x: targetTile.x, y: targetTile.y }
      unit.target = {
        type: resource.type,
        id: resource.id,
        tile: { x: targetTile.x, y: targetTile.y },
      }
      unit.path = []
      unit.pathGoalKey = null
      unit.interactionFacing = this.getFacingForResource(resource, targetTile)
      unit.facing = unit.interactionFacing
      unit.equipment = unit.equipment ?? { tool: null }
      unit.equipment.tool = this.getToolForResourceType(resource.type)
      unit.state = this.getPreparingStateForResourceType(resource.type)

      const intentText = getIntentBubbleText(resource.type)

      if (intentText) {
        unit.bubble = {
          text: intentText,
          untilTick: currentTick + VILLAGER_INTENT_BUBBLE_DURATION_TICKS,
        }
      }

      UnitStateSystem.queueTimedTransition(
        unit,
        worldStore,
        this.getMovingStateForResourceType(resource.type),
        VILLAGER_INTENT_ACTION_DELAY_TICKS * SIMULATION_TICK_MS,
      )

      unit.intent = null
    }
  }

  static getAvailableActions(unit) {
    const profileActions = this.getProfileActions(unit?.role)

    return ACTION_REGISTRY.filter((action) => profileActions.includes(action.name))
  }

  static getProfileActions(role) {
    return ROLE_PROFILES[role]?.actions ?? ROLE_PROFILES.default.actions
  }

  static canUnitDecide(unit) {
    return Boolean(unit) && unit.kind === 'unit' && unit.isChild !== true
  }

  static hasAvailableResourceType(worldStore, resourceType) {
    const resourceTypes = getFoodResourceTypes(resourceType)

    return (worldStore?.resources ?? []).some((resource) => {
      if (!resourceTypes.includes(resource.type)) {
        return false
      }

      return this.isResourceAvailable(resource)
    })
  }

  static getWorkSlots(target) {
    if (!target) {
      return []
    }

    if (Array.isArray(target.workSlots) && target.workSlots.length > 0) {
      return target.workSlots
        .map((slot) => {
          if (!slot) {
            return null
          }

          if (Number.isFinite(slot.x) && Number.isFinite(slot.y)) {
            return { x: slot.x, y: slot.y }
          }

          if (
            Number.isFinite(slot.offsetX) &&
            Number.isFinite(slot.offsetY) &&
            target.gridPos &&
            Number.isFinite(target.gridPos.x) &&
            Number.isFinite(target.gridPos.y)
          ) {
            return {
              x: target.gridPos.x + slot.offsetX,
              y: target.gridPos.y + slot.offsetY,
            }
          }

          return null
        })
        .filter(Boolean)
    }

    if (Array.isArray(target.workSlotOffsets) && target.workSlotOffsets.length > 0) {
      return target.workSlotOffsets
        .map((offset) => {
          if (
            !offset ||
            !target.gridPos ||
            !Number.isFinite(target.gridPos.x) ||
            !Number.isFinite(target.gridPos.y)
          ) {
            return null
          }

          const offsetX = Number(offset.x ?? offset.offsetX)
          const offsetY = Number(offset.y ?? offset.offsetY)

          if (!Number.isFinite(offsetX) || !Number.isFinite(offsetY)) {
            return null
          }

          return {
            x: target.gridPos.x + offsetX,
            y: target.gridPos.y + offsetY,
          }
        })
        .filter(Boolean)
    }

    const position = target.gridPos
    const footprint = target.footprint ?? { w: 1, h: 1 }

    if (
      !position ||
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y) ||
      !Number.isFinite(footprint.w) ||
      !Number.isFinite(footprint.h)
    ) {
      return []
    }

    const slots = []

    for (let dy = 0; dy < footprint.h; dy += 1) {
      slots.push({ x: position.x - 1, y: position.y + dy })
      slots.push({ x: position.x + footprint.w, y: position.y + dy })
    }

    return slots
  }

  static getResourceWorkSlots(resource) {
    return this.getWorkSlots(resource)
  }

  static getWorkSlotLimit(target) {
    if (!target) {
      return 0
    }

    if (Number.isFinite(target.workSlotLimit)) {
      return Math.max(0, Math.floor(Number(target.workSlotLimit)))
    }

    if (target.type === 'tree' || target.type === 'gold') {
      return 2
    }

    if (target.type === 'sheep') {
      return 1
    }

    const slots = this.getWorkSlots(target)

    if (slots.length > 0) {
      return slots.length
    }

    return 1
  }

  static findNearestAvailableResource(
    unit,
    resources,
    worldStore,
    occupiedTiles,
    blockedTiles,
    reachableTiles,
  ) {
    const unitPosition = this.getGridPosition(unit)

    if (!unitPosition) {
      return null
    }

    const pathMap = reachableTiles ?? this.buildReachabilityMap(unitPosition, worldStore, blockedTiles)
    let nearestResource = null
    let nearestTargetTile = null
    let nearestDistance = Number.POSITIVE_INFINITY

    for (const resource of resources) {
      if (!this.isResourceAvailable(resource)) {
        continue
      }

      const selection = this.findReachableAdjacentTile(resource, worldStore, pathMap, occupiedTiles)

      if (!selection) {
        continue
      }

      const { targetTile, pathLength } = selection

      if (pathLength < nearestDistance) {
        nearestDistance = pathLength
        nearestResource = resource
        nearestTargetTile = targetTile
      }
    }

    if (!nearestResource || !nearestTargetTile) {
      return null
    }

    return {
      resource: nearestResource,
      targetTile: nearestTargetTile,
    }
  }

  static findBestResourceTarget(unit, worldStore, resourceType) {
    const occupiedTiles = this.buildOccupiedTileSet(worldStore)
    const blockedTiles = this.buildOccupiedTileSet(worldStore, { includeUnits: false })
    const unitPosition = this.getGridPosition(unit)
    const resourceTypes = getFoodResourceTypes(resourceType)

    if (!unitPosition) {
      return null
    }

    const reachableTiles = this.buildReachabilityMap(unitPosition, worldStore, blockedTiles)
    const resources = (worldStore.resources ?? []).filter((resource) => resourceTypes.includes(resource.type))

    return this.findNearestAvailableResource(
      unit,
      resources,
      worldStore,
      occupiedTiles,
      blockedTiles,
      reachableTiles,
    )
  }

  static tryClaimResourceTarget(resource, targetTile, unitId) {
    if (!resource || !targetTile || !unitId) {
      return false
    }

    const availableSlots = this.getWorkSlots(resource)
    const targetIsValidSlot = availableSlots.some((slot) => {
      return slot.x === targetTile.x && slot.y === targetTile.y
    })

    if (!targetIsValidSlot) {
      return false
    }

    const tileKey = this.tileKey(targetTile)
    const reservedTargetTiles = Array.isArray(resource.reservedTargetTiles)
      ? resource.reservedTargetTiles
      : []

    if (reservedTargetTiles.includes(tileKey)) {
      return false
    }

    const claimLimit = this.getWorkSlotLimit(resource)

    if (claimLimit <= 0 || reservedTargetTiles.length >= claimLimit) {
      return false
    }

    reservedTargetTiles.push(tileKey)
    resource.reservedTargetTiles = reservedTargetTiles
    return true
  }

  static findReachableAdjacentTile(resource, worldStore, reachableTiles, occupiedTiles) {
    const resourceTile = this.getResourceGridPosition(resource)
    if (!resourceTile) {
      return null
    }

    const resourceElevation = this.getTileElevation(worldStore, resourceTile)

    if (!Number.isFinite(resourceElevation)) {
      return null
    }

    const candidates = this.getResourceWorkSlots(resource)
    const reservedTargetTiles = this.getReservedTargetTiles(resource)

    let closestTile = null
    let shortestPathLength = Number.POSITIVE_INFINITY

    for (const candidate of candidates) {
      const candidateKey = this.tileKey(candidate)
      const candidateElevation = this.getTileElevation(worldStore, candidate)

      if (occupiedTiles?.has(candidateKey)) {
        continue
      }

      if (reservedTargetTiles.has(candidateKey)) {
        continue
      }

      if (!Number.isFinite(candidateElevation) || candidateElevation !== resourceElevation) {
        continue
      }

      const pathLength = reachableTiles.get(candidateKey)

      if (pathLength === undefined) {
        continue
      }

      if (pathLength < shortestPathLength) {
        shortestPathLength = pathLength
        closestTile = candidate
      }
    }

    if (!closestTile) {
      return null
    }

    return {
      targetTile: closestTile,
      pathLength: shortestPathLength,
    }
  }

  static claimResourceTarget(resource, targetTile, unitId) {
    if (!resource || !targetTile) {
      return false
    }

    return this.tryClaimResourceTarget(resource, targetTile, unitId)
  }

  static reserveWorkSlot(resource, targetTile) {
    if (!resource || !targetTile) {
      return
    }

    const tileKey = this.tileKey(targetTile)
    const reservedTargetTiles = Array.isArray(resource.reservedTargetTiles)
      ? resource.reservedTargetTiles
      : []

    if (!reservedTargetTiles.includes(tileKey)) {
      reservedTargetTiles.push(tileKey)
    }

    resource.reservedTargetTiles = reservedTargetTiles
  }

  static reserveResourceTargetTile(resource, targetTile) {
    return this.reserveWorkSlot(resource, targetTile)
  }

  static releaseWorkSlot(resource, targetTile) {
    if (!resource || !targetTile || !Array.isArray(resource.reservedTargetTiles)) {
      return
    }

    const tileKey = this.tileKey(targetTile)
    const remaining = resource.reservedTargetTiles.filter((reservedTileKey) => reservedTileKey !== tileKey)

    if (remaining.length > 0) {
      resource.reservedTargetTiles = remaining
    } else {
      delete resource.reservedTargetTiles
    }
  }

  static releaseResourceTargetTile(resource, targetTile) {
    return this.releaseWorkSlot(resource, targetTile)
  }

  static getReservedTargetTiles(resource) {
    return new Set(Array.isArray(resource?.reservedTargetTiles) ? resource.reservedTargetTiles : [])
  }

  static buildReachabilityMap(startTile, worldStore, occupiedTiles) {
    const queue = [startTile]
    const distances = new Map([[this.tileKey(startTile), 0]])

    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index]
      const currentDistance = distances.get(this.tileKey(current)) ?? 0

      for (const neighbor of this.getNeighbors(current)) {
        const neighborKey = this.tileKey(neighbor)

        if (distances.has(neighborKey)) {
          continue
        }

        if (!this.isInsideWorld(neighbor, worldStore)) {
          continue
        }

        if (!this.isWalkable(neighbor, worldStore)) {
          continue
        }

        if (occupiedTiles?.has(neighborKey)) {
          continue
        }

        distances.set(neighborKey, currentDistance + 1)
        queue.push(neighbor)
      }
    }

    return distances
  }

  static getTargetResource(worldStore, unit) {
    const targetId = unit.target?.id ?? unit.targetId

    if (!targetId) {
      return null
    }

    return (worldStore.resources ?? []).find((resource) => resource.id === targetId) ?? null
  }

  static getFacingForResource(resource, targetTile) {
    const footprint = resource.footprint ?? { w: 1, h: 1 }
    const resourceTile = this.getResourceGridPosition(resource)

    if (!resourceTile) {
      return 'right'
    }

    if (targetTile.x >= resourceTile.x + footprint.w) {
      return 'left'
    }

    return 'right'
  }

  static getToolForResourceType(resourceType) {
    if (resourceType === 'gold') {
      return 'pickaxe'
    }

    if (resourceType === 'sheep') {
      return 'knife'
    }

    if (resourceType === 'meat') {
      return null
    }

    return 'axe'
  }

  static getPreparingStateForResourceType(resourceType) {
    if (resourceType === 'gold') {
      return 'preparing_to_gold'
    }

    if (resourceType === 'sheep' || resourceType === 'meat') {
      return 'preparing_to_meat'
    }

    return 'preparing_to_tree'
  }

  static getMovingStateForResourceType(resourceType) {
    if (resourceType === 'gold') {
      return 'moving_to_gold'
    }

    if (resourceType === 'sheep' || resourceType === 'meat') {
      return 'moving_to_meat'
    }

    return 'moving_to_tree'
  }

  static isResourceAvailable(resource) {
    if ((resource.amount ?? 0) <= 0) {
      return false
    }

    const reservedTargetTiles = Array.isArray(resource?.reservedTargetTiles)
      ? resource.reservedTargetTiles
      : []
    const claimLimit = this.getWorkSlotLimit(resource)

    if (claimLimit <= 0) {
      return false
    }

    return reservedTargetTiles.length < claimLimit
  }

  static isInsideWorld(tile, worldStore) {
    const width = worldStore.world?.width ?? 0
    const height = worldStore.world?.height ?? 0

    return tile.x >= 0 && tile.y >= 0 && tile.x < width && tile.y < height
  }

  static isWalkable(tile, worldStore) {
    return isTraversableWorldTile(worldStore, tile)
  }

  static isTileOccupied(tile, worldStore) {
    const entities = getBlockingEntities(worldStore)

    return entities.some((entity) => this.entityOccupiesTile(entity, tile))
  }

  static buildOccupiedTileSet(worldStore, options = {}) {
    const includeUnits = options.includeUnits !== false
    const occupiedTiles = new Set()
    const entities = getBlockingEntities(worldStore, { includeUnits })

    for (const entity of entities) {
      if (!entity?.gridPos) {
        continue
      }

      for (const tile of getOccupiedTiles(entity)) {
        occupiedTiles.add(this.tileKey(tile))
      }
    }

    return occupiedTiles
  }

  static entityOccupiesTile(entity, tile) {
    if (!entity?.gridPos) {
      return false
    }

    return getOccupiedTiles(entity).some((occupiedTile) => {
      return occupiedTile.x === tile.x && occupiedTile.y === tile.y
    })
  }

  static getGridPosition(entity) {
    return entity.gridPos ?? entity.pos ?? null
  }

  static getResourceGridPosition(resource) {
    if (!resource) {
      return null
    }

    if (
      resource.type === 'sheep' &&
      resource.pos &&
      Number.isFinite(resource.pos.x) &&
      Number.isFinite(resource.pos.y)
    ) {
      return {
        x: Math.round((resource.pos.x - TILE_SIZE / 2) / TILE_SIZE),
        y: Math.round((resource.pos.y - TILE_SIZE / 2) / TILE_SIZE),
      }
    }

    return resource.gridPos ?? null
  }

  static getWorldTile(worldStore, tile) {
    if (!worldStore?.world?.tiles || !tile) {
      return null
    }

    return worldStore.world.tiles?.[tile.y]?.[tile.x] ?? null
  }

  static getTileElevation(worldStore, tile) {
    const worldTile = this.getWorldTile(worldStore, tile)

    return worldTile?.elevation
  }

  static getNeighbors(tile) {
    return [
      { x: tile.x + 1, y: tile.y },
      { x: tile.x - 1, y: tile.y },
      { x: tile.x, y: tile.y + 1 },
      { x: tile.x, y: tile.y - 1 },
    ]
  }

  static tileKey(tile) {
    return `${tile.x}:${tile.y}`
  }
}
