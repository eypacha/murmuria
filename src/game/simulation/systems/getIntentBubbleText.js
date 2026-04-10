const INTENT_TEXT_BY_ACTION = {
  tree: '🌲',
  gold: '🪙',
  sheep: '🍖',
  house: '🏠',
  wood_delivery: '🏰',
  gold_delivery: '🏰',
  meat_delivery: '🏰',
  castle_delivery: '🏰',
}

export function getIntentBubbleText(actionType) {
  if (typeof actionType !== 'string') {
    return null
  }

  return INTENT_TEXT_BY_ACTION[actionType] ?? null
}
