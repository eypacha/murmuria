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

export function applyKingSpeechReactions(reactions, worldStore) {
  if (!worldStore) {
    return
  }

  const emojis = Array.isArray(reactions?.emojis)
    ? reactions.emojis.map(normalizeReactionText).filter(Boolean)
    : []

  const pawns = shuffle((worldStore.units ?? []).filter((unit) => unit.role === 'pawn'))
  const currentTick = worldStore.tick ?? 0
  const expiresAt = Date.now() + KING_SPEECH_REACTION_DURATION_MS

  for (const pawn of pawns) {
    pawn.talkEmoji = null
    pawn.talkEmojiUntilAt = null
    pawn.talkEmojiKey = null
  }

  const showCount = Math.min(emojis.length, pawns.length)

  for (let index = 0; index < showCount; index += 1) {
    const pawn = pawns[index]

    if (!pawn) {
      continue
    }

    pawn.talkEmoji = emojis[index]
    pawn.talkEmojiUntilAt = expiresAt
    pawn.talkEmojiKey = `${currentTick}:${index}:${pawn.id}`
  }
}
