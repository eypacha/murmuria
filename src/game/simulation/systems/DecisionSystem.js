import { getOccupiedTiles } from '../../core/getOccupiedTiles.js'
import { isTraversableWorldTile } from '../../core/isTraversableTile.js'
import { PAWN_PREPARE_TO_TREE_MS } from '../../config/constants.js'
import { PawnStateSystem } from './PawnStateSystem.js'

export class DecisionSystem {
  static update(worldStore) {
    const pawns = worldStore.units ?? []
    const occupiedTiles = this.buildOccupiedTileSet(worldStore)
    const blockedTiles = this.buildOccupiedTileSet(worldStore, { includeUnits: false })

    for (const pawn of pawns) {
      if (pawn.role !== 'pawn') {
        continue
      }

      if (pawn.state !== 'idle') {
        continue
      }

      if (
        (pawn.inventory?.wood ?? 0) > 0 ||
        (pawn.inventory?.gold ?? 0) > 0 ||
        (pawn.inventory?.meat ?? 0) > 0
      ) {
        continue
      }

      const pawnPosition = this.getGridPosition(pawn)

      if (!pawnPosition) {
        continue
      }

      const scores = this.computeResourceScores(pawn, worldStore)

      if (scores.length === 0) {
        continue
      }

      const reachableTiles = this.buildReachabilityMap(pawnPosition, worldStore, blockedTiles)
      let availableScores = scores

      while (availableScores.length > 0) {
        const resourceType = this.chooseWeightedResource(availableScores)

        if (!resourceType) {
          break
        }

        const resources = (worldStore.resources ?? []).filter((resource) => resource.type === resourceType)
        const selection = this.findNearestAvailableResource(
          pawn,
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

        resource.reservedBy = pawn.id
        pawn.targetId = resource.id
        pawn.workTargetId = resource.id
        pawn.workTargetType = resource.type
        pawn.target = {
          type: resource.type,
          id: resource.id,
          tile: targetTile,
        }
        pawn.path = []
        pawn.pathGoalKey = null
        pawn.interactionFacing = this.getFacingForResource(resource, targetTile)
        pawn.facing = pawn.interactionFacing
        pawn.equipment = pawn.equipment ?? { tool: null }
        pawn.equipment.tool = this.getToolForResourceType(resourceType)
        pawn.state = this.getPreparingStateForResourceType(resourceType)
        PawnStateSystem.queueTimedTransition(
          pawn,
          worldStore,
          this.getMovingStateForResourceType(resourceType),
          PAWN_PREPARE_TO_TREE_MS,
        )
        break
      }
    }
  }

  static computeResourceScores(pawn, worldStore) {
    const gatherWood = Number(worldStore.kingdom?.desires?.gatherWood ?? 0)
    const gatherGold = Number(worldStore.kingdom?.desires?.gatherGold ?? 0)
    const gatherMeat = Number(worldStore.kingdom?.desires?.gatherMeat ?? 0)

    return [
      { type: 'tree', score: gatherWood },
      { type: 'gold', score: gatherGold },
      { type: 'sheep', score: gatherMeat },
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
    pawn,
    resources,
    worldStore,
    occupiedTiles,
    blockedTiles,
    reachableTiles,
  ) {
    const pawnPosition = this.getGridPosition(pawn)

    if (!pawnPosition) {
      return null
    }

    const pathMap = reachableTiles ?? this.buildReachabilityMap(pawnPosition, worldStore, blockedTiles)
    let nearestResource = null
    let nearestTargetTile = null
    let nearestDistance = Number.POSITIVE_INFINITY

    for (const resource of resources) {
      if (!this.isResourceAvailable(resource)) {
        continue
      }

      const selection = this.findReachableAdjacentTile(resource, pathMap, occupiedTiles)

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

  static findReachableAdjacentTile(resource, reachableTiles, occupiedTiles) {
    const footprint = resource.footprint ?? { w: 1, h: 1 }
    const candidates = []

    for (let dy = 0; dy < footprint.h; dy += 1) {
      candidates.push({ x: resource.gridPos.x - 1, y: resource.gridPos.y + dy })
      candidates.push({ x: resource.gridPos.x + footprint.w, y: resource.gridPos.y + dy })
    }

    let closestTile = null
    let shortestPathLength = Number.POSITIVE_INFINITY

    for (const candidate of candidates) {
      const candidateKey = this.tileKey(candidate)

      if (occupiedTiles?.has(candidateKey)) {
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

    if (targetTile.x >= resource.gridPos.x + footprint.w) {
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
    if (resource.type === 'sheep' && (resource.state ?? 'idle') !== 'idle') {
      return false
    }

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
    const entities = [
      ...(worldStore.buildings ?? []),
      ...(worldStore.resources ?? []),
      ...(worldStore.units ?? []),
    ]

    return entities.some((entity) => this.entityOccupiesTile(entity, tile))
  }

  static buildOccupiedTileSet(worldStore, options = {}) {
    const includeUnits = options.includeUnits !== false
    const occupiedTiles = new Set()
    const entities = [
      ...(worldStore.buildings ?? []),
      ...(worldStore.resources ?? []),
    ]

    if (includeUnits) {
      entities.push(...(worldStore.units ?? []))
    }

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
