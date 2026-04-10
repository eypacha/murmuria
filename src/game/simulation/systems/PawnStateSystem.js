import { SIMULATION_TICK_MS, TILE_SIZE } from '../../config/constants.js'
import { findPath } from '../../core/findPath.js'
import { getOccupiedTiles } from '../../core/getOccupiedTiles.js'
import { isTraversableWorldTile } from '../../core/isTraversableTile.js'

const DEFAULT_STATE_DELAY_MS = 1000
const IDLE_DECISION_DELAY_MS = 1000
const TALK_DURATION_MS = 3000
const TALK_DISTANCE_LIMIT_TILES = 10
const TALK_MEETING_SEARCH_RADIUS = 4

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

function getPawnGridTile(pawn) {
  if (pawn?.gridPos && Number.isFinite(pawn.gridPos.x) && Number.isFinite(pawn.gridPos.y)) {
    return pawn.gridPos
  }

  if (!pawn?.pos) {
    return null
  }

  return {
    x: Math.floor(pawn.pos.x / TILE_SIZE),
    y: Math.floor(pawn.pos.y / TILE_SIZE),
  }
}

export class PawnStateSystem {
  static update(worldStore) {
    const pawns = worldStore.units ?? []
    const currentTick = worldStore.tick ?? 0
    const claimedPawnIds = new Set()

    for (const pawn of pawns) {
      if (pawn.role !== 'pawn') {
        continue
      }

      if (pawn.stateUntilTick != null && currentTick >= pawn.stateUntilTick) {
        if (pawn.nextState) {
          pawn.state = pawn.nextState
        }

        pawn.stateUntilTick = null
        pawn.nextState = null
      }

      if (pawn.stateUntilTick != null && currentTick < pawn.stateUntilTick) {
        continue
      }

      this.ensureIdleMetadata(pawn, currentTick)
    }

    for (const pawn of pawns) {
      if (pawn.role !== 'pawn') {
        continue
      }

      if (pawn.idleAction === 'talk') {
        this.updateTalkPair(pawn, worldStore, currentTick)
      }
    }

    for (const pawn of pawns) {
      if (pawn.role !== 'pawn') {
        continue
      }

      if (pawn.state !== 'idle' || pawn.idleAction !== null) {
        continue
      }

      if (claimedPawnIds.has(pawn.id)) {
        continue
      }

      const idleDuration = currentTick - (pawn.idleSince ?? currentTick)

      if (idleDuration < delayToTicks(IDLE_DECISION_DELAY_MS)) {
        continue
      }

      const shouldTalk = Math.random() < 0.7

      if (shouldTalk) {
        const partner = this.findTalkPartner(pawn, pawns, claimedPawnIds)

        if (partner) {
          this.startTalkPair(pawn, partner, worldStore, currentTick)
          claimedPawnIds.add(pawn.id)
          claimedPawnIds.add(partner.id)
          continue
        }
      }

      if (this.startWanderBehavior(pawn, worldStore, currentTick)) {
        claimedPawnIds.add(pawn.id)
      }
    }
  }

  static ensureIdleMetadata(pawn, currentTick) {
    if (pawn.idleSince == null && pawn.state === 'idle') {
      pawn.idleSince = currentTick
    }

    if (pawn.idleAction !== 'wander' && pawn.idleAction !== 'talk') {
      pawn.idleAction = null
    }

    if (pawn.talkPartner === undefined) {
      pawn.talkPartner = null
    }

    if (pawn.talkTargetTile === undefined) {
      pawn.talkTargetTile = null
    }

    if (pawn.talkStartedTick === undefined) {
      pawn.talkStartedTick = null
    }

    if (pawn.talkUntilTick === undefined) {
      pawn.talkUntilTick = null
    }
  }

  static updateTalkPair(pawn, worldStore, currentTick) {
    if (pawn.state === 'talking') {
      if (pawn.talkUntilTick != null && currentTick >= pawn.talkUntilTick) {
        this.finishTalkPair(pawn, worldStore, currentTick)
        return
      }

      if (!this.isTalkPairValid(pawn, worldStore)) {
        this.cancelIdleBehavior(pawn, worldStore, currentTick)
      }

      return
    }

    if (pawn.state !== 'moving' && pawn.state !== 'waiting_to_talk') {
      this.cancelIdleBehavior(pawn, worldStore, currentTick)
      return
    }

    if (!this.isTalkPairValid(pawn, worldStore)) {
      this.cancelIdleBehavior(pawn, worldStore, currentTick)
      return
    }

    const partner = this.getTalkPartnerPawn(pawn, worldStore)

    if (!partner) {
      this.cancelIdleBehavior(pawn, worldStore, currentTick)
      return
    }

    if (this.areBothAtTalkTargets(pawn, partner)) {
      this.startTalkConversation(pawn, partner, worldStore, currentTick)
    }
  }

  static isTalkPairValid(pawn, worldStore) {
    const partner = this.getTalkPartnerPawn(pawn, worldStore)

    if (!partner) {
      return false
    }

    if (partner.role !== 'pawn') {
      return false
    }

    if (partner.talkPartner !== pawn) {
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

    const pawnTargetTile = normalizeTile(pawn.talkTargetTile)
    const partnerTargetTile = normalizeTile(partner.talkTargetTile)

    if (!pawnTargetTile || !partnerTargetTile) {
      return false
    }

    return true
  }

  static areBothAtTalkTargets(pawn, partner) {
    const pawnTargetTile = normalizeTile(pawn.talkTargetTile)
    const partnerTargetTile = normalizeTile(partner.talkTargetTile)

    if (!pawnTargetTile || !partnerTargetTile) {
      return false
    }

    const pawnGridTile = getPawnGridTile(pawn)
    const partnerGridTile = getPawnGridTile(partner)

    if (!pawnGridTile || !partnerGridTile) {
      return false
    }

    return (
      pawnGridTile.x === pawnTargetTile.x &&
      pawnGridTile.y === pawnTargetTile.y &&
      partnerGridTile.x === partnerTargetTile.x &&
      partnerGridTile.y === partnerTargetTile.y
    )
  }

  static findTalkPartner(pawn, pawns, claimedPawnIds) {
    const pawnGridTile = getPawnGridTile(pawn)

    if (!pawnGridTile) {
      return null
    }

    let bestPartner = null
    let bestDistance = Number.POSITIVE_INFINITY

    for (const candidate of pawns) {
      if (candidate.role !== 'pawn' || candidate.id === pawn.id) {
        continue
      }

      if (claimedPawnIds.has(candidate.id)) {
        continue
      }

      if (candidate.state !== 'idle' || candidate.idleAction !== null) {
        continue
      }

      const candidateGridTile = getPawnGridTile(candidate)

      if (!candidateGridTile) {
        continue
      }

      const distance = Math.hypot(
        candidateGridTile.x - pawnGridTile.x,
        candidateGridTile.y - pawnGridTile.y,
      )

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

  static startTalkPair(pawnA, pawnB, worldStore, currentTick) {
    const assignment = this.findTalkAssignment(pawnA, pawnB, worldStore)

    if (!assignment) {
      return false
    }

    const { pawnLeft, pawnRight, leftTile, rightTile } = assignment

    if (!this.prepareTalkPawn(pawnLeft, pawnRight, leftTile, worldStore)) {
      return false
    }

    if (!this.prepareTalkPawn(pawnRight, pawnLeft, rightTile, worldStore)) {
      return false
    }

    if (this.areBothAtTalkTargets(pawnLeft, pawnRight)) {
      this.startTalkConversation(pawnLeft, pawnRight, worldStore, currentTick)
    }

    return true
  }

  static findTalkAssignment(pawnA, pawnB, worldStore) {
    const pawnATile = getPawnGridTile(pawnA)
    const pawnBTile = getPawnGridTile(pawnB)

    if (!pawnATile || !pawnBTile) {
      return null
    }

    const path = findPath(worldStore, pawnATile, pawnBTile)

    if (path.length === 0) {
      return null
    }

    const middleIndex = Math.floor(path.length / 2)
    const pivotTiles = []

    for (let offset = 0; offset < path.length; offset += 1) {
      const beforeIndex = middleIndex - offset
      const afterIndex = middleIndex + offset

      if (beforeIndex >= 0) {
        pivotTiles.push(path[beforeIndex])
      }

      if (offset > 0 && afterIndex < path.length) {
        pivotTiles.push(path[afterIndex])
      }
    }

    let bestAssignment = null

    for (const pivotTile of pivotTiles) {
      const meetingPair = this.findAdjacentMeetingPair(worldStore, pivotTile, pawnA, pawnB)

      if (!meetingPair) {
        continue
      }

      if (!bestAssignment || this.compareTalkAssignments(meetingPair, bestAssignment) < 0) {
        bestAssignment = meetingPair
      }
    }

    return bestAssignment
  }

  static findAdjacentMeetingPair(worldStore, pivotTile, pawnA, pawnB) {
    const ignoredIds = new Set([pawnA.id, pawnB.id])
    let bestAssignment = null

    for (let radius = 0; radius <= TALK_MEETING_SEARCH_RADIUS; radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const leftTile = {
            x: pivotTile.x + dx,
            y: pivotTile.y + dy,
          }
          const rightTile = {
            x: leftTile.x + 1,
            y: leftTile.y,
          }

          if (!this.isValidMeetingPair(worldStore, leftTile, rightTile, ignoredIds)) {
            continue
          }

          const directAssignment = this.scoreTalkAssignment(worldStore, pawnA, pawnB, leftTile, rightTile)
          const swappedAssignment = this.scoreTalkAssignment(worldStore, pawnA, pawnB, rightTile, leftTile)

          if (!directAssignment && !swappedAssignment) {
            continue
          }

          const candidateAssignment = !swappedAssignment
            ? {
                pawnLeft: pawnA,
                pawnRight: pawnB,
                leftTile,
                rightTile,
                score: this.getTalkScore(worldStore, leftTile, rightTile, pawnA, pawnB),
              }
            : !directAssignment
              ? {
                  pawnLeft: pawnA,
                  pawnRight: pawnB,
                  leftTile: rightTile,
                  rightTile: leftTile,
                  score: this.getTalkScore(worldStore, rightTile, leftTile, pawnA, pawnB),
                }
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

  static scoreTalkAssignment(worldStore, pawnA, pawnB, leftTile, rightTile) {
    if (!this.isValidMeetingPair(worldStore, leftTile, rightTile, new Set([pawnA.id, pawnB.id]))) {
      return null
    }

    const pawnATile = getPawnGridTile(pawnA)
    const pawnBTile = getPawnGridTile(pawnB)

    if (!pawnATile || !pawnBTile) {
      return null
    }

    const pathA = findPath(worldStore, pawnATile, leftTile)
    const pathB = findPath(worldStore, pawnBTile, rightTile)

    if (!this.isReachablePath(pawnATile, leftTile, pathA)) {
      return null
    }

    if (!this.isReachablePath(pawnBTile, rightTile, pathB)) {
      return null
    }

    return {
      pawnLeft: pawnA,
      pawnRight: pawnB,
      leftTile,
      rightTile,
      score: this.getTalkScore(worldStore, leftTile, rightTile, pawnA, pawnB),
    }
  }

  static isReachablePath(startTile, goalTile, path) {
    if (startTile.x === goalTile.x && startTile.y === goalTile.y) {
      return true
    }

    return Array.isArray(path) && path.length > 0
  }

  static getTalkScore(worldStore, leftTile, rightTile, pawnA, pawnB) {
    const pawnATile = getPawnGridTile(pawnA)
    const pawnBTile = getPawnGridTile(pawnB)

    if (!pawnATile || !pawnBTile) {
      return {
        balance: Number.POSITIVE_INFINITY,
        total: Number.POSITIVE_INFINITY,
      }
    }

    const pathA = findPath(worldStore, pawnATile, leftTile)
    const pathB = findPath(worldStore, pawnBTile, rightTile)

    return {
      balance: Math.abs(pathA.length - pathB.length),
      total: pathA.length + pathB.length,
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

  static isValidMeetingPair(worldStore, leftTile, rightTile, ignoredIds = new Set()) {
    if (!leftTile || !rightTile) {
      return false
    }

    if (rightTile.x !== leftTile.x + 1 || rightTile.y !== leftTile.y) {
      return false
    }

    const occupiedTiles = this.buildOccupiedTileSet(worldStore, ignoredIds)

    return (
      isTraversableWorldTile(worldStore, leftTile) &&
      isTraversableWorldTile(worldStore, rightTile) &&
      !occupiedTiles.has(getTileKey(leftTile)) &&
      !occupiedTiles.has(getTileKey(rightTile))
    )
  }

  static buildOccupiedTileSet(worldStore, ignoredIds = new Set()) {
    const occupiedTiles = new Set()
    const entities = [
      ...(worldStore.buildings ?? []),
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

  static startTalkConversation(pawnA, pawnB, worldStore, currentTick) {
    pawnA.state = 'talking'
    pawnB.state = 'talking'
    pawnA.talkStartedTick = currentTick
    pawnB.talkStartedTick = currentTick
    pawnA.talkUntilTick = currentTick + delayToTicks(TALK_DURATION_MS)
    pawnB.talkUntilTick = currentTick + delayToTicks(TALK_DURATION_MS)
    pawnA.path = []
    pawnB.path = []
    pawnA.pathGoalKey = null
    pawnB.pathGoalKey = null
    pawnA.target = null
    pawnB.target = null
    pawnA.idleSince = null
    pawnB.idleSince = null
    this.syncFacingForConversation(pawnA, pawnB)
  }

  static syncFacingForConversation(pawnA, pawnB) {
    const pawnATile = normalizeTile(pawnA.talkTargetTile)
    const pawnBTile = normalizeTile(pawnB.talkTargetTile)

    if (!pawnATile || !pawnBTile) {
      return
    }

    if (pawnATile.x < pawnBTile.x) {
      pawnA.facing = 'right'
      pawnB.facing = 'left'
      return
    }

    if (pawnATile.x > pawnBTile.x) {
      pawnA.facing = 'left'
      pawnB.facing = 'right'
    }
  }

  static startWanderBehavior(pawn, worldStore, currentTick) {
    const targetTile = this.findWanderTarget(pawn, worldStore)

    if (!targetTile) {
      return false
    }

    pawn.idleAction = 'wander'
    pawn.state = 'moving'
    pawn.idleSince = null
    pawn.talkPartner = null
    pawn.talkTargetTile = null
    pawn.talkStartedTick = null
    pawn.talkUntilTick = null
    pawn.target = {
      type: 'wander',
      id: `${pawn.id}-wander-${currentTick}`,
      tile: targetTile,
    }
    pawn.path = []
    pawn.pathGoalKey = null

    return true
  }

  static findWanderTarget(pawn, worldStore) {
    const pawnTile = getPawnGridTile(pawn)

    if (!pawnTile) {
      return null
    }

    const offsets = []

    for (let radius = 1; radius <= 4; radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          offsets.push({ dx, dy })
        }
      }
    }

    for (let index = offsets.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      const temp = offsets[index]
      offsets[index] = offsets[swapIndex]
      offsets[swapIndex] = temp
    }

    for (const offset of offsets) {
      const candidate = {
        x: pawnTile.x + offset.dx,
        y: pawnTile.y + offset.dy,
      }

      if (candidate.x === pawnTile.x && candidate.y === pawnTile.y) {
        continue
      }

      if (!isTraversableWorldTile(worldStore, candidate)) {
        continue
      }

      const path = findPath(worldStore, pawnTile, candidate)

      if (path.length > 0) {
        return candidate
      }
    }

    return null
  }

  static prepareTalkPawn(pawn, partner, targetTile, worldStore) {
    const currentTile = getPawnGridTile(pawn)

    if (!currentTile) {
      return false
    }

    pawn.idleAction = 'talk'
    pawn.talkPartner = partner
    pawn.talkTargetTile = [targetTile.x, targetTile.y]
    pawn.talkStartedTick = null
    pawn.talkUntilTick = null
    pawn.state = 'moving'
    pawn.idleSince = null
    pawn.target = {
      type: 'talk',
      id: partner.id,
      tile: {
        x: targetTile.x,
        y: targetTile.y,
      },
    }
    pawn.path = []
    pawn.pathGoalKey = null

    const path = findPath(worldStore, currentTile, targetTile)

    if (currentTile.x === targetTile.x && currentTile.y === targetTile.y) {
      return true
    }

    if (path.length === 0) {
      this.cancelIdleBehavior(pawn, worldStore, worldStore.tick ?? 0)
      return false
    }

    return true
  }

  static getTalkPartnerPawn(pawn, worldStore) {
    const partner = pawn.talkPartner

    if (!partner) {
      return null
    }

    if (typeof partner === 'string') {
      return (worldStore.units ?? []).find((unit) => unit.id === partner) ?? null
    }

    return partner
  }

  static finishTalkPair(pawn, worldStore, currentTick) {
    const partner = this.getTalkPartnerPawn(pawn, worldStore)

    for (const subject of [pawn, partner]) {
      if (!subject) {
        continue
      }

      this.resetTalkFields(subject)

      if (subject.state === 'talking' || subject.state === 'moving' || subject.state === 'waiting_to_talk') {
        subject.state = 'idle'
      }

      subject.idleSince = currentTick
      subject.target = null
      subject.path = []
      subject.pathGoalKey = null
    }
  }

  static cancelIdleBehavior(pawn, worldStore, currentTick) {
    if (pawn.idleAction === 'talk') {
      const partner = this.getTalkPartnerPawn(pawn, worldStore)

      for (const subject of [pawn, partner]) {
        if (!subject) {
          continue
        }

        this.resetTalkFields(subject)

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

    if (pawn.idleAction === 'wander') {
      this.clearWanderFields(pawn, currentTick)
    }
  }

  static clearWanderFields(pawn, currentTick) {
    pawn.idleAction = null
    pawn.state = 'idle'
    pawn.idleSince = currentTick
    pawn.target = null
    pawn.path = []
    pawn.pathGoalKey = null
    pawn.talkPartner = null
    pawn.talkTargetTile = null
    pawn.talkStartedTick = null
    pawn.talkUntilTick = null
  }

  static resetTalkFields(pawn) {
    pawn.idleAction = null
    pawn.talkPartner = null
    pawn.talkTargetTile = null
    pawn.talkStartedTick = null
    pawn.talkUntilTick = null
  }

  static queueTimedTransition(pawn, worldStore, nextState, delayMs = DEFAULT_STATE_DELAY_MS) {
    const currentTick = worldStore.tick ?? 0

    pawn.stateUntilTick = currentTick + delayToTicks(delayMs)
    pawn.nextState = nextState
  }
}
