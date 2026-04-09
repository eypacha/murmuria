export class DecisionSystem {
  static update(worldStore) {
    const woodPriority = worldStore.kingdom?.policies?.woodPriority ?? 0

    if (woodPriority <= 0) {
      return
    }

    const units = worldStore.units ?? []
    const trees = (worldStore.resources ?? []).filter((resource) => resource.type === 'tree')

    for (const unit of units) {
      if (unit.role !== 'villager') {
        continue
      }

      if (unit.state !== 'idle') {
        continue
      }

      const tree = this.findNearestAvailableTree(unit, trees)

      if (!tree) {
        continue
      }

      tree.reservedBy = unit.id
      unit.targetId = tree.id
      unit.state = 'moving'
    }
  }

  static findNearestAvailableTree(unit, trees) {
    const unitPosition = this.getGridPosition(unit)

    if (!unitPosition) {
      return null
    }

    let nearestTree = null
    let nearestDistance = Number.POSITIVE_INFINITY

    for (const tree of trees) {
      if (!this.isTreeAvailable(tree)) {
        continue
      }

      const treePosition = this.getGridPosition(tree)

      if (!treePosition) {
        continue
      }

      const distance = this.getManhattanDistance(unitPosition, treePosition)

      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestTree = tree
      }
    }

    return nearestTree
  }

  static getTargetResource(worldStore, unit) {
    return (worldStore.resources ?? []).find((resource) => resource.id === unit.targetId) ?? null
  }

  static isTreeAvailable(tree) {
    return tree.reservedBy === null || tree.reservedBy === undefined
  }

  static getGridPosition(entity) {
    return entity.gridPos ?? entity.pos ?? null
  }

  static getManhattanDistance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
  }
}
