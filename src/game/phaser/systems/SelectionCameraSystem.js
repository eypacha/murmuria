import Phaser from 'phaser'

export class SelectionCameraSystem {
  constructor(scene) {
    this.scene = scene
    this.selectedUnitId = null
  }

  selectUnit(unitId) {
    this.selectedUnitId = unitId ?? null
  }

  clearSelection() {
    this.selectedUnitId = null
  }

  update(delta = 0) {
    if (!this.selectedUnitId || this.scene?.isCameraDragging) {
      return
    }

    this.followSelectedUnit(delta)
  }

  followSelectedUnit(delta) {
    if (!this.selectedUnitId || !this.scene?.cameras?.main) {
      return
    }

    const controller = this.scene.unitControllers.get(this.selectedUnitId)

    if (!controller?.sprite?.active) {
      this.selectedUnitId = null
      return
    }

    const camera = this.scene.cameras.main
    const visualDelta = this.scene.getVisualDelta?.(delta) ?? delta
    const smoothing = 1 - Math.exp(-visualDelta * 0.01)
    const desiredScrollX = controller.sprite.x - camera.width / 2 / camera.zoom
    const desiredScrollY = controller.sprite.y - camera.height / 2 / camera.zoom

    camera.scrollX = Phaser.Math.Linear(camera.scrollX, desiredScrollX, smoothing)
    camera.scrollY = Phaser.Math.Linear(camera.scrollY, desiredScrollY, smoothing)
    this.scene.clampCameraToWorld()
  }
}
