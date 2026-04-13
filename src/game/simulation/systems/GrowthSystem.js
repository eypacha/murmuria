export class GrowthSystem {
  static update(worldStore) {
    const currentTick = worldStore?.tick ?? 0

    for (const unit of worldStore?.units ?? []) {
      if (unit?.kind !== 'unit') {
        continue
      }

      if (unit.isChild !== true) {
        continue
      }

      if (!Number.isFinite(unit.growAtTick) || currentTick < unit.growAtTick) {
        continue
      }

      unit.isChild = false
      unit.growAtTick = null
      unit.lastReproduceTick = null
    }
  }
}
