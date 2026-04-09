export class KingdomSystem {
  static update(worldStore) {
    const kingdom = worldStore.kingdom
    if (!kingdom || !kingdom.desires) return

    const DECAY_RATE = 0.01

    for (const key of Object.keys(kingdom.desires)) {
      const value = kingdom.desires[key] ?? 0

      if (value > 0) {
        kingdom.desires[key] = Math.max(0, value - DECAY_RATE)
      }
    }

    const units = worldStore.units ?? []
    const population = units.length

    const FOOD_CONSUMPTION_PER_UNIT = 0.04
    const foodConsumed = population * FOOD_CONSUMPTION_PER_UNIT
    kingdom.resources.meat = Math.max(0, (kingdom.resources.meat ?? 0) - foodConsumed)

    const FOOD_RESERVE_PER_UNIT = 6
    const targetFood = population * FOOD_RESERVE_PER_UNIT
    const currentFood = kingdom.resources.meat ?? 0

    kingdom.needs.food = Math.max(0, targetFood - currentFood)
  }
}
