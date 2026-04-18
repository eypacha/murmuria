import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { createKingdomState } from '../game/core/createKingdomState.js'
import { getHousingCapacity } from '../game/core/getHousingCapacity.js'

export const useWorldStore = defineStore('world', () => {
  const seed = ref(1775879107082) 
  const tick = ref(0)
  const terrainVariant = ref('flat_lakes')
  const simulationSpeed = ref(1)

  const kingdom = ref(createKingdomState())

  const world = ref({
    width: 0,
    height: 0,
    tiles: [],
  })

  const units = ref([])
  const enemies = ref([])
  const waves = ref({
    current: 0,
    active: false,
    nextWaveTick: 0,
  })
  const resources = ref([])
  const buildings = ref([])
  const houses = ref([])
  const constructionSites = ref([])
  const ongoingReproductions = ref([])
  const pendingSkullEffects = ref([])
  const housingCapacity = computed(() => getHousingCapacity(houses.value))

  return {
    seed,
    tick,
    terrainVariant,
    simulationSpeed,
    kingdom,
    world,
    units,
    enemies,
    waves,
    resources,
    buildings,
    houses,
    constructionSites,
    ongoingReproductions,
    pendingSkullEffects,
    housingCapacity,
  }
})
