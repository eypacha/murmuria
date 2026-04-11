import { VILLAGER_CARRY_CAPACITY_WOOD } from '../../config/constants.js'
import { findCastleDropTile } from '../../core/findCastleDropTile.js'
import { findConstructionSiteDeliveryTile } from '../../core/findConstructionSiteDeliveryTile.js'
import { UnitStateSystem } from './UnitStateSystem.js'

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

    const castle = getCastle(worldStore)
    const castleDropTile = castle ? findCastleDropTile(castle, worldStore) : null
    const sites = getHouseConstructionSites(worldStore)
    const idleVillagers = getIdleVillagers(worldStore)

    if (!castle || !castleDropTile || sites.length === 0 || idleVillagers.length === 0) {
      this.updateWoodNeed(worldStore, sites)
      return
    }

    const currentTick = worldStore.tick ?? 0
    const claimedTargetKeys = new Set()
    const shuffledVillagers = [...idleVillagers]
    shuffleInPlace(shuffledVillagers)

    let availableWood = Math.max(0, Number(kingdom.resources?.wood ?? 0))

    for (const villager of shuffledVillagers) {
      if (availableWood <= 0) {
        break
      }

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
        availableWood,
      )

      if (amount <= 0) {
        continue
      }

      availableWood -= amount
      kingdom.resources.wood = availableWood
      site.woodReserved = Math.max(0, Number(site.woodReserved ?? 0)) + amount
      claimedTargetKeys.add(`${targetTile.x}:${targetTile.y}`)

      UnitStateSystem.cancelIdleBehavior(villager, worldStore, currentTick)
      villager.constructionDelivery = {
        siteId: site.id,
        amount,
        targetTile,
        assignedTick: currentTick,
      }
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
      villager.state = 'moving'
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
    const availableWood = Math.max(0, Number(kingdom.resources?.wood ?? 0))

    kingdom.needs = kingdom.needs ?? {}
    kingdom.needs.wood = Math.max(0, totalOutstandingNeed - availableWood)
  }
}
