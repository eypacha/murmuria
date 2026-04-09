import { GOLD_VARIANT_CONFIGS } from '../../config/resourceVariants.js'

export function createGoldStone(x = 0, y = 0, variant = 0) {
  const variantIndex = Number.isInteger(variant) ? variant : 0
  const clampedIndex = Math.max(0, Math.min(GOLD_VARIANT_CONFIGS.length - 1, variantIndex))
  const variantConfig = GOLD_VARIANT_CONFIGS[clampedIndex] ?? GOLD_VARIANT_CONFIGS[0]

  return {
    id: `gold-${x}-${y}`,
    kind: 'resource',
    type: 'gold',
    variant: clampedIndex,
    size: variantConfig.size,
    gridPos: {
      x,
      y,
    },
    amount: variantConfig.amount,
    reservedBy: null,
  }
}
