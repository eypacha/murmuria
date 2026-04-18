import { EnemySpriteController } from '../../rendering/EnemySpriteController.js'

function ensureEnemyControllerCache(scene) {
  if (!scene.enemyControllers) {
    scene.enemyControllers = new Map()
  }
}

export function syncEnemies(scene, worldStore) {
  ensureEnemyControllerCache(scene)

  const enemies = worldStore.enemies ?? []
  const activeEnemyIds = new Set()

  for (const enemy of enemies) {
    if (!enemy?.id) {
      continue
    }

    activeEnemyIds.add(enemy.id)

    let controller = scene.enemyControllers.get(enemy.id)

    if (!controller) {
      controller = new EnemySpriteController(scene, enemy)
      scene.enemyControllers.set(enemy.id, controller)
    } else {
      controller.enemy = enemy
    }

    controller.update()
  }

  for (const [enemyId, controller] of scene.enemyControllers.entries()) {
    if (activeEnemyIds.has(enemyId)) {
      continue
    }

    controller.destroy()
    scene.enemyControllers.delete(enemyId)
  }

  return [...scene.enemyControllers.values()]
}
