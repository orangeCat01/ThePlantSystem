import {
  AxesHelper,
  Color,
  GridHelper,
  PerspectiveCamera,
  Scene,
} from 'three';
import { BaseScene } from '@/three/core/BaseScene';
import type { SceneContext } from '@/three/core/three.types';

export class SolarScene extends BaseScene {
  readonly sceneName = 'solar' as const;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(55, 1, 0.1, 1000);

  private grid: GridHelper | null = null;
  private axes: AxesHelper | null = null;

  protected onInit(context: SceneContext): void {
    this.scene.background = new Color(0x060b1c);
    this.camera.position.set(6, 5, 8);
    this.camera.lookAt(0, 0, 0);

    this.grid = new GridHelper(12, 12, 0x3a88ff, 0x1d2d52);
    this.axes = new AxesHelper(2.5);
    this.scene.add(this.grid, this.axes);

    context.resources.registerDisposable(this.sceneName, this.grid.geometry);
    context.resources.registerDisposable(this.sceneName, this.grid.material);
    context.resources.registerDisposable(this.sceneName, this.axes.geometry);
    context.resources.registerDisposable(this.sceneName, this.axes.material);
  }

  update(deltaTime: number): void {
    if (this.grid) {
      this.grid.rotation.y += deltaTime * 0.05;
    }
  }

  protected onDestroy(): void {
    if (this.grid) {
      this.scene.remove(this.grid);
      this.grid = null;
    }

    if (this.axes) {
      this.scene.remove(this.axes);
      this.axes = null;
    }
  }
}
