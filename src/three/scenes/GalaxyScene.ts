import {
  BufferAttribute,
  BufferGeometry,
  Color,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
} from 'three';
import { BaseScene } from '@/three/core/BaseScene';
import type { SceneContext } from '@/three/core/three.types';

export class GalaxyScene extends BaseScene {
  readonly sceneName = 'galaxy' as const;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(58, 1, 0.1, 1000);

  private points: Points<BufferGeometry, PointsMaterial> | null = null;

  protected onInit(context: SceneContext): void {
    this.scene.background = new Color(0x030411);
    this.camera.position.set(0, 6, 11);
    this.camera.lookAt(0, 0, 0);

    const geometry = new BufferGeometry();
    const positions = new Float32Array([
      -3, 0, 0,
      -1.4, 0.6, -0.8,
      0, -0.3, 0.6,
      1.4, 0.8, -0.4,
      3, -0.2, 0,
    ]);
    geometry.setAttribute('position', new BufferAttribute(positions, 3));

    const material = new PointsMaterial({
      color: 0x82f7ff,
      size: 0.18,
      sizeAttenuation: true,
    });

    this.points = new Points(geometry, material);
    this.scene.add(this.points);
    context.resources.registerDisposable(this.sceneName, geometry);
    context.resources.registerDisposable(this.sceneName, material);
  }

  update(deltaTime: number): void {
    if (this.points) {
      this.points.rotation.y += deltaTime * 0.12;
    }
  }

  protected onDestroy(): void {
    if (!this.points) {
      return;
    }

    this.scene.remove(this.points);
    this.points = null;
  }
}
