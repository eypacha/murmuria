import { defineStore } from 'pinia'
import { ref } from 'vue'

function createKingdomState() {
  return {
    resources: {
      wood: 0,
      gold: 0,
      meat: 0,
    },
    desires: {
      gatherWood: 0,
      gatherGold: 0,
      gatherMeat: 0,
    },
  }
}

export const useWorldStore = defineStore('world', () => {
  const seed = ref(Date.now().toString())
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

  return {
    seed,
    tick,
    kingdom,
    world,
    units,
    resources,
    buildings,
  }
})
