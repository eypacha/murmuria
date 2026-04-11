export class KingdomSystem {
  static update(worldStore) {
    const kingdom = worldStore.kingdom
    if (!kingdom) return

    kingdom.needs = kingdom.needs ?? {}

    const units = worldStore.units ?? []
    const population = units.length

    const FOOD_CONSUMPTION_PER_UNIT = 0.04
    const foodConsumed = population * FOOD_CONSUMPTION_PER_UNIT
    kingdom.resources.meat = Math.max(0, (kingdom.resources.meat ?? 0) - foodConsumed)

    const FOOD_RESERVE_PER_UNIT = 6
    const targetFood = population * FOOD_RESERVE_PER_UNIT
    const currentFood = kingdom.resources.meat ?? 0

    kingdom.needs.food = Math.max(0, targetFood - currentFood)

    const housingCapacity = Number(worldStore.housingCapacity ?? 0)
    kingdom.needs.housing = Math.max(0, population - housingCapacity)

    if (kingdom.hunger == null) {
      kingdom.hunger = 0
    }

    if (targetFood <= 0) {
      kingdom.hunger = 0
    } else {
      const foodRatio = currentFood / targetFood
      kingdom.hunger = Math.max(0, Math.min(1, 1 - foodRatio))
    }
  }
}
