import { getOccupiedTiles } from '../../core/getOccupiedTiles.js'
import { isTraversableWorldTile } from '../../core/isTraversableTile.js'
import { PAWN_PREPARE_TO_TREE_MS } from '../../config/constants.js'
import { weightedPick } from '../../ai/utils/weightedPick.js'
import { BuildHouseAction } from '../../ai/actions/BuildHouseAction.js'
import { GatherGoldAction } from '../../ai/actions/GatherGoldAction.js'
import { GatherMeatAction } from '../../ai/actions/GatherMeatAction.js'
import { GatherWoodAction } from '../../ai/actions/GatherWoodAction.js'
import { PawnStateSystem } from './PawnStateSystem.js'

const ACTIONS = [
  GatherWoodAction,
  GatherGoldAction,
  GatherMeatAction,
  BuildHouseAction,
]

export class DecisionSystem {
  static update(worldStore) {
    const pawns = worldStore.units ?? []

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

      if (!this.getGridPosition(pawn)) {
        continue
      }

      const scoredActions = ACTIONS.map((action) => {
        return {
          action,
          score: action.score(pawn, worldStore),
        }
      }).filter(({ score }) => score > 0)

      if (scoredActions.length === 0) {
        continue
      }

      while (scoredActions.length > 0) {
        const selected = weightedPick(scoredActions)

        if (!selected) {
          break
        }

        if (selected.action.perform(pawn, worldStore, this)) {
          break
        }

        const selectedIndex = scoredActions.indexOf(selected)

        if (selectedIndex >= 0) {
          scoredActions.splice(selectedIndex, 1)
        }
      }
    }
  }

  static assignResourceJob(pawn, worldStore, resourceType) {
    const pawnPosition = this.getGridPosition(pawn)

    if (!pawnPosition) {
      return false
    }

    const occupiedTiles = this.buildOccupiedTileSet(worldStore)
    const blockedTiles = this.buildOccupiedTileSet(worldStore, { includeUnits: false })
    const reachableTiles = this.buildReachabilityMap(pawnPosition, worldStore, blockedTiles)
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
      return false
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

    return true
  }

  static proposeHouseConstruction(pawn, worldStore) {
    const pawnPosition = this.getGridPosition(pawn)

    if (!pawnPosition) {
      return false
    }

    if (
      (worldStore.buildings ?? []).some(
        (building) => building.kind === 'constructionSite' && building.buildingType === 'house',
      )
    ) {
      return false
    }

    const occupiedTiles = this.buildOccupiedTileSet(worldStore)
    const tile = this.findBuildLocation(pawnPosition, worldStore, occupiedTiles)

    if (!tile) {
      return false
    }

    const site = {
      id: `site-${Date.now()}`,
      kind: 'constructionSite',
      buildingType: 'house',
      gridPos: tile,
      footprint: { w: 2, h: 2 },
      state: 'planned',
      cost: {
        wood: 20,
      },
      delivered: {
        wood: 0,
      },
      progress: 0,
      maxProgress: 100,
      initiator: pawn.id,
      workers: [],
    }

    worldStore.buildings = worldStore.buildings ?? []
    worldStore.buildings.push(site)

    pawn.state = 'proposing_construction'
    pawn.target = {
      type: 'constructionSite',
      id: site.id,
      tile,
    }
    pawn.path = []
    pawn.pathGoalKey = null

    return true
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

  static findBuildLocation(pawnPosition, worldStore, occupiedTiles) {
    const footprint = { w: 2, h: 2 }
    const searchRadius = 6

    for (let radius = 0; radius <= searchRadius; radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) {
            continue
          }

          const tile = {
            x: pawnPosition.x + dx,
            y: pawnPosition.y + dy,
          }

          if (!this.canPlaceFootprint(tile, footprint, worldStore, occupiedTiles)) {
            continue
          }

          return tile
        }
      }
    }

    return null
  }

  static canPlaceFootprint(tile, footprint, worldStore, occupiedTiles) {
    for (let dy = 0; dy < footprint.h; dy += 1) {
      for (let dx = 0; dx < footprint.w; dx += 1) {
        const footprintTile = {
          x: tile.x + dx,
          y: tile.y + dy,
        }

        if (!this.isInsideWorld(footprintTile, worldStore)) {
          return false
        }

        if (!this.isWalkable(footprintTile, worldStore)) {
          return false
        }

        if (occupiedTiles?.has(this.tileKey(footprintTile))) {
          return false
        }
      }
    }

    return true
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
