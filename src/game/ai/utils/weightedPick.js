export function weightedPick(items) {
  if (!items.length) return null

  const total = items.reduce((s, i) => s + i.score, 0)

  if (total <= 0) return null

  let r = Math.random() * total

  for (const item of items) {
    r -= item.score
    if (r <= 0) return item
  }

  return items[0]
}
