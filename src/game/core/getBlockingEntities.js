function isBlockingDecoration(entity) {
  return entity?.kind === 'decoration' && entity.blocksMovement !== false
}

export function getBlockingEntities(worldStore, options = {}) {
  const includeUnits = options.includeUnits !== false
  const entities = [
    ...(worldStore.buildings ?? []),
    ...(worldStore.houses ?? []),
    ...(worldStore.resources ?? []),
    ...(worldStore.decorations ?? []).filter(isBlockingDecoration),
  ]

  if (includeUnits) {
    entities.push(...(worldStore.units ?? []))
  }

  return entities
}
