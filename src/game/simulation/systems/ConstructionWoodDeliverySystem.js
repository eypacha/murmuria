import { isStartupGracePeriod } from '../../core/isStartupGracePeriod.js'
import {
  SIMULATION_TICK_MS,
  VILLAGER_CARRY_CAPACITY_WOOD,
  VILLAGER_INTENT_ACTION_DELAY_TICKS,
  VILLAGER_INTENT_BUBBLE_DURATION_TICKS,
} from '../../config/constants.js'
import { findCastleDropTile } from '../../core/findCastleDropTile.js'
import { findConstructionSiteDeliveryTile } from '../../core/findConstructionSiteDeliveryTile.js'
import { UnitStateSystem } from './UnitStateSystem.js'
import { VillagerDecisionSystem } from './VillagerDecisionSystem.js'
import { getIntentBubbleText } from './getIntentBubbleText.js'

function getHouseConstructionSites(worldStore) {
  return (worldStore.constructionSites ?? []).filter((site) => {
    return site?.type === 'constructionSite' && site?.buildingType === 'house' && site?.revealed !== false
  })
}

function getSiteRemainingNeed(site) {
  const required = Math.max(0, Number(site?.woodRequired ?? 0))
  const delivered = Math.max(0, Number(site?.woodDelivered ?? 0))
  const reserved = Math.max(0, Number(site?.woodReserved ?? 0))

  return Math.max(0, required - delivered - reserved)
}

function getIdleVillagers(worldStore) {
  return (worldStore.units ?? []).filter((unit) => {
    return (
      unit?.role === 'villager' &&
      unit.state === 'idle' &&
      !unit.constructionDelivery &&
      (unit.inventory?.wood ?? 0) <= 0 &&
      (unit.inventory?.gold ?? 0) <= 0 &&
      (unit.inventory?.meat ?? 0) <= 0
    )
  })
}

function shuffleInPlace(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const temp = items[index]
    items[index] = items[swapIndex]
    items[swapIndex] = temp
  }
}

function getCastle(worldStore) {
  return (worldStore.buildings ?? []).find((building) => building?.type === 'castle') ?? null
}

export class ConstructionWoodDeliverySystem {
  static update(worldStore) {
    const kingdom = worldStore?.kingdom

    if (!kingdom) {
      return
    }

    if (isStartupGracePeriod(worldStore)) {
      this.updateWoodNeed(worldStore, getHouseConstructionSites(worldStore))
      return
    }

    const castle = getCastle(worldStore)
    const sites = getHouseConstructionSites(worldStore)
    const idleVillagers = getIdleVillagers(worldStore)

    if (!castle || sites.length === 0 || idleVillagers.length === 0) {
      this.updateWoodNeed(worldStore, sites)
      return
    }

    const currentTick = worldStore.tick ?? 0
    const claimedTargetKeys = new Set()
    const shuffledVillagers = [...idleVillagers]
    shuffleInPlace(shuffledVillagers)

    let reservedCastleWood = Math.max(0, Number(kingdom.constructionWoodReserved ?? 0))
    const visibleCastleWood = Math.max(0, Number(kingdom.resources?.wood ?? 0))
    let availableCastleWood = Math.max(0, visibleCastleWood - reservedCastleWood)

    for (const villager of shuffledVillagers) {
      const site = sites.find((candidate) => getSiteRemainingNeed(candidate) > 0)

      if (!site) {
        break
      }

      const targetTile = findConstructionSiteDeliveryTile(site, worldStore, villager, claimedTargetKeys)

      if (!targetTile) {
        continue
      }

      const amount = Math.min(
        villager.stats?.carryCapacityWood ?? VILLAGER_CARRY_CAPACITY_WOOD,
        getSiteRemainingNeed(site),
      )

      if (amount <= 0) {
        continue
      }

      site.woodReserved = Math.max(0, Number(site.woodReserved ?? 0)) + amount
      claimedTargetKeys.add(`${targetTile.x}:${targetTile.y}`)

      const castleDropTile = findCastleDropTile(castle, worldStore, villager)
      const shouldPickupFromCastle = Boolean(castleDropTile) && availableCastleWood >= amount

      if (shouldPickupFromCastle) {
        reservedCastleWood += amount
        kingdom.constructionWoodReserved = reservedCastleWood
        availableCastleWood -= amount
      }

      UnitStateSystem.cancelIdleBehavior(villager, worldStore, currentTick)
      villager.constructionDelivery = {
        siteId: site.id,
        amount,
        targetTile,
        assignedTick: currentTick,
        route: shouldPickupFromCastle ? 'castle' : 'tree',
      }
      const intentText = getIntentBubbleText('construction_wood')

      if (intentText) {
        villager.bubble = {
          text: intentText,
          untilTick: currentTick + VILLAGER_INTENT_BUBBLE_DURATION_TICKS,
        }
      }

      if (shouldPickupFromCastle) {
        villager.targetId = castle.id
        villager.target = {
          type: 'castle',
          id: castle.id,
          tile: castleDropTile,
        }
        villager.workTargetId = null
        villager.workTargetType = null
        villager.path = []
        villager.pathGoalKey = null
        villager.state = 'preparing_to_construction_wood'
        UnitStateSystem.queueTimedTransition(
          villager,
          worldStore,
          'moving',
          VILLAGER_INTENT_ACTION_DELAY_TICKS * SIMULATION_TICK_MS,
        )
        continue
      }

      const unitPosition = VillagerDecisionSystem.getGridPosition(villager)
      const occupiedTiles = VillagerDecisionSystem.buildOccupiedTileSet(worldStore)
      const blockedTiles = VillagerDecisionSystem.buildOccupiedTileSet(worldStore, { includeUnits: false })

      if (!unitPosition) {
        continue
      }

      const reachableTiles = VillagerDecisionSystem.buildReachabilityMap(unitPosition, worldStore, blockedTiles)
      const trees = (worldStore.resources ?? []).filter((resource) => resource.type === 'tree')
      const selection = VillagerDecisionSystem.findNearestAvailableResource(
        villager,
        trees,
        worldStore,
        occupiedTiles,
        blockedTiles,
        reachableTiles,
      )

      if (!selection) {
        continue
      }

      const { resource, targetTile: treeTargetTile } = selection

      VillagerDecisionSystem.claimResourceTarget(resource, treeTargetTile)
      resource.reservedBy = villager.id
      villager.targetId = resource.id
      villager.workTargetId = resource.id
      villager.workTargetType = resource.type
      villager.workTargetTile = { x: treeTargetTile.x, y: treeTargetTile.y }
      villager.target = {
        type: resource.type,
        id: resource.id,
        tile: treeTargetTile,
      }
      villager.path = []
      villager.pathGoalKey = null
      villager.interactionFacing = VillagerDecisionSystem.getFacingForResource(resource, treeTargetTile)
      villager.facing = villager.interactionFacing
      villager.equipment = villager.equipment ?? { tool: null }
      villager.equipment.tool = 'axe'
      villager.state = 'preparing_to_tree'
      UnitStateSystem.queueTimedTransition(
        villager,
        worldStore,
        'moving_to_tree',
        VILLAGER_INTENT_ACTION_DELAY_TICKS * SIMULATION_TICK_MS,
      )
    }

    this.updateWoodNeed(worldStore, sites)
  }

  static updateWoodNeed(worldStore, sites = getHouseConstructionSites(worldStore)) {
    const kingdom = worldStore?.kingdom

    if (!kingdom) {
      return
    }

    const totalOutstandingNeed = sites.reduce((sum, site) => {
      return sum + getSiteRemainingNeed(site)
    }, 0)
    const availableWood = Math.max(
      0,
      Number(kingdom.resources?.wood ?? 0) - Number(kingdom.constructionWoodReserved ?? 0),
    )

    kingdom.needs = kingdom.needs ?? {}
    kingdom.needs.wood = Math.max(0, totalOutstandingNeed - availableWood)
  }
}
