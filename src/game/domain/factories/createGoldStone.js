import { GOLD_VARIANT_CONFIGS } from '../../config/resourceVariants.js'

function normalizeFacing(facing) {
  return facing === 'left' ? 'left' : 'right'
}

export function createGoldStone(x = 0, y = 0, variant = 0, facing = 'right') {
  const variantIndex = Number.isInteger(variant) ? variant : 0
  const clampedIndex = Math.max(0, Math.min(GOLD_VARIANT_CONFIGS.length - 1, variantIndex))
  const variantConfig = GOLD_VARIANT_CONFIGS[clampedIndex] ?? GOLD_VARIANT_CONFIGS[0]

  return {
    id: `gold-${x}-${y}`,
    kind: 'resource',
    type: 'gold',
    variant: clampedIndex,
    size: variantConfig.size,
    facing: normalizeFacing(facing),
    gridPos: {
      x,
      y,
    },
    amount: variantConfig.amount,
    reservedBy: null,
  }
}
