import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import type { SceneContext, RenderableScene } from './three.types';
import type { SceneName } from '@/types/common.types';

export abstract class BaseScene implements RenderableScene {
  protected initialized = false;
  protected started = false;
  protected destroyed = false;
  protected context: SceneContext | null = null;

  abstract readonly sceneName: SceneName;
  abstract readonly scene: Scene;
  abstract readonly camera: PerspectiveCamera;

  async init(context: SceneContext): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.context = context;
    this.initialized = true;
    this.destroyed = false;
    await this.onInit(context);
  }

  start(): void {
    this.started = true;
  }

  update(_deltaTime: number, _elapsedTime: number): void {
    return;
  }

  pause(): void {
    this.started = false;
  }

  resume(): void {
    if (this.initialized && !this.destroyed) {
      this.started = true;
    }
  }

  resize(width: number, height: number): void {
    const aspect = width / Math.max(height, 1);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.onDestroy();
    this.context?.resources.releaseGroup(this.sceneName);
    this.context = null;
    this.initialized = false;
    this.started = false;
    this.destroyed = true;
  }

  protected get renderer(): WebGLRenderer | null {
    return this.context?.renderer ?? null;
  }

  protected onInit(_context: SceneContext): Promise<void> | void {
    return;
  }

  protected onDestroy(): void {
    return;
  }
}
