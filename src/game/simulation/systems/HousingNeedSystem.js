import { getHousingCapacity } from '../../core/getHousingCapacity.js'
import { isStartupGracePeriod } from '../../core/isStartupGracePeriod.js'

export class HousingNeedSystem {
  static update(worldStore) {
    const kingdom = worldStore.kingdom

    if (!kingdom) {
      return
    }

    if (isStartupGracePeriod(worldStore)) {
      kingdom.housingCapacity = getHousingCapacity(worldStore.houses ?? [])
      kingdom.housingPressure = 0
      kingdom.needs = kingdom.needs ?? {}
      kingdom.needs.housing = 0
      return
    }

    const villagers = (worldStore.units ?? []).filter((unit) => unit?.role === 'villager')
    const housingCapacity = getHousingCapacity(worldStore.houses ?? [])
    const housingPressure = Math.max(0, villagers.length - housingCapacity)

    kingdom.housingCapacity = housingCapacity
    kingdom.housingPressure = housingPressure
    kingdom.needs = kingdom.needs ?? {}
    kingdom.needs.housing = housingPressure
  }
}
