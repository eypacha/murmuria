import { getHousingCapacity } from '../../core/getHousingCapacity.js'

export class HousingNeedSystem {
  static update(worldStore) {
    const kingdom = worldStore.kingdom

    if (!kingdom) {
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
