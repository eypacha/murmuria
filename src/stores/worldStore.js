import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createKingdomState } from '../game/core/createKingdomState.js'

export const useWorldStore = defineStore('world', () => {
  const seed = ref(1)
  const tick = ref(0)

  const kingdom = ref(createKingdomState())

  const world = ref({
    width: 0,
    height: 0,
    tiles: [],
  })

  const units = ref([])
  const resources = ref([])
  const buildings = ref([])
  const constructionSites = ref([])

  return {
    seed,
    tick,
    kingdom,
    world,
    units,
    resources,
    buildings,
    constructionSites,
  }
})
