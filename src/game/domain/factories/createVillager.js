import {
  TILE_SIZE,
  UNIT_INITIAL_HEALTH
} from '../../config/constants.js'

function getWorldPosition(x, y) {
  return {
    x: x * TILE_SIZE + TILE_SIZE / 2,
    y: y * TILE_SIZE + TILE_SIZE / 2,
  }
}

function createCryptoUUID() {
  return globalThis.crypto?.randomUUID?.() ?? `villager-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function createVillager(x = 0, y = 0, facing = 'right', overrides = {}) {
  const gridPos = overrides.gridPos ?? { x, y }
  const pos = overrides.pos ?? getWorldPosition(gridPos.x, gridPos.y)

  return {
    id: overrides.id ?? createCryptoUUID(),
    kind: 'unit',
    role: 'villager',
    state: overrides.state ?? 'idle',
    isChild: overrides.isChild ?? false,
    growAtTick: overrides.growAtTick ?? null,
    lastReproduceTick: overrides.lastReproduceTick ?? null,
    reproductionTaskId: overrides.reproductionTaskId ?? null,
    reproductionHouseId: overrides.reproductionHouseId ?? null,
    reproductionPartnerId: overrides.reproductionPartnerId ?? null,
    reproductionReadyTick: overrides.reproductionReadyTick ?? null,
    reproductionUntilTick: overrides.reproductionUntilTick ?? null,
    reproductionOriginPos: overrides.reproductionOriginPos ?? null,
    visualPos: overrides.visualPos ?? null,
    idleSince: overrides.idleSince ?? null,
    idleAction: overrides.idleAction ?? null,
    talkPartner: overrides.talkPartner ?? null,
    talkTargetTile: overrides.talkTargetTile ?? null,
    bubble: overrides.bubble ?? null,
    status: {
      health: UNIT_INITIAL_HEALTH,
      ...(overrides.status ?? {}),
    },
    facing,
    gridPos,
    pos,
    targetId: overrides.targetId ?? null,
    target: overrides.target ?? null,
    combatTargetId: overrides.combatTargetId ?? null,
    combatTargetType: overrides.combatTargetType ?? null,
    combatLockedByEnemyId: overrides.combatLockedByEnemyId ?? null,
    combatCooldownUntilTick: overrides.combatCooldownUntilTick ?? null,
    combatAttackUntilTick: overrides.combatAttackUntilTick ?? null,
    combatLastAttackTick: overrides.combatLastAttackTick ?? null,
    intent: overrides.intent ?? null,
    decisionLockUntilTick: overrides.decisionLockUntilTick ?? 0,
    lastDecision: overrides.lastDecision ?? null,
    workTargetType: overrides.workTargetType ?? null,
    workTargetId: overrides.workTargetId ?? null,
    workTargetTile: overrides.workTargetTile ?? null,
    constructionDelivery: overrides.constructionDelivery ?? null,
    constructionBuild: overrides.constructionBuild ?? null,
    interactionFacing: overrides.interactionFacing ?? null,
    stateUntilTick: overrides.stateUntilTick ?? null,
    nextState: overrides.nextState ?? null,
    path: Array.isArray(overrides.path) ? [...overrides.path] : [],
    pathGoalKey: overrides.pathGoalKey ?? null,
    inventory: {
      wood: 0,
      gold: 0,
      meat: 0,
      ...(overrides.inventory ?? {}),
    },
    equipment: {
      tool: null,
      ...(overrides.equipment ?? {}),
    },
  }
}
