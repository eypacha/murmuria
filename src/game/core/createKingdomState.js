export function createKingdomState() {
  return {
    resources: {
      wood: 0,
      gold: 0,
      meat: 15,
    },
    housingCapacity: 0,
    housingPressure: 0,
    houseProposal: null,
    needs: {
      wood: 0,
      gold: 0,
      food: 0,
      housing: 0,
    },
  }
}
