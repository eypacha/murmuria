import { getOccupiedTiles } from '../../core/getOccupiedTiles.js'
import { isTraversableWorldTile } from '../../core/isTraversableTile.js'

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export class ConstructionSystem {
  static update(worldStore) {
    if (!worldStore) return

    worldStore.constructionSites = worldStore.constructionSites ?? []

    const HOUSE_CAPACITY = 2
    const kingdomNeed = Number(worldStore.kingdom?.needs?.housing ?? 0)
    const housesNeeded = Math.ceil(kingdomNeed / HOUSE_CAPACITY)

    if (worldStore.constructionSites.length >= housesNeeded) {
      return
    }

    const castle = (worldStore.buildings ?? []).find((building) => building.type === 'castle') ?? null
    if (!castle) {
      return
    }

    const tile = this.findRandomBuildTileNearCastle(worldStore, castle)
    if (!tile) {
      return
    }

    const site = {
      id: globalThis.crypto?.randomUUID?.() ?? `construction-site-${Date.now()}-${Math.random()}`,
      type: 'house',
      gridPos: tile,
      footprint: {
        w: 2,
        h: 2,
      },
      required: {
        wood: 20,
      },
      delivered: {
        wood: 0,
      },
      progress: 0,
      state: 'collecting',
    }

    worldStore.constructionSites.push(site)
  }

  static findRandomBuildTileNearCastle(worldStore, castle) {
    if (!castle?.gridPos) {
      return null
    }

    const occupiedTiles = this.buildOccupiedTileSet(worldStore)
    const radius = 6

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const candidate = {
        x: castle.gridPos.x + getRandomInt(-radius, radius),
        y: castle.gridPos.y + getRandomInt(-radius, radius),
      }

      if (!isTraversableWorldTile(worldStore, candidate)) {
        continue
      }

      if (occupiedTiles.has(this.tileKey(candidate))) {
        continue
      }

      return candidate
    }

    return null
  }

  static buildOccupiedTileSet(worldStore) {
    const occupiedTiles = new Set()
    const entities = [
      ...(worldStore.buildings ?? []),
      ...(worldStore.units ?? []),
      ...(worldStore.resources ?? []),
      ...(worldStore.constructionSites ?? []),
    ]

    for (const entity of entities) {
      if (!entity?.gridPos) {
        continue
      }

      for (const tile of getOccupiedTiles(entity)) {
        occupiedTiles.add(this.tileKey(tile))
      }
    }

    return occupiedTiles
  }

  static tileKey(tile) {
    return `${tile.x},${tile.y}`
  }
}
