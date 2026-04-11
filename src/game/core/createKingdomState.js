export function createKingdomState() {
  return {
    resources: {
      wood: 10,
      gold: 0,
      meat: 10,
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
