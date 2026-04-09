import { defineStore } from 'pinia'
import { ref } from 'vue'

function createKingdomState() {
  return {
    resources: {
      wood: 0,
      gold: 0,
      meat: 0,
    },
    needs: {
      wood: 0,
      gold: 0,
      food: 0,
    },
    desires: {
      wood: 0,
      gold: 0,
      food: 0,
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
