import { ROCK_VARIANT_CONFIGS } from '../../config/resourceVariants.js'

function normalizeFacing(facing) {
  return facing === 'left' ? 'left' : 'right'
}

export function createRock(x = 0, y = 0, variant = 0, facing = 'right') {
  const variantIndex = Number.isInteger(variant) ? variant : 0
  const clampedIndex = Math.max(0, Math.min(ROCK_VARIANT_CONFIGS.length - 1, variantIndex))
  const variantConfig = ROCK_VARIANT_CONFIGS[clampedIndex] ?? ROCK_VARIANT_CONFIGS[0]

  return {
    id: `rock-${x}-${y}`,
    kind: 'decoration',
    type: 'rock',
    variant: clampedIndex,
    blocksMovement: true,
    facing: normalizeFacing(facing),
    gridPos: {
      x,
      y,
    },
    reservedBy: null,
    textureKey: variantConfig.key,
  }
}
