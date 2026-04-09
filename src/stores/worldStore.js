import { defineStore } from 'pinia'
import { ref } from 'vue'

function defineDesireAlias(target, legacyKey, desiredKey) {
  Object.defineProperty(target, legacyKey, {
    enumerable: false,
    configurable: true,
    get() {
      return this[desiredKey]
    },
    set(value) {
      this[desiredKey] = value
    },
  })
}

function createKingdomState() {
  const kingdomState = {
    resources: {
      wood: 0,
      gold: 0,
    },
    desires: {
      gatherWood: 0,
      gatherGold: 0,
    },
  }

  defineDesireAlias(kingdomState.desires, 'woodPriority', 'gatherWood')
  defineDesireAlias(kingdomState.desires, 'goldPriority', 'gatherGold')

  Object.defineProperty(kingdomState, 'policies', {
    enumerable: false,
    configurable: true,
    get() {
      return this.desires
    },
    set(value) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return
      }

      Object.assign(this.desires, value)
    },
  })

  return kingdomState
}

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
