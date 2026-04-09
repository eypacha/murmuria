export function seededRandom(seed) {
  return {
    next() {
      return Math.random()
    },
    nextInt(max) {
      return Math.floor(Math.random() * max)
    },
  }
}