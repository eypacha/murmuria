import {
  ATTACK_COOLDOWN_TICKS,
  ATTACK_RANGE,
  ENEMY_KNIGHT_DAMAGE,
  TILE_SIZE,
  VILLAGER_KNIFE_DAMAGE,
} from '../../config/constants.js'
import { queueSkullEffect } from '../../core/queueSkullEffect.js'
import { VillagerHealthSystem } from './VillagerHealthSystem.js'

function getTileDistance(a, b) {
  if (!a || !b) {
    return Number.POSITIVE_INFINITY
  }

  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

function getEnemyTile(enemy) {
  if (enemy?.gridPos && Number.isFinite(enemy.gridPos.x) && Number.isFinite(enemy.gridPos.y)) {
    return enemy.gridPos
  }

  if (Number.isFinite(enemy?.x) && Number.isFinite(enemy?.y)) {
    return {
      x: Math.round(enemy.x),
      y: Math.round(enemy.y),
    }
  }

  return null
}

function getVillagerTile(villager) {
  if (villager?.gridPos && Number.isFinite(villager.gridPos.x) && Number.isFinite(villager.gridPos.y)) {
    return villager.gridPos
  }

  if (villager?.pos && Number.isFinite(villager.pos.x) && Number.isFinite(villager.pos.y)) {
    return {
      x: Math.round(villager.pos.x / TILE_SIZE),
      y: Math.round(villager.pos.y / TILE_SIZE),
    }
  }

  return null
}

function getVillagerHealth(villager) {
  return Number(villager?.status?.health ?? 0)
}

function setVillagerHealth(villager, value) {
  villager.status = villager.status ?? {}
  villager.status.health = Math.max(0, Number(value ?? 0))
}

function getEnemyById(worldStore, enemyId) {
  return (worldStore.enemies ?? []).find((enemy) => enemy?.id === enemyId) ?? null
}

function getVillagerById(worldStore, villagerId) {
  return (worldStore.units ?? []).find(
    (unit) => unit?.id === villagerId && unit?.role === 'villager',
  ) ?? null
}

function clearVillagerCombatTarget(worldStore, enemyId) {
  for (const villager of worldStore.units ?? []) {
    if (villager?.role !== 'villager' || villager.combatTargetId !== enemyId) {
      continue
    }

    villager.combatTargetId = null
    villager.combatTargetType = null
    villager.combatCooldownUntilTick = null
    villager.combatAttackUntilTick = null
    villager.combatLastAttackTick = null
  }
}

function removeEnemy(worldStore, enemy, currentTick) {
  if (!enemy) {
    return
  }

  clearVillagerCombatTarget(worldStore, enemy.id)
  queueSkullEffect(worldStore, enemy, currentTick)
  worldStore.enemies = (worldStore.enemies ?? []).filter((candidate) => candidate?.id !== enemy.id)
  enemy.hp = 0
  enemy.state = 'dead'
  enemy.path = []
  enemy.pathGoalKey = null
  enemy.combatTargetId = null
  enemy.combatTargetType = null
  enemy.combatCooldownUntilTick = null
  enemy.combatAttackUntilTick = null
  enemy.combatLastAttackTick = null
}

function applyDamageToVillager(worldStore, villager, amount, attacker, currentTick) {
  if (!villager || !attacker) {
    return
  }

  const nextHealth = getVillagerHealth(villager) - amount
  setVillagerHealth(villager, nextHealth)

  if (nextHealth <= 0) {
    VillagerHealthSystem.removeVillager(worldStore, villager)
    attacker.combatTargetId = null
    attacker.combatTargetType = null
    return
  }

  villager.combatTargetId = attacker.id
  villager.combatTargetType = 'enemy'
  villager.combatCooldownUntilTick = currentTick
  villager.combatAttackUntilTick = currentTick + 1
  villager.combatLastAttackTick = currentTick
}

function applyDamageToEnemy(worldStore, enemy, amount, currentTick) {
  if (!enemy) {
    return
  }

  enemy.hp = Math.max(0, Number(enemy.hp ?? 0) - amount)

  if (enemy.hp <= 0) {
    removeEnemy(worldStore, enemy, currentTick)
  }
}

function getEnemyCombatTarget(worldStore, enemy) {
  return getVillagerById(worldStore, enemy?.combatTargetId)
}

function getVillagerCombatTarget(worldStore, villager) {
  return getEnemyById(worldStore, villager?.combatTargetId)
}

export class EnemyCombatSystem {
  static update(worldStore) {
    const currentTick = Number.isFinite(Number(worldStore?.tick)) ? Number(worldStore.tick) : 0

    this.resolveEnemyAttacks(worldStore, currentTick)
    this.resolveVillagerCounterattacks(worldStore, currentTick)
  }

  static resolveEnemyAttacks(worldStore, currentTick) {
    for (const enemy of worldStore.enemies ?? []) {
      if (!enemy || enemy.state !== 'marching' || enemy.type !== 'knight') {
        continue
      }

      const targetVillager = getEnemyCombatTarget(worldStore, enemy)

      if (!targetVillager) {
        enemy.combatTargetId = null
        enemy.combatTargetType = null
        continue
      }

      const enemyTile = getEnemyTile(enemy)
      const villagerTile = getVillagerTile(targetVillager)

      if (!enemyTile || !villagerTile) {
        continue
      }

      if (getTileDistance(enemyTile, villagerTile) > ATTACK_RANGE) {
        continue
      }

      if (Number.isFinite(enemy.combatCooldownUntilTick) && currentTick < enemy.combatCooldownUntilTick) {
        continue
      }

      applyDamageToVillager(worldStore, targetVillager, ENEMY_KNIGHT_DAMAGE, enemy, currentTick)

      enemy.combatCooldownUntilTick = currentTick + ATTACK_COOLDOWN_TICKS
      enemy.combatAttackUntilTick = currentTick + 1
      enemy.combatLastAttackTick = currentTick
    }
  }

  static resolveVillagerCounterattacks(worldStore, currentTick) {
    for (const villager of worldStore.units ?? []) {
      if (villager?.role !== 'villager' || villager.state === 'dead') {
        continue
      }

      const targetEnemy = getVillagerCombatTarget(worldStore, villager)

      if (!targetEnemy || targetEnemy.state === 'dead' || Number(targetEnemy.hp ?? 0) <= 0) {
        villager.combatTargetId = null
        villager.combatTargetType = null
        villager.combatCooldownUntilTick = null
        villager.combatAttackUntilTick = null
        villager.combatLastAttackTick = null
        continue
      }

      const villagerTile = getVillagerTile(villager)
      const enemyTile = getEnemyTile(targetEnemy)

      if (!villagerTile || !enemyTile) {
        continue
      }

      if (getTileDistance(villagerTile, enemyTile) > ATTACK_RANGE) {
        continue
      }

      if (Number.isFinite(villager.combatCooldownUntilTick) && currentTick < villager.combatCooldownUntilTick) {
        continue
      }

      applyDamageToEnemy(worldStore, targetEnemy, VILLAGER_KNIFE_DAMAGE, currentTick)

      villager.combatCooldownUntilTick = currentTick + ATTACK_COOLDOWN_TICKS
      villager.combatAttackUntilTick = currentTick + 1
      villager.combatLastAttackTick = currentTick
    }
  }
}
