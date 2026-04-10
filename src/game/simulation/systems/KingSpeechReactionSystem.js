import { SIMULATION_TICK_MS } from '../../config/constants.js'

const KING_SPEECH_REACTION_DURATION_MS = 2000
const KING_SPEECH_REACTION_STAGGER_MS = 500

function normalizeReactionText(value) {
  if (typeof value !== 'string') {
    return ''
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return ''
  }

  const decoded = trimmed.replace(/\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})/g, (_match, braceHex, plainHex) => {
    const hex = braceHex ?? plainHex
    const codePoint = Number.parseInt(hex, 16)

    if (!Number.isFinite(codePoint)) {
      return ''
    }

    try {
      return String.fromCodePoint(codePoint)
    } catch {
      return ''
    }
  })

  return /^[\p{Extended_Pictographic}\p{Emoji_Component}\u200D\uFE0F]+$/u.test(decoded)
    ? decoded
    : ''
}

function shuffle(array) {
  const result = [...array]

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const temp = result[index]
    result[index] = result[swapIndex]
    result[swapIndex] = temp
  }

  return result
}

function durationToTicks(durationMs) {
  return Math.max(1, Math.ceil(durationMs / SIMULATION_TICK_MS))
}

function staggerToTicks(staggerMs) {
  return Math.max(1, Math.ceil(staggerMs / SIMULATION_TICK_MS))
}

export function applyKingSpeechReactions(reactions, worldStore) {
  if (!worldStore) {
    return
  }

  const emojis = Array.isArray(reactions?.emojis)
    ? reactions.emojis.map(normalizeReactionText).filter(Boolean)
    : []

  const units = shuffle(worldStore.units ?? [])
  const currentTick = worldStore.tick ?? 0
  const expiresAt = currentTick + durationToTicks(KING_SPEECH_REACTION_DURATION_MS) - 1
  const staggerTicks = staggerToTicks(KING_SPEECH_REACTION_STAGGER_MS)

  for (const unit of units) {
    unit.bubble = null
  }

  const showCount = Math.min(emojis.length, units.length)

  for (let index = 0; index < showCount; index += 1) {
    const unit = units[index]

    if (!unit) {
      continue
    }

    unit.bubble = {
      text: emojis[index],
      appearAtTick: currentTick + index * staggerTicks,
      untilTick: expiresAt,
    }
  }
}
