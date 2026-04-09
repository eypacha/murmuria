import { getOccupiedTiles } from '../../core/getOccupiedTiles.js'
import { PAWN_PREPARE_TO_TREE_MS } from '../../config/constants.js'
import { PawnStateSystem } from './PawnStateSystem.js'

export class DecisionSystem {
  static update(worldStore) {
    const resourceTypes = this.resolvePreferredResourceTypes(worldStore)

    if (resourceTypes.length === 0) {
      return
    }

    const pawns = worldStore.units ?? []

    for (const pawn of pawns) {
      if (pawn.role !== 'pawn') {
        continue
      }

      if (pawn.state !== 'idle') {
        continue
      }

      if ((pawn.inventory?.wood ?? 0) > 0 || (pawn.inventory?.gold ?? 0) > 0) {
        continue
      }

      let resource = null
      let selectedResourceType = null

      for (const resourceType of resourceTypes) {
        const resources = (worldStore.resources ?? []).filter((resource) => resource.type === resourceType)
        resource = this.findNearestAvailableResource(pawn, resources)

        if (resource) {
          selectedResourceType = resourceType
          break
        }
      }

      if (!resource) {
        continue
      }

      const targetTile = this.findAdjacentTile(resource, pawn, worldStore)

      if (!targetTile) {
        continue
      }

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
      pawn.equipment.tool = selectedResourceType === 'gold' ? 'pickaxe' : 'axe'
      pawn.state = selectedResourceType === 'gold' ? 'preparing_to_gold' : 'preparing_to_tree'
      PawnStateSystem.queueTimedTransition(
        pawn,
        worldStore,
        selectedResourceType === 'gold' ? 'moving_to_gold' : 'moving_to_tree',
        PAWN_PREPARE_TO_TREE_MS,
      )
    }
  }

  static resolvePreferredResourceTypes(worldStore) {
    const woodPriority = worldStore.kingdom?.policies?.woodPriority ?? 0
    const goldPriority = worldStore.kingdom?.policies?.goldPriority ?? 0

    if (woodPriority <= 0 && goldPriority <= 0) {
      return []
    }

    if (goldPriority > woodPriority) {
      return goldPriority > 0 ? ['gold', 'tree'] : ['tree']
    }

    return woodPriority > 0 ? ['tree', 'gold'] : ['gold']
  }

  static findNearestAvailableResource(pawn, resources) {
    const pawnPosition = this.getGridPosition(pawn)

    if (!pawnPosition) {
      return null
    }

    let nearestResource = null
    let nearestDistance = Number.POSITIVE_INFINITY

    for (const resource of resources) {
      if (!this.isResourceAvailable(resource)) {
        continue
      }

      const resourcePosition = this.getGridPosition(resource)

      if (!resourcePosition) {
        continue
      }

      const distance = this.getManhattanDistance(pawnPosition, resourcePosition)

      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestResource = resource
      }
    }

    return nearestResource
  }

  static findAdjacentTile(resource, pawn, worldStore) {
    const pawnPosition = this.getGridPosition(pawn)

    if (!pawnPosition) {
      return null
    }

    const footprint = resource.footprint ?? { w: 1, h: 1 }
    const candidates = []

    for (let dy = 0; dy < footprint.h; dy += 1) {
      candidates.push({ x: resource.gridPos.x - 1, y: resource.gridPos.y + dy })
      candidates.push({ x: resource.gridPos.x + footprint.w, y: resource.gridPos.y + dy })
    }

    const validCandidates = candidates.filter((tile) => {
      if (!this.isInsideWorld(tile, worldStore)) {
        return false
      }

      if (!this.isWalkable(tile, worldStore)) {
        return false
      }

      return !this.isTileOccupied(tile, worldStore)
    })

    if (validCandidates.length === 0) {
      return null
    }

    let closestTile = validCandidates[0]
    let closestDistance = this.getManhattanDistance(pawnPosition, closestTile)

    for (let i = 1; i < validCandidates.length; i += 1) {
      const candidate = validCandidates[i]
      const distance = this.getManhattanDistance(pawnPosition, candidate)

      if (distance < closestDistance) {
        closestDistance = distance
        closestTile = candidate
      }
    }

    return closestTile
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
    return worldStore.world?.tiles?.[tile.y]?.[tile.x]?.walkable ?? false
  }

  static isTileOccupied(tile, worldStore) {
    const entities = [
      ...(worldStore.buildings ?? []),
      ...(worldStore.resources ?? []),
      ...(worldStore.units ?? []),
    ]

    return entities.some((entity) => this.entityOccupiesTile(entity, tile))
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

  static getManhattanDistance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
  }
}
