export class BubbleSystem {
  static update(worldStore) {
    if (!worldStore) {
      return
    }

    const pawns = worldStore.units ?? []
    const currentTick = worldStore.tick ?? 0

    for (const pawn of pawns) {
      const bubble = pawn.bubble

      if (!bubble) {
        continue
      }

      if (Number.isFinite(bubble.appearAtTick) && currentTick < bubble.appearAtTick) {
        continue
      }

      if (!Number.isFinite(bubble.untilTick)) {
        pawn.bubble = null
        continue
      }

      if (currentTick >= bubble.untilTick) {
        pawn.bubble = null
      }
    }
  }
}
