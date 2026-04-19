import { DecisionSystem } from './DecisionSystem.js'
import { UnitStateSystem } from './UnitStateSystem.js'
import { ReproductionSystem } from './ReproductionSystem.js'
import { queueSkullEffect } from '../../core/queueSkullEffect.js'

function getVillagerHealth(unit) {
  unit.status = unit.status ?? {}

  if (!Number.isFinite(unit.status.health)) {
    unit.status.health = 100
  }

  return unit.status.health
}

function setVillagerHealth(unit, value) {
  unit.status = unit.status ?? {}
  unit.status.health = Math.max(0, Number(value ?? 0))
}

function getTickHash(value) {
  const text = String(value ?? '')
  let hash = 0

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0
  }

  return hash
}

function shouldTakeStarvationDamage(unit, currentTick) {
  const roll = (getTickHash(`${unit.id}:${currentTick}`) % 100) / 100

  return roll < 0.3
}

function clearConstructionSlot(worldStore, siteId, villagerId) {
  const site = (worldStore.constructionSites ?? []).find((candidate) => candidate?.id === siteId)

  if (!site) {
    return
  }

  if (Array.isArray(site.builderSlots)) {
    for (const slot of site.builderSlots) {
      if (slot?.villagerId === villagerId) {
        slot.villagerId = null
      }
    }
  }

  if (Array.isArray(site.builderVillagerIds)) {
    site.builderVillagerIds = site.builderVillagerIds.filter((id) => id !== villagerId)
  }
}

function releaseConstructionDelivery(worldStore, unit) {
  const delivery = unit.constructionDelivery

  if (!delivery) {
    return
  }

  const amount = Math.max(0, Number(delivery.amount ?? 0))
  const site = (worldStore.constructionSites ?? []).find((candidate) => candidate?.id === delivery.siteId)

  if (site) {
    site.woodReserved = Math.max(0, Number(site.woodReserved ?? 0) - amount)
  }

  if (delivery.route === 'castle') {
    worldStore.kingdom = worldStore.kingdom ?? {}
    worldStore.kingdom.constructionWoodReserved = Math.max(
      0,
      Number(worldStore.kingdom.constructionWoodReserved ?? 0) - amount,
    )
  }

  const resource = (worldStore.resources ?? []).find((candidate) => candidate?.id === unit.workTargetId)
  const targetTile = unit.workTargetTile ?? unit.target?.tile ?? null

  if (resource && targetTile) {
    DecisionSystem.releaseResourceTargetTile(resource, targetTile)
    resource.reservedBy = null
  }
}

function releaseTargetReservation(worldStore, unit) {
  const resourceId = unit.workTargetId ?? unit.targetId
  const targetTile = unit.workTargetTile ?? unit.target?.tile ?? null

  if (!resourceId || !targetTile) {
    return
  }

  const resource = (worldStore.resources ?? []).find((candidate) => candidate?.id === resourceId)

  if (!resource) {
    return
  }

  DecisionSystem.releaseResourceTargetTile(resource, targetTile)
  resource.reservedBy = null
}

function clearUnitState(unit) {
  unit.status = unit.status ?? {}
  unit.status.health = 0
  unit.intent = null
  unit.lastDecision = null
  unit.targetId = null
  unit.target = null
  unit.workTargetId = null
  unit.workTargetType = null
  unit.workTargetTile = null
  unit.constructionDelivery = null
  unit.constructionBuild = null
  unit.bubble = null
  unit.idleAction = null
  unit.idleSince = null
  unit.talkPartner = null
  unit.talkTargetTile = null
  unit.talkStartedTick = null
  unit.talkUntilTick = null
  unit.interactionFacing = null
  unit.path = []
  unit.pathGoalKey = null
  unit.reproductionTaskId = null
  unit.reproductionHouseId = null
  unit.reproductionPartnerId = null
  unit.reproductionReadyTick = null
  unit.reproductionUntilTick = null
  unit.combatTargetId = null
  unit.combatTargetType = null
  unit.combatLockedByEnemyId = null
  unit.combatCooldownUntilTick = null
  unit.combatAttackUntilTick = null
  unit.combatLastAttackTick = null
  unit.state = 'dead'
}

export class VillagerHealthSystem {
  static update(worldStore) {
    if (!worldStore?.kingdom) {
      return
    }

    const hunger = Number(worldStore.kingdom.hunger ?? 0)
    const units = worldStore.units ?? []

    if (units.length === 0) {
      return
    }

    const survivors = []

    for (const unit of units) {
      if (unit?.role !== 'villager') {
        survivors.push(unit)
        continue
      }

      const currentHealth = getVillagerHealth(unit)

      if (currentHealth <= 0) {
        this.removeVillager(worldStore, unit)
        continue
      }

      if (hunger >= 1 && shouldTakeStarvationDamage(unit, worldStore.tick ?? 0)) {
        setVillagerHealth(unit, currentHealth - 1)
      }

      if (getVillagerHealth(unit) <= 0) {
        this.removeVillager(worldStore, unit)
        continue
      }

      survivors.push(unit)
    }

    worldStore.units = survivors
  }

  static removeVillager(worldStore, unit) {
    if (!unit) {
      return
    }

    const currentTick = worldStore.tick ?? 0

    UnitStateSystem.cancelIdleBehavior(unit, worldStore, currentTick)
    ReproductionSystem.cancelUnitParticipation(worldStore, unit, currentTick)

    if (unit.constructionBuild?.siteId && unit.id) {
      clearConstructionSlot(worldStore, unit.constructionBuild.siteId, unit.id)
    }

    releaseTargetReservation(worldStore, unit)
    releaseConstructionDelivery(worldStore, unit)

    queueSkullEffect(worldStore, unit, currentTick)

    clearUnitState(unit)
  }
}
