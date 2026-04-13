import { SIMULATION_TICK_MS, TILE_SIZE } from '../../config/constants.js'
import { findPath } from '../../core/findPath.js'
import { getOccupiedTiles } from '../../core/getOccupiedTiles.js'
import { isTraversableWorldTile } from '../../core/isTraversableTile.js'

const DEFAULT_STATE_DELAY_MS = 1000
const IDLE_DECISION_DELAY_MS = 1000
const TALK_DURATION_MS = 3000
const TALK_BUBBLE_SWITCH_MS = 1000
const TALK_DISTANCE_LIMIT_TILES = 10
const TALK_MEETING_SEARCH_RADIUS = 4
const TALK_BUBBLE_TEXTS = ['🙂', '😐', '🤔', '🍖', '👑', '🔥', '😭', '🍎', '🍕', '🍷', '🌎', '🏰']
const MAX_IDLE_DECISIONS_PER_TICK = 8
const IDLE_BEHAVIOR_WEIGHTS = {
  talk: 0.5,
  wander: 0.25,
  idle: 0.25,
}

function delayToTicks(delayMs) {
  return Math.max(1, Math.ceil(delayMs / SIMULATION_TICK_MS))
}

function getTileKey(tile) {
  return `${tile.x}:${tile.y}`
}

function normalizeTile(tile) {
  if (!tile) {
    return null
  }

  if (Array.isArray(tile) && tile.length >= 2) {
    return {
      x: tile[0],
      y: tile[1],
    }
  }

  if (Number.isFinite(tile.x) && Number.isFinite(tile.y)) {
    return {
      x: tile.x,
      y: tile.y,
    }
  }

  return null
}

function getUnitGridTile(unit) {
  if (unit?.gridPos && Number.isFinite(unit.gridPos.x) && Number.isFinite(unit.gridPos.y)) {
    return unit.gridPos
  }

  if (!unit?.pos) {
    return null
  }

  return {
    x: Math.floor(unit.pos.x / TILE_SIZE),
    y: Math.floor(unit.pos.y / TILE_SIZE),
  }
}

export class UnitStateSystem {
  static update(worldStore) {
    const units = worldStore.units ?? []
    const currentTick = worldStore.tick ?? 0
    const claimedUnitIds = new Set()

    const idleDecisionStride = this.getIdleDecisionStride(units.length)
    const idleCandidates = []

    for (const unit of units) {
      if (unit.kind !== 'unit') {
        continue
      }

      if (unit.stateUntilTick != null && currentTick >= unit.stateUntilTick) {
        if (unit.nextState) {
          unit.state = unit.nextState
        }

        unit.stateUntilTick = null
        unit.nextState = null
      }

      if (unit.stateUntilTick != null && currentTick < unit.stateUntilTick) {
        continue
      }

      this.ensureIdleMetadata(unit, currentTick)
    }

    for (const unit of units) {
      if (unit.kind !== 'unit') {
        continue
      }

      if (unit.idleAction === 'talk') {
        this.updateTalkPair(unit, worldStore, currentTick)
      }
    }

    for (const unit of units) {
      if (unit.kind !== 'unit') {
        continue
      }

      if (unit.state !== 'idle' || unit.idleAction !== null) {
        continue
      }

      if (claimedUnitIds.has(unit.id)) {
        continue
      }

      const idleDuration = currentTick - (unit.idleSince ?? currentTick)

      if (idleDuration < delayToTicks(IDLE_DECISION_DELAY_MS)) {
        continue
      }

      idleCandidates.push(unit)
    }

    for (const unit of idleCandidates) {
      if (!this.shouldProcessIdleDecision(unit, currentTick, idleDecisionStride)) {
        continue
      }

      const partner = this.findTalkPartner(unit, worldStore, claimedUnitIds)
      const action = this.chooseIdleBehavior(unit, worldStore, claimedUnitIds, partner)

      if (action === 'talk') {
        if (partner && this.startTalkPair(unit, partner, worldStore, currentTick)) {
          claimedUnitIds.add(unit.id)
          claimedUnitIds.add(partner.id)
          continue
        }
      }

      if (action === 'wander' && this.startWanderBehavior(unit, worldStore, currentTick)) {
        claimedUnitIds.add(unit.id)
        continue
      }

      if (action === 'idle') {
        unit.idleSince = currentTick
      }
    }
  }

  static chooseIdleBehavior(unit, worldStore, claimedUnitIds, availableTalkPartner = null) {
    const options = []

    if (availableTalkPartner) {
      options.push({ action: 'talk', weight: IDLE_BEHAVIOR_WEIGHTS.talk })
    }

    options.push({ action: 'wander', weight: IDLE_BEHAVIOR_WEIGHTS.wander })
    options.push({ action: 'idle', weight: IDLE_BEHAVIOR_WEIGHTS.idle })

    return this.chooseWeightedAction(options)
  }

  static chooseWeightedAction(options) {
    let totalWeight = 0

    for (const option of options) {
      totalWeight += Math.max(0, Number(option?.weight ?? 0))
    }

    if (totalWeight <= 0) {
      return 'idle'
    }

    const targetWeight = Math.random() * totalWeight
    let accumulatedWeight = 0

    for (const option of options) {
      const weight = Math.max(0, Number(option?.weight ?? 0))

      if (weight <= 0) {
        continue
      }

      accumulatedWeight += weight

      if (targetWeight < accumulatedWeight) {
        return option.action ?? 'idle'
      }
    }

    return options[options.length - 1]?.action ?? 'idle'
  }

  static getIdleDecisionStride(unitCount) {
    const desiredBudget = Math.max(1, MAX_IDLE_DECISIONS_PER_TICK)

    return Math.max(1, Math.ceil(Math.max(1, unitCount) / desiredBudget))
  }

  static shouldProcessIdleDecision(unit, currentTick, stride) {
    if (stride <= 1) {
      return true
    }

    const hash = this.getStableStringHash(unit.id)

    return (currentTick + hash) % stride === 0
  }

  static getStableStringHash(value) {
    const text = String(value ?? '')
    let hash = 0

    for (let index = 0; index < text.length; index += 1) {
      hash = (hash * 31 + text.charCodeAt(index)) >>> 0
    }

    return hash
  }

  static ensureIdleMetadata(unit, currentTick) {
    if (unit.idleSince == null && unit.state === 'idle') {
      unit.idleSince = currentTick
    }

    if (unit.state === 'idle' && unit.visualPos) {
      unit.visualPos = null
    }

    if (unit.idleAction !== 'wander' && unit.idleAction !== 'talk') {
      unit.idleAction = null
    }

    if (unit.talkPartner === undefined) {
      unit.talkPartner = null
    }

    if (unit.talkTargetTile === undefined) {
      unit.talkTargetTile = null
    }

    if (unit.talkStartedTick === undefined) {
      unit.talkStartedTick = null
    }

    if (unit.talkUntilTick === undefined) {
      unit.talkUntilTick = null
    }
  }

  static updateTalkPair(unit, worldStore, currentTick) {
    if (unit.state === 'talking') {
      if (unit.talkUntilTick != null && currentTick >= unit.talkUntilTick) {
        this.finishTalkPair(unit, worldStore, currentTick)
        return
      }

      if (!this.isTalkPairValid(unit, worldStore)) {
        this.cancelIdleBehavior(unit, worldStore, currentTick)
        return
      }

      const partner = this.getTalkPartnerUnit(unit, worldStore)

      if (!partner) {
        this.cancelIdleBehavior(unit, worldStore, currentTick)
        return
      }

      this.syncTalkBubble(unit, partner, currentTick)
      return
    }

    if (unit.state !== 'moving' && unit.state !== 'waiting_to_talk') {
      this.cancelIdleBehavior(unit, worldStore, currentTick)
      return
    }

    if (!this.isTalkPairValid(unit, worldStore)) {
      this.cancelIdleBehavior(unit, worldStore, currentTick)
      return
    }

    const partner = this.getTalkPartnerUnit(unit, worldStore)

    if (!partner) {
      this.cancelIdleBehavior(unit, worldStore, currentTick)
      return
    }

    if (this.areBothAtTalkTargets(unit, partner)) {
      this.startTalkConversation(unit, partner, worldStore, currentTick)
    }
  }

  static syncTalkBubble(unit, partner, currentTick) {
    if (!unit) {
      return
    }

    const startedTick = Number.isFinite(unit.talkStartedTick) ? unit.talkStartedTick : null

    if (startedTick == null) {
      return
    }

    const partnerId = partner?.id

    if (!partnerId) {
      return
    }

    const switchTicks = delayToTicks(TALK_BUBBLE_SWITCH_MS)
    const turnIndex = Math.floor(Math.max(0, currentTick - startedTick) / switchTicks)
    const leadId = unit.id <= partnerId ? unit.id : partnerId
    const activeSpeakerId =
      turnIndex % 2 === 0 ? leadId : (leadId === unit.id ? partnerId : unit.id)

    if (activeSpeakerId !== unit.id) {
      return
    }

    const bubble = unit.bubble

    if (bubble && Number.isFinite(bubble.untilTick) && bubble.untilTick > currentTick) {
      return
    }

    unit.bubble = {
      text: TALK_BUBBLE_TEXTS[Math.floor(Math.random() * TALK_BUBBLE_TEXTS.length)] ?? TALK_BUBBLE_TEXTS[0],
      untilTick: currentTick + switchTicks,
    }
  }

  static isTalkPairValid(unit, worldStore) {
    const partner = this.getTalkPartnerUnit(unit, worldStore)

    if (!partner) {
      return false
    }

    if (partner.talkPartner !== unit) {
      return false
    }

    if (partner.idleAction !== 'talk') {
      return false
    }

    if (
      partner.state !== 'moving' &&
      partner.state !== 'waiting_to_talk' &&
      partner.state !== 'talking'
    ) {
      return false
    }

    const unitTargetTile = normalizeTile(unit.talkTargetTile)
    const partnerTargetTile = normalizeTile(partner.talkTargetTile)

    if (!unitTargetTile || !partnerTargetTile) {
      return false
    }

    return true
  }

  static areBothAtTalkTargets(unit, partner) {
    const unitTargetTile = normalizeTile(unit.talkTargetTile)
    const partnerTargetTile = normalizeTile(partner.talkTargetTile)

    if (!unitTargetTile || !partnerTargetTile) {
      return false
    }

    const unitGridTile = getUnitGridTile(unit)
    const partnerGridTile = getUnitGridTile(partner)

    if (!unitGridTile || !partnerGridTile) {
      return false
    }

    return (
      unitGridTile.x === unitTargetTile.x &&
      unitGridTile.y === unitTargetTile.y &&
      partnerGridTile.x === partnerTargetTile.x &&
      partnerGridTile.y === partnerTargetTile.y
    )
  }

  static findTalkPartner(unit, worldStore, claimedUnitIds) {
    const unitGridTile = getUnitGridTile(unit)

    if (!unitGridTile) {
      return null
    }

    const nearbyUnits = this.getNearbyUnits(worldStore, unitGridTile, TALK_DISTANCE_LIMIT_TILES)
    let bestPartner = null
    let bestDistance = Number.POSITIVE_INFINITY

    for (const candidate of nearbyUnits) {
      if (candidate.kind !== 'unit' || candidate.id === unit.id) {
        continue
      }

      if (claimedUnitIds.has(candidate.id)) {
        continue
      }

      if (candidate.state !== 'idle' || candidate.idleAction !== null) {
        continue
      }

      const candidateGridTile = getUnitGridTile(candidate)

      if (!candidateGridTile) {
        continue
      }

      const distance = Math.hypot(candidateGridTile.x - unitGridTile.x, candidateGridTile.y - unitGridTile.y)

      if (distance > TALK_DISTANCE_LIMIT_TILES) {
        continue
      }

      if (distance < bestDistance || (distance === bestDistance && candidate.id < (bestPartner?.id ?? ''))) {
        bestPartner = candidate
        bestDistance = distance
      }
    }

    return bestPartner
  }

  static startTalkPair(unitA, unitB, worldStore, currentTick) {
    const assignment = this.findTalkAssignment(unitA, unitB, worldStore)

    if (!assignment) {
      return false
    }

    const { unitLeft, unitRight, leftTile, rightTile } = assignment

    if (!this.prepareTalkUnit(unitLeft, unitRight, leftTile, worldStore)) {
      return false
    }

    if (!this.prepareTalkUnit(unitRight, unitLeft, rightTile, worldStore)) {
      return false
    }

    if (this.areBothAtTalkTargets(unitLeft, unitRight)) {
      this.startTalkConversation(unitLeft, unitRight, worldStore, currentTick)
    }

    return true
  }

  static findTalkAssignment(unitA, unitB, worldStore) {
    const unitATile = getUnitGridTile(unitA)
    const unitBTile = getUnitGridTile(unitB)

    if (!unitATile || !unitBTile) {
      return null
    }

    const occupiedTiles = worldStore.simulationCache?.occupiedTiles?.occupiedTiles ?? this.buildOccupiedTileSet(worldStore)
    const baseLeftTile = {
      x: Math.floor((unitATile.x + unitBTile.x - 1) / 2),
      y: Math.floor((unitATile.y + unitBTile.y) / 2),
    }
    const searchRadius = 2
    let bestAssignment = null

    for (let radius = 0; radius <= searchRadius; radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const leftTile = {
            x: baseLeftTile.x + dx,
            y: baseLeftTile.y + dy,
          }
          const rightTile = {
            x: leftTile.x + 1,
            y: leftTile.y,
          }

          const directAssignment = this.scoreTalkAssignmentByDistance(
            worldStore,
            unitATile,
            unitBTile,
            unitA,
            unitB,
            leftTile,
            rightTile,
            occupiedTiles,
          )

          const swappedAssignment = this.scoreTalkAssignmentByDistance(
            worldStore,
            unitATile,
            unitBTile,
            unitA,
            unitB,
            rightTile,
            leftTile,
            occupiedTiles,
          )

          if (!directAssignment && !swappedAssignment) {
            continue
          }

          const candidateAssignment = !swappedAssignment
            ? directAssignment
            : !directAssignment
              ? swappedAssignment
              : (this.compareTalkAssignments(directAssignment, swappedAssignment) <= 0
                  ? directAssignment
                  : swappedAssignment)

          if (!bestAssignment || this.compareTalkAssignments(candidateAssignment, bestAssignment) < 0) {
            bestAssignment = candidateAssignment
          }
        }
      }
    }

    return bestAssignment
  }

  static scoreTalkAssignmentByDistance(
    worldStore,
    unitATile,
    unitBTile,
    unitA,
    unitB,
    leftTile,
    rightTile,
    occupiedTiles,
  ) {
    if (!this.isValidMeetingPair(worldStore, leftTile, rightTile, occupiedTiles)) {
      return null
    }

    const distanceA = Math.abs(unitATile.x - leftTile.x) + Math.abs(unitATile.y - leftTile.y)
    const distanceB = Math.abs(unitBTile.x - rightTile.x) + Math.abs(unitBTile.y - rightTile.y)

    return {
      unitLeft: unitA,
      unitRight: unitB,
      leftTile,
      rightTile,
      score: this.getTalkScore(worldStore, leftTile, rightTile, unitA, unitB),
      pathDistance: distanceA + distanceB,
    }
  }

  static getTalkScore(worldStore, leftTile, rightTile, unitA, unitB) {
    const unitATile = getUnitGridTile(unitA)
    const unitBTile = getUnitGridTile(unitB)

    if (!unitATile || !unitBTile) {
      return {
        balance: Number.POSITIVE_INFINITY,
        total: Number.POSITIVE_INFINITY,
      }
    }

    const pathA = Math.abs(unitATile.x - leftTile.x) + Math.abs(unitATile.y - leftTile.y)
    const pathB = Math.abs(unitBTile.x - rightTile.x) + Math.abs(unitBTile.y - rightTile.y)

    return {
      balance: Math.abs(pathA - pathB),
      total: pathA + pathB,
    }
  }

  static compareTalkAssignments(a, b) {
    if (a.score.balance !== b.score.balance) {
      return a.score.balance - b.score.balance
    }

    if (a.score.total !== b.score.total) {
      return a.score.total - b.score.total
    }

    return 0
  }

  static isValidMeetingPair(worldStore, leftTile, rightTile, occupiedTiles = null) {
    if (!leftTile || !rightTile) {
      return false
    }

    if (rightTile.x !== leftTile.x + 1 || rightTile.y !== leftTile.y) {
      return false
    }

    const occupiedSet =
      occupiedTiles instanceof Set
        ? occupiedTiles
        : worldStore.simulationCache?.occupiedTiles?.occupiedTiles ?? this.buildOccupiedTileSet(worldStore)

    return (
      isTraversableWorldTile(worldStore, leftTile) &&
      isTraversableWorldTile(worldStore, rightTile) &&
      !occupiedSet.has(getTileKey(leftTile)) &&
      !occupiedSet.has(getTileKey(rightTile))
    )
  }

  static buildOccupiedTileSet(worldStore, ignoredIds = new Set()) {
    const occupiedTiles = new Set()
    const entities = [
      ...(worldStore.buildings ?? []),
      ...(worldStore.constructionSites ?? []),
      ...(worldStore.houses ?? []),
      ...(worldStore.resources ?? []),
      ...(worldStore.units ?? []),
    ]

    for (const entity of entities) {
      if (!entity?.gridPos || ignoredIds.has(entity.id)) {
        continue
      }

      for (const occupiedTile of getOccupiedTiles(entity)) {
        occupiedTiles.add(getTileKey(occupiedTile))
      }
    }

    return occupiedTiles
  }

  static startTalkConversation(unitA, unitB, worldStore, currentTick) {
    unitA.state = 'talking'
    unitB.state = 'talking'
    unitA.talkStartedTick = currentTick
    unitB.talkStartedTick = currentTick
    unitA.talkUntilTick = currentTick + delayToTicks(TALK_DURATION_MS)
    unitB.talkUntilTick = currentTick + delayToTicks(TALK_DURATION_MS)
    unitA.path = []
    unitB.path = []
    unitA.pathGoalKey = null
    unitB.pathGoalKey = null
    unitA.target = null
    unitB.target = null
    unitA.idleSince = null
    unitB.idleSince = null
    this.syncFacingForConversation(unitA, unitB)
    this.syncTalkBubble(unitA, unitB, currentTick)
    this.syncTalkBubble(unitB, unitA, currentTick)
  }

  static syncFacingForConversation(unitA, unitB) {
    const unitATile = normalizeTile(unitA.talkTargetTile)
    const unitBTile = normalizeTile(unitB.talkTargetTile)

    if (!unitATile || !unitBTile) {
      return
    }

    if (unitATile.x < unitBTile.x) {
      unitA.facing = 'right'
      unitB.facing = 'left'
      return
    }

    if (unitATile.x > unitBTile.x) {
      unitA.facing = 'left'
      unitB.facing = 'right'
    }
  }

  static startWanderBehavior(unit, worldStore, currentTick) {
    const targetTile = this.findWanderTarget(unit, worldStore)

    if (!targetTile) {
      return false
    }

    unit.idleAction = 'wander'
    unit.state = 'moving'
    unit.idleSince = null
    unit.talkPartner = null
    unit.talkTargetTile = null
    unit.talkStartedTick = null
    unit.talkUntilTick = null
    unit.target = {
      type: 'wander',
      id: `${unit.id}-wander-${currentTick}`,
      tile: targetTile,
    }
    unit.path = []
    unit.pathGoalKey = null

    return true
  }

  static findWanderTarget(unit, worldStore) {
    const unitTile = getUnitGridTile(unit)

    if (!unitTile) {
      return null
    }

    const occupiedTiles = worldStore.simulationCache?.occupiedTiles?.occupiedTiles ?? null
    const candidates = []

    for (let radius = 1; radius <= 4; radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          candidates.push({ dx, dy })
        }
      }
    }

    for (let index = candidates.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      const temp = candidates[index]
      candidates[index] = candidates[swapIndex]
      candidates[swapIndex] = temp
    }

    for (const offset of candidates) {
      const candidate = {
        x: unitTile.x + offset.dx,
        y: unitTile.y + offset.dy,
      }

      if (candidate.x === unitTile.x && candidate.y === unitTile.y) {
        continue
      }

      if (!isTraversableWorldTile(worldStore, candidate)) {
        continue
      }

      if (occupiedTiles?.has(getTileKey(candidate))) {
        continue
      }

      return candidate
    }

    return null
  }

  static prepareTalkUnit(unit, partner, targetTile, worldStore) {
    const currentTile = getUnitGridTile(unit)

    if (!currentTile) {
      return false
    }

    unit.idleAction = 'talk'
    unit.talkPartner = partner
    unit.talkTargetTile = [targetTile.x, targetTile.y]
    unit.talkStartedTick = null
    unit.talkUntilTick = null
    unit.state = 'moving'
    unit.idleSince = null
    unit.target = {
      type: 'talk',
      id: partner.id,
      tile: {
        x: targetTile.x,
        y: targetTile.y,
      },
    }
    unit.path = []
    unit.pathGoalKey = null

    const path = findPath(worldStore, currentTile, targetTile)

    if (currentTile.x === targetTile.x && currentTile.y === targetTile.y) {
      return true
    }

    if (path.length === 0) {
      this.cancelIdleBehavior(unit, worldStore, worldStore.tick ?? 0)
      return false
    }

    return true
  }

  static getTalkPartnerUnit(unit, worldStore) {
    const partner = unit.talkPartner

    if (!partner) {
      return null
    }

    if (typeof partner === 'string') {
      return (worldStore.units ?? []).find((unit) => unit.id === partner) ?? null
    }

    return partner
  }

  static finishTalkPair(unit, worldStore, currentTick) {
    const partner = this.getTalkPartnerUnit(unit, worldStore)

    for (const subject of [unit, partner]) {
      if (!subject) {
        continue
      }

      this.resetTalkFields(subject)
      this.clearBubble(subject)

      if (subject.state === 'talking' || subject.state === 'moving' || subject.state === 'waiting_to_talk') {
        subject.state = 'idle'
      }

      subject.idleSince = currentTick
      subject.target = null
      subject.path = []
      subject.pathGoalKey = null
    }
  }

  static cancelIdleBehavior(unit, worldStore, currentTick) {
    if (unit.idleAction === 'talk') {
      const partner = this.getTalkPartnerUnit(unit, worldStore)

      for (const subject of [unit, partner]) {
        if (!subject) {
          continue
        }

        this.resetTalkFields(subject)
        this.clearBubble(subject)

        if (subject.state === 'talking' || subject.state === 'moving' || subject.state === 'waiting_to_talk') {
          subject.state = 'idle'
          subject.idleSince = currentTick
        }

        if (subject.target?.type === 'talk') {
          subject.target = null
        }

        subject.path = []
        subject.pathGoalKey = null
      }

      return
    }

    if (unit.idleAction === 'wander') {
      this.clearWanderFields(unit, currentTick)
    }
  }

  static clearWanderFields(unit, currentTick) {
    unit.idleAction = null
    unit.state = 'idle'
    unit.idleSince = currentTick
    unit.target = null
    unit.path = []
    unit.pathGoalKey = null
    unit.talkPartner = null
    unit.talkTargetTile = null
    unit.talkStartedTick = null
    unit.talkUntilTick = null
  }

  static resetTalkFields(unit) {
    unit.idleAction = null
    unit.talkPartner = null
    unit.talkTargetTile = null
    unit.talkStartedTick = null
    unit.talkUntilTick = null
  }

  static clearBubble(unit) {
    if (unit?.bubble) {
      unit.bubble = null
    }
  }

  static queueTimedTransition(unit, worldStore, nextState, delayMs = DEFAULT_STATE_DELAY_MS) {
    const currentTick = worldStore.tick ?? 0

    unit.stateUntilTick = currentTick + delayToTicks(delayMs)
    unit.nextState = nextState
  }

  static getNearbyUnits(worldStore, centerTile, radius) {
    const cache = worldStore.simulationCache?.unitsByTile

    if (!cache) {
      return worldStore.units ?? []
    }

    const results = []

    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const key = getTileKey({
          x: centerTile.x + dx,
          y: centerTile.y + dy,
        })
        const unitsAtTile = cache.get(key)

        if (!unitsAtTile) {
          continue
        }

        results.push(...unitsAtTile)
      }
    }

    return results
  }
}
