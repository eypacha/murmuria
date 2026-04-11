import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createKingdomState } from '../game/core/createKingdomState.js'

export const useWorldStore = defineStore('world', () => {
  const seed = ref(4) 
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

  return {
    seed,
    tick,
    terrainVariant,
    kingdom,
    world,
    units,
    resources,
    buildings,
  }
})
