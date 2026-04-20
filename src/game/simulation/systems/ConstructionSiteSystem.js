function getConstructionSites(worldStore) {
  return (worldStore.constructionSites ?? []).filter((site) => {
    return site?.type === 'constructionSite'
  })
}

export class ConstructionSiteSystem {
  static update(worldStore) {
    if (!worldStore) {
      return
    }

    const sites = getConstructionSites(worldStore)
    const units = worldStore.units ?? []

    for (const site of sites) {
      if (site.revealed !== false) {
        continue
      }

      const proposer = units.find((unit) => unit?.id === site.proposerVillagerId)
      const proposerTile = proposer?.gridPos
      const siteTile = site.gridPos ?? { x: site.x ?? 0, y: site.y ?? 0 }

      if (!proposerTile) {
        continue
      }

      if (proposerTile.x !== siteTile.x || proposerTile.y !== siteTile.y) {
        continue
      }

      site.revealed = true
    }
  }
}
