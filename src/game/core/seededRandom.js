function hashSeed(seed) {
  const input = String(seed ?? 1)
  let hash = 2166136261

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

export function seededRandom(seed) {
  let state = hashSeed(seed)

  if (state === 0) {
    state = 0x6d2b79f5
  }

  const next = () => {
    state = (state + 0x6d2b79f5) | 0

    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const nextInt = (max) => {
    if (!Number.isFinite(max) || max <= 0) {
      return 0
    }

    return Math.floor(next() * max)
  }

  return {
    next,
    nextInt,
  }
}
