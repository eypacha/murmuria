import { getOccupiedTiles } from '../../core/getOccupiedTiles.js'
import { getBlockingEntities } from '../../core/getBlockingEntities.js'
import { isTraversableWorldTile } from '../../core/isTraversableTile.js'
import { SIMULATION_TICK_MS, TILE_SIZE } from '../../config/constants.js'
import { VILLAGER_INTENT_ACTION_DELAY_TICKS } from '../../config/constants.js'
import { VILLAGER_INTENT_BUBBLE_DURATION_TICKS } from '../../config/constants.js'
import { UnitStateSystem } from './UnitStateSystem.js'
import { SheepStateSystem } from './SheepStateSystem.js'
import { getIntentBubbleText } from './getIntentBubbleText.js'

export class VillagerDecisionSystem {
  static update(worldStore) {
    const units = worldStore.units ?? []
    const occupiedTiles = this.buildOccupiedTileSet(worldStore)
    const blockedTiles = this.buildOccupiedTileSet(worldStore, { includeUnits: false })

    for (const unit of units) {
      if (unit.role !== 'villager') {
        continue
      }

      if (unit.state !== 'idle') {
        continue
      }

      if (unit.constructionDelivery) {
        continue
      }

      if (
        (unit.inventory?.wood ?? 0) > 0 ||
        (unit.inventory?.gold ?? 0) > 0 ||
        (unit.inventory?.meat ?? 0) > 0
      ) {
        continue
      }

      const unitPosition = this.getGridPosition(unit)

      if (!unitPosition) {
        continue
      }

      const scores = this.computeResourceScores(worldStore)

      if (scores.length === 0) {
        continue
      }

      const reachableTiles = this.buildReachabilityMap(unitPosition, worldStore, blockedTiles)
      let availableScores = scores

      while (availableScores.length > 0) {
        const resourceType = this.chooseWeightedResource(availableScores)

        if (!resourceType) {
          break
        }

        const resources = (worldStore.resources ?? []).filter((resource) => resource.type === resourceType)
        const selection = this.findNearestAvailableResource(
          unit,
          resources,
          worldStore,
          occupiedTiles,
          blockedTiles,
          reachableTiles,
        )

        if (!selection) {
          availableScores = availableScores.filter((score) => score.type !== resourceType)
          continue
        }

        const { resource, targetTile } = selection

        if (resource.type === 'sheep') {
          SheepStateSystem.lockSheepAtTileCenter(resource, worldStore.tick ?? 0)
        }

        resource.reservedBy = unit.id
        unit.targetId = resource.id
        unit.workTargetId = resource.id
        unit.workTargetType = resource.type
        unit.target = {
          type: resource.type,
          id: resource.id,
          tile: targetTile,
        }
        unit.path = []
        unit.pathGoalKey = null
        unit.interactionFacing = this.getFacingForResource(resource, targetTile)
        unit.facing = unit.interactionFacing
        unit.equipment = unit.equipment ?? { tool: null }
        unit.equipment.tool = this.getToolForResourceType(resourceType)
        unit.state = this.getPreparingStateForResourceType(resourceType)

        const intentText = getIntentBubbleText(resourceType)

        if (intentText) {
          const currentTick = worldStore.tick ?? 0

          unit.bubble = {
            text: intentText,
            untilTick: currentTick + VILLAGER_INTENT_BUBBLE_DURATION_TICKS,
          }
        }

        UnitStateSystem.queueTimedTransition(
          unit,
          worldStore,
          this.getMovingStateForResourceType(resourceType),
          VILLAGER_INTENT_ACTION_DELAY_TICKS * SIMULATION_TICK_MS,
        )
        break
      }
    }
  }

  static computeResourceScores(worldStore) {
    const woodNeed = Number(worldStore.kingdom?.needs?.wood ?? 0)
    const goldNeed = Number(worldStore.kingdom?.needs?.gold ?? 0)
    const foodNeed = Number(worldStore.kingdom?.needs?.food ?? 0)

    return [
      { type: 'tree', score: woodNeed },
      { type: 'gold', score: goldNeed },
      { type: 'sheep', score: foodNeed },
    ].filter(({ score }) => score > 0)
  }

  static chooseWeightedResource(scores) {
    let totalScore = 0

    for (const { score } of scores) {
      if (score > 0) {
        totalScore += score
      }
    }

    if (totalScore <= 0) {
      return null
    }

    const targetScore = Math.random() * totalScore
    let accumulatedScore = 0

    for (const { type, score } of scores) {
      if (score <= 0) {
        continue
      }

      accumulatedScore += score

      if (targetScore < accumulatedScore) {
        return type
      }
    }

    return scores.find(({ score }) => score > 0)?.type ?? null
  }

  static findNearestAvailableResource(
    villager,
    resources,
    worldStore,
    occupiedTiles,
    blockedTiles,
    reachableTiles,
  ) {
    const villagerPosition = this.getGridPosition(villager)

    if (!villagerPosition) {
      return null
    }

    const pathMap = reachableTiles ?? this.buildReachabilityMap(villagerPosition, worldStore, blockedTiles)
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

  static findReachableAdjacentTile(resource, worldStore, reachableTiles, occupiedTiles) {
    const resourceTile = this.getResourceGridPosition(resource)
    if (!resourceTile) {
      return null
    }

    const resourceElevation = this.getTileElevation(worldStore, resourceTile)

    if (!Number.isFinite(resourceElevation)) {
      return null
    }

    const footprint = resource.footprint ?? { w: 1, h: 1 }
    const candidates = []

    for (let dy = 0; dy < footprint.h; dy += 1) {
      candidates.push({ x: resourceTile.x - 1, y: resourceTile.y + dy })
      candidates.push({ x: resourceTile.x + footprint.w, y: resourceTile.y + dy })
    }

    let closestTile = null
    let shortestPathLength = Number.POSITIVE_INFINITY

    for (const candidate of candidates) {
      const candidateKey = this.tileKey(candidate)
      const candidateElevation = this.getTileElevation(worldStore, candidate)

      if (occupiedTiles?.has(candidateKey)) {
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

    return 'axe'
  }

  static getPreparingStateForResourceType(resourceType) {
    if (resourceType === 'gold') {
      return 'preparing_to_gold'
    }

    if (resourceType === 'sheep') {
      return 'preparing_to_meat'
    }

    return 'preparing_to_tree'
  }

  static getMovingStateForResourceType(resourceType) {
    if (resourceType === 'gold') {
      return 'moving_to_gold'
    }

    if (resourceType === 'sheep') {
      return 'moving_to_meat'
    }

    return 'moving_to_tree'
  }

  static isResourceAvailable(resource) {
    return (
      (resource.reservedBy === null || resource.reservedBy === undefined) &&
      (resource.amount ?? 0) > 0
    )
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
