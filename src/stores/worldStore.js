import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useWorldStore = defineStore('world', () => {
  const seed = ref(0)
  const tick = ref(0)
  const kingdom = ref({
    name: '',
    ruler: '',
  })
  const world = ref({
    width: 0,
    height: 0,
    tiles: [],
  })
  const units = ref([])
  const resources = ref({
    wood: 0,
    stone: 0,
    food: 0,
  })
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
