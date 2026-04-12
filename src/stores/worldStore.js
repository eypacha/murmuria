import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { createKingdomState } from '../game/core/createKingdomState.js'
import { getHousingCapacity } from '../game/core/getHousingCapacity.js'

export const useWorldStore = defineStore('world', () => {
  const seed = ref(1775879107082) 
  const tick = ref(0)
  const terrainVariant = ref('flat_lakes')

  const kingdom = ref(createKingdomState())

  const world = ref({
    width: 0,
    height: 0,
    tiles: [],
  })

  const units = ref([])
  const resources = ref([])
  const buildings = ref([])
  const houses = ref([])
  const constructionSites = ref([])
  const pendingSkullEffects = ref([])
  const housingCapacity = computed(() => getHousingCapacity(houses.value))

  return {
    seed,
    tick,
    terrainVariant,
    kingdom,
    world,
    units,
    resources,
    buildings,
    houses,
    constructionSites,
    pendingSkullEffects,
    housingCapacity,
  }
})
