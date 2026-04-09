export const GatherMeatAction = {
  score(pawn, worldStore) {
    const desire = worldStore.kingdom?.desires?.gatherMeat ?? 0
    if (desire <= 0) return 0

    const nodes = (worldStore.resources ?? []).filter((resource) => resource.type === 'sheep')

    if (!nodes.length) return 0

    return desire
  },

  perform(pawn, worldStore, decisionSystem) {
    return decisionSystem.assignResourceJob(pawn, worldStore, 'sheep')
  },
}
