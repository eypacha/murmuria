import { INITIAL_GOLD, INITIAL_MEAT, INITIAL_WOOD } from '../config/constants'

export function createKingdomState() {
  return {
    resources: {
      wood: INITIAL_WOOD,
      gold: INITIAL_GOLD,
      meat: INITIAL_MEAT,
    },
    housingCapacity: 0,
    housingPressure: 0,
    houseProposal: null,
    constructionWoodReserved: 0,
    needs: {
      wood: 0,
      gold: 0,
      food: 0,
      housing: 0,
    },
  }
}
