export const GatherWoodAction = {
  score(pawn, worldStore) {
    const desire = worldStore.kingdom?.desires?.gatherWood ?? 0
    if (desire <= 0) return 0

    const trees = (worldStore.resources ?? []).filter((resource) => resource.type === 'tree')

    if (!trees.length) return 0

    return desire
  },

  perform(pawn, worldStore, decisionSystem) {
    return decisionSystem.assignResourceJob(pawn, worldStore, 'tree')
  },
}
