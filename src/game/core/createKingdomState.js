export function createKingdomState() {
  return {
    resources: {
      wood: 0,
      gold: 0,
      meat: 15,
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
