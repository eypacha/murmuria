const RESOURCE_FACTOR_MIN = 0.6
const RESOURCE_FACTOR_MAX = 1.5
const SOCIAL_DELTA_MIN = -2
const SOCIAL_DELTA_MAX = 2
const SOCIAL_STATE_MIN = -10
const SOCIAL_STATE_MAX = 10
const DESIRE_BASELINE = 0.1

const STYLE_EFFECTS = {
  order: { morale: -1, fear: 2 },
  speech: { morale: 1, fear: 0 },
  incentive: { morale: 2, fear: -1 },
  warning: { morale: -1, fear: 1 },
}

/**
 * @typedef {Object} KingSpeechIntent
 * @property {'order'|'speech'|'incentive'|'warning'} style
 * @property {{ wood?: number, gold?: number, meat?: number }} [resourceFactor]
 * @property {{ morale?: number, fear?: number }} [socialDelta]
 */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function normalizeNumber(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export function applyKingSpeechIntent(intent, kingdom) {
  if (!kingdom) {
    return
  }

  const resourceFactor = intent?.resourceFactor ?? {}
  kingdom.desires = kingdom.desires ?? {}
  const desires = kingdom.desires
  desires.wood = Math.max(DESIRE_BASELINE, normalizeNumber(desires.wood, 0)) * clamp(
    normalizeNumber(resourceFactor.wood, 1),
    RESOURCE_FACTOR_MIN,
    RESOURCE_FACTOR_MAX,
  )
  desires.gold = Math.max(DESIRE_BASELINE, normalizeNumber(desires.gold, 0)) * clamp(
    normalizeNumber(resourceFactor.gold, 1),
    RESOURCE_FACTOR_MIN,
    RESOURCE_FACTOR_MAX,
  )
  desires.food = Math.max(DESIRE_BASELINE, normalizeNumber(desires.food, 0)) * clamp(
    normalizeNumber(resourceFactor.meat, 1),
    RESOURCE_FACTOR_MIN,
    RESOURCE_FACTOR_MAX,
  )

  const style = STYLE_EFFECTS[intent?.style] ?? { morale: 0, fear: 0 }
  const socialDelta = intent?.socialDelta ?? {}
  const moraleDelta =
    style.morale + clamp(normalizeNumber(socialDelta.morale, 0), SOCIAL_DELTA_MIN, SOCIAL_DELTA_MAX)
  const fearDelta =
    style.fear + clamp(normalizeNumber(socialDelta.fear, 0), SOCIAL_DELTA_MIN, SOCIAL_DELTA_MAX)

  kingdom.morale = clamp(
    normalizeNumber(kingdom.morale, 0) + moraleDelta,
    SOCIAL_STATE_MIN,
    SOCIAL_STATE_MAX,
  )
  kingdom.fear = clamp(
    normalizeNumber(kingdom.fear, 0) + fearDelta,
    SOCIAL_STATE_MIN,
    SOCIAL_STATE_MAX,
  )
}

export function computeObedience(kingdom) {
  const hunger = clamp(normalizeNumber(kingdom?.hunger, 0), 0, 1)
  const fear = normalizeNumber(kingdom?.fear, 0)
  const morale = normalizeNumber(kingdom?.morale, 0)

  return clamp(0.5 + fear * 0.1 + morale * 0.05 - hunger * 0.07, 0, 1)
}
