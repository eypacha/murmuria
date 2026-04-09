export const BuildHouseAction = {
  score(pawn, worldStore) {
    const desire = worldStore.kingdom?.desires?.buildHousing ?? 0
    if (desire <= 0) return 0

    const existing = (worldStore.buildings ?? []).some(
      (building) => building.kind === 'constructionSite' && building.buildingType === 'house',
    )

    if (existing) return desire * 0.3

    return desire
  },

  perform(pawn, worldStore, decisionSystem) {
    return decisionSystem.proposeHouseConstruction(pawn, worldStore)
  },
}
