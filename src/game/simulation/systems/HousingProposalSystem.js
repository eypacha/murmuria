import { SIMULATION_TICK_MS, VILLAGER_INTENT_ACTION_DELAY_TICKS, VILLAGER_INTENT_BUBBLE_DURATION_TICKS } from '../../config/constants.js'
import { getIntentBubbleText } from './getIntentBubbleText.js'
import { UnitStateSystem } from './UnitStateSystem.js'
import { findHousePlacement } from '../../core/findHousePlacement.js'
import { getBlockingEntities } from '../../core/getBlockingEntities.js'

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
      blockedEntities: getBlockingEntities(worldStore, { includeUnits: false }),
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

    proposer.state = 'proposing_house'
    proposer.bubble = {
      text: getIntentBubbleText('house'),
      untilTick: currentTick + VILLAGER_INTENT_BUBBLE_DURATION_TICKS,
    }

    UnitStateSystem.queueTimedTransition(
      proposer,
      worldStore,
      'idle',
      VILLAGER_INTENT_ACTION_DELAY_TICKS * SIMULATION_TICK_MS,
    )
  }
}
