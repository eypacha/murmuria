import { VILLAGER_INTENT_BUBBLE_DURATION_TICKS } from '../../config/constants.js'
import { getIntentBubbleText } from './getIntentBubbleText.js'
import { findHousePlacement } from '../../core/findHousePlacement.js'
import { getBlockingEntities } from '../../core/getBlockingEntities.js'
import { createConstructionSite } from '../../domain/factories/createConstructionSite.js'

function getActiveHouseConstructionSite(worldStore) {
  return (worldStore.constructionSites ?? []).find((site) => {
    return site?.type === 'constructionSite' && site?.buildingType === 'house'
  }) ?? null
}

function getIdleVillagers(worldStore) {
  return (worldStore.units ?? []).filter((unit) => {
    return (
      unit?.role === 'villager' &&
      unit.state === 'idle' &&
      (unit.inventory?.wood ?? 0) <= 0 &&
      (unit.inventory?.gold ?? 0) <= 0 &&
      (unit.inventory?.meat ?? 0) <= 0
    )
  })
}

function chooseRandomVillager(villagers) {
  if (villagers.length === 0) {
    return null
  }

  const index = Math.floor(Math.random() * villagers.length)
  return villagers[index] ?? null
}

export class HousingProposalSystem {
  static update(worldStore) {
    const kingdom = worldStore?.kingdom

    if (!kingdom) {
      return
    }

    if (kingdom.houseProposal) {
      return
    }

    if (getActiveHouseConstructionSite(worldStore)) {
      return
    }

    const housingPressure = Number(kingdom.housingPressure ?? 0)

    if (housingPressure <= 0) {
      return
    }

    const castle = (worldStore.buildings ?? []).find((building) => building?.type === 'castle')

    if (!castle) {
      return
    }

    const idleVillagers = getIdleVillagers(worldStore)
    const proposer = chooseRandomVillager(idleVillagers)

    if (!proposer) {
      return
    }

    const worldTiles = worldStore.world?.tiles ?? []
    const placement = findHousePlacement({
      tiles: worldTiles,
      castle,
      width: worldStore.world?.width ?? 0,
      height: worldStore.world?.height ?? 0,
      blockedEntities: getBlockingEntities(worldStore),
      allowFallback: false,
    })

    if (!placement) {
      return
    }

    const currentTick = worldStore.tick ?? 0
    kingdom.houseProposal = {
      x: placement.x,
      y: placement.y,
      proposerVillagerId: proposer.id,
      createdTick: currentTick,
    }

    worldStore.constructionSites = worldStore.constructionSites ?? []
    const hiddenSite = createConstructionSite({
      x: placement.x,
      y: placement.y,
      buildingType: 'house',
      capacity: 2,
      proposerVillagerId: proposer.id,
      createdTick: currentTick,
      revealed: false,
    })
    worldStore.constructionSites.push(hiddenSite)
    kingdom.houseProposal = null

    proposer.target = {
      type: 'constructionSite',
      tile: {
        x: placement.x,
        y: placement.y,
      },
    }
    proposer.targetId = null
    proposer.workTargetId = null
    proposer.workTargetType = null
    proposer.path = []
    proposer.pathGoalKey = null
    proposer.bubble = {
      text: getIntentBubbleText('house'),
      untilTick: currentTick + VILLAGER_INTENT_BUBBLE_DURATION_TICKS,
    }
    proposer.state = 'moving'
  }
}
