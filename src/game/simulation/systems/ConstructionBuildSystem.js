import { isStartupGracePeriod } from '../../core/isStartupGracePeriod.js'
import {
  HOUSE_BUILD_TIME_MS,
  SIMULATION_TICK_MS,
  VILLAGER_INTENT_ACTION_DELAY_TICKS,
  VILLAGER_INTENT_BUBBLE_DURATION_TICKS,
} from '../../config/constants.js'
import { findPath } from '../../core/findPath.js'
import { createHouse } from '../../domain/factories/createHouse.js'
import { UnitStateSystem } from './UnitStateSystem.js'
import { getIntentBubbleText } from './getIntentBubbleText.js'

function getHouseConstructionSites(worldStore) {
  return (worldStore.constructionSites ?? []).filter((site) => {
    return site?.type === 'constructionSite' && site?.buildingType === 'house' && site?.revealed !== false
  })
}

function getBuildReadySites(worldStore) {
  return getHouseConstructionSites(worldStore).filter((site) => {
    const woodRequired = Math.max(0, Number(site?.woodRequired ?? 0))
    const woodDelivered = Math.max(0, Number(site?.woodDelivered ?? 0))
    const buildRequiredMs = Math.max(0, Number(site?.buildRequiredMs ?? HOUSE_BUILD_TIME_MS))
    const buildProgressMs = Math.max(0, Number(site?.buildProgressMs ?? 0))

    return woodRequired > 0 && woodDelivered >= woodRequired && buildProgressMs < buildRequiredMs
  })
}

function getIdleVillagers(worldStore) {
  return (worldStore.units ?? []).filter((unit) => {
    return (
      unit?.role === 'villager' &&
      unit.state === 'idle' &&
      !unit.constructionDelivery &&
      !unit.constructionBuild &&
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

function getHorizontalBuildCandidates(site) {
  const position = site.gridPos ?? { x: site.x ?? 0, y: site.y ?? 0 }
  const footprint = site.footprint ?? { w: 1, h: 1 }
  const candidates = []
  const seen = new Set()

  const pushCandidate = (x, y) => {
    const key = `${x}:${y}`

    if (seen.has(key)) {
      return
    }

    seen.add(key)
    candidates.push({ x, y })
  }

  for (let dy = 0; dy < footprint.h; dy += 1) {
    pushCandidate(position.x - 1, position.y + dy)
    pushCandidate(position.x + footprint.w, position.y + dy)
  }

  return candidates
}

export function getConstructionBuildFacing(site, targetTile) {
  const position = site?.gridPos ?? { x: site?.x ?? 0, y: site?.y ?? 0 }
  const footprint = site?.footprint ?? { w: 1, h: 1 }
  const siteCenterX = position.x + Math.floor(footprint.w / 2)

  if (!targetTile) {
    return 'right'
  }

  if (targetTile.x < siteCenterX) {
    return 'right'
  }

  if (targetTile.x > siteCenterX) {
    return 'left'
  }

  return 'right'
}

function getActiveBuilders(worldStore, site) {
  const siteId = site?.id

  if (!siteId) {
    return []
  }

  return (worldStore.units ?? []).filter((unit) => {
    return (
      unit?.role === 'villager' &&
      unit.constructionBuild?.siteId === siteId &&
      unit.state === 'building'
    )
  })
}

function clearBuilderAssignment(unit, worldStore, currentTick) {
  if (!unit) {
    return
  }

  unit.constructionBuild = null
  unit.target = null
  unit.targetId = null
  unit.workTargetId = null
  unit.workTargetType = null
  unit.path = []
  unit.pathGoalKey = null
  unit.interactionFacing = null
  unit.state = 'idle'
  unit.idleSince = currentTick
  unit.idleAction = null
  unit.stateUntilTick = null
  unit.nextState = null

  if (worldStore?.tick != null) {
    unit.idleSince = worldStore.tick
  }
}

function completeSite(site, worldStore, currentTick) {
  const siteIndex = (worldStore.constructionSites ?? []).findIndex((candidate) => candidate?.id === site.id)

  if (siteIndex === -1) {
    return
  }

  const house = createHouse(
    site.gridPos?.x ?? site.x ?? 0,
    site.gridPos?.y ?? site.y ?? 0,
    site.variant ?? 0,
    site.capacity ?? 2,
  )

  worldStore.houses = worldStore.houses ?? []
  worldStore.houses.push(house)

  for (const unit of worldStore.units ?? []) {
    if (unit?.constructionBuild?.siteId !== site.id) {
      continue
    }

    clearBuilderAssignment(unit, worldStore, currentTick)
  }

  worldStore.constructionSites.splice(siteIndex, 1)
}

function isInsideWorld(worldStore, tile) {
  const width = worldStore.world?.width ?? 0
  const height = worldStore.world?.height ?? 0

  return tile.x >= 0 && tile.y >= 0 && tile.x < width && tile.y < height
}

function isWalkable(worldStore, tile) {
  const tiles = worldStore.world?.tiles ?? []
  return tiles?.[tile.y]?.[tile.x]?.walkable ?? false
}

function getBuildTargetTile(site, worldStore, villager, claimedTargetKeys = new Set()) {
  if (!site?.gridPos || !villager?.gridPos) {
    return null
  }

  const occupiedTiles = new Set()
  const entities = [
    ...(worldStore.buildings ?? []),
    ...(worldStore.constructionSites ?? []),
    ...(worldStore.houses ?? []),
    ...(worldStore.resources ?? []),
    ...(worldStore.units ?? []),
  ]

  for (const entity of entities) {
    if (!entity?.gridPos || entity.id === villager.id) {
      continue
    }

    const footprint = entity.footprint ?? { w: 1, h: 1 }
    const position = entity.gridPos

    for (let dy = 0; dy < footprint.h; dy += 1) {
      for (let dx = 0; dx < footprint.w; dx += 1) {
        occupiedTiles.add(`${position.x + dx}:${position.y + dy}`)
      }
    }
  }

  let bestTile = null
  let bestPathLength = Number.POSITIVE_INFINITY

  for (const candidate of getHorizontalBuildCandidates(site)) {
    const candidateKey = `${candidate.x}:${candidate.y}`

    if (claimedTargetKeys.has(candidateKey)) {
      continue
    }

    if (occupiedTiles.has(candidateKey)) {
      continue
    }

    if (!isInsideWorld(worldStore, candidate)) {
      continue
    }

    if (!isWalkable(worldStore, candidate)) {
      continue
    }

    const path = findPath(worldStore, villager.gridPos, candidate)
    const pathLength =
      candidate.x === villager.gridPos.x && candidate.y === villager.gridPos.y ? 0 : path.length

    if (pathLength === 0 && (candidate.x !== villager.gridPos.x || candidate.y !== villager.gridPos.y)) {
      continue
    }

    if (pathLength < bestPathLength) {
      bestPathLength = pathLength
      bestTile = candidate
    }
  }

  return bestTile
}

export class ConstructionBuildAssignmentSystem {
  static update(worldStore) {
    const kingdom = worldStore?.kingdom

    if (!kingdom) {
      return
    }

    if (isStartupGracePeriod(worldStore)) {
      return
    }

    const sites = getBuildReadySites(worldStore)

    if (sites.length === 0) {
      return
    }

    const idleVillagers = getIdleVillagers(worldStore)

    if (idleVillagers.length === 0) {
      return
    }

    const currentTick = worldStore.tick ?? 0
    const shuffledVillagers = [...idleVillagers]
    shuffleInPlace(shuffledVillagers)
    const claimedTargetKeys = new Set()

    for (const site of sites) {
      if (!Array.isArray(site.builderVillagerIds)) {
        site.builderVillagerIds = []
      }

      for (const villager of shuffledVillagers) {
        if (villager.constructionBuild) {
          continue
        }

        const targetTile = getBuildTargetTile(site, worldStore, villager, claimedTargetKeys)

        if (!targetTile) {
          continue
        }

        claimedTargetKeys.add(`${targetTile.x}:${targetTile.y}`)
        site.builderVillagerIds.push(villager.id)
        site.builderVillagerIds = [...new Set(site.builderVillagerIds)]

        if (site.buildStartedTick == null) {
          site.buildStartedTick = currentTick
        }

        UnitStateSystem.cancelIdleBehavior(villager, worldStore, currentTick)
        villager.constructionBuild = {
          siteId: site.id,
          assignedTick: currentTick,
          targetTile,
        }
        villager.targetId = site.id
        villager.target = {
          type: 'constructionSite',
          id: site.id,
          tile: targetTile,
        }
        villager.path = []
        villager.pathGoalKey = null
        villager.workTargetId = null
        villager.workTargetType = 'constructionSite'
        villager.interactionFacing = getConstructionBuildFacing(site, targetTile)
        villager.facing = villager.interactionFacing
        villager.state = 'preparing_to_construction_site'

        const intentText = getIntentBubbleText('construction_build')

        if (intentText) {
          villager.bubble = {
            text: intentText,
            untilTick: currentTick + VILLAGER_INTENT_BUBBLE_DURATION_TICKS,
          }
        }

        UnitStateSystem.queueTimedTransition(
          villager,
          worldStore,
          'moving_to_construction_site',
          VILLAGER_INTENT_ACTION_DELAY_TICKS * SIMULATION_TICK_MS,
        )
      }
    }
  }
}

export class ConstructionBuildProgressSystem {
  static update(worldStore) {
    const sites = getBuildReadySites(worldStore)

    if (sites.length === 0) {
      return
    }

    if (isStartupGracePeriod(worldStore)) {
      return
    }

    const deltaMs = SIMULATION_TICK_MS
    const currentTick = worldStore.tick ?? 0

    for (const site of sites) {
      const activeBuilders = getActiveBuilders(worldStore, site)
      const builderCount = activeBuilders.length

      if (builderCount <= 0) {
        continue
      }

      const buildRequiredMs = Math.max(0, Number(site.buildRequiredMs ?? HOUSE_BUILD_TIME_MS))
      const currentProgress = Math.max(0, Number(site.buildProgressMs ?? 0))
      const nextProgress = Math.min(buildRequiredMs, currentProgress + deltaMs * builderCount)

      site.buildProgressMs = nextProgress

      if (nextProgress < buildRequiredMs) {
        continue
      }

      completeSite(site, worldStore, currentTick)
    }
  }
}
