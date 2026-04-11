export function getHousingCapacity(houses = []) {
  return (houses ?? []).reduce((total, house) => {
    return total + Number(house?.capacity ?? 0)
  }, 0)
}
