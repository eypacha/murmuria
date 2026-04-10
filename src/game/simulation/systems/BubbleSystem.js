export class BubbleSystem {
  static update(worldStore) {
    if (!worldStore) {
      return
    }

    const units = worldStore.units ?? []
    const currentTick = worldStore.tick ?? 0

    for (const unit of units) {
      const bubble = unit.bubble

      if (!bubble) {
        continue
      }

      if (Number.isFinite(bubble.appearAtTick) && currentTick < bubble.appearAtTick) {
        continue
      }

      if (!Number.isFinite(bubble.untilTick)) {
        unit.bubble = null
        continue
      }

      if (currentTick >= bubble.untilTick) {
        unit.bubble = null
      }
    }
  }
}
