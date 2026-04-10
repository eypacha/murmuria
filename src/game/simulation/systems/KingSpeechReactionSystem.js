import { SIMULATION_TICK_MS } from '../../config/constants.js'

const KING_SPEECH_REACTION_DURATION_MS = 2000

function normalizeReactionText(value) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
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

export function applyKingSpeechReactions(reactions, worldStore) {
  if (!worldStore) {
    return
  }

  const emojis = Array.isArray(reactions?.emojis)
    ? reactions.emojis.map(normalizeReactionText).filter(Boolean)
    : []

  const pawns = shuffle((worldStore.units ?? []).filter((unit) => unit.role === 'pawn'))
  const currentTick = worldStore.tick ?? 0
  const expiresAt = currentTick + durationToTicks(KING_SPEECH_REACTION_DURATION_MS) - 1

  for (const pawn of pawns) {
    pawn.bubble = null
  }

  const showCount = Math.min(emojis.length, pawns.length)

  for (let index = 0; index < showCount; index += 1) {
    const pawn = pawns[index]

    if (!pawn) {
      continue
    }

    pawn.bubble = {
      emoji: emojis[index],
      text: null,
      untilTick: expiresAt,
    }
  }
}
