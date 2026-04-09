import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useWorldStore = defineStore('world', () => {
  const seed = ref(null)
  const tick = ref(0)

  const kingdom = ref({
    resources: {
      wood: 0,
    },
    policies: {
      woodPriority: 0,
    },
  })

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