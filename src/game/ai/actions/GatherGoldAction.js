export const GatherGoldAction = {
  score(pawn, worldStore) {
    const desire = worldStore.kingdom?.desires?.gatherGold ?? 0
    if (desire <= 0) return 0

    const nodes = (worldStore.resources ?? []).filter((resource) => resource.type === 'gold')

    if (!nodes.length) return 0

    return desire
  },

  perform(pawn, worldStore, decisionSystem) {
    return decisionSystem.assignResourceJob(pawn, worldStore, 'gold')
  },
}
