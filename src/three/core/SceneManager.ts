import type { SceneName } from '@/types/common.types';
import type { RenderableScene } from './three.types';
import { AnimationManager } from './AnimationManager';
import { RendererManager } from './RendererManager';
import { ResourceManager } from './ResourceManager';
import { GalaxyScene } from '@/three/scenes/GalaxyScene';
import { SolarScene } from '@/three/scenes/SolarScene';

export class SceneManager {
  private readonly rendererManager = new RendererManager();
  private readonly animationManager = new AnimationManager();
  private readonly resourceManager = new ResourceManager();
  private currentScene: RenderableScene | null = null;
  private initialized = false;
  private destroyed = false;

  async initialize(container: HTMLElement, initialScene: SceneName): Promise<void> {
    if (this.initialized) {
      return;
    }

    const renderer = this.rendererManager.initialize(container);
    this.animationManager.addUpdateCallback('scene-manager', (deltaTime, elapsedTime) => {
      this.update(deltaTime, elapsedTime);
    });

    this.initialized = true;
    this.destroyed = false;
    await this.switchScene(initialScene);
    this.animationManager.start();
    renderer.setAnimationLoop(null);
  }

  async switchScene(sceneName: SceneName): Promise<void> {
    if (!this.initialized) {
      throw new Error('SceneManager must be initialized before switching scenes.');
    }

    if (this.currentScene?.sceneName === sceneName) {
      return;
    }

    this.currentScene?.pause();
    this.currentScene?.destroy();

    const nextScene = this.createScene(sceneName);
    await nextScene.init({
      renderer: this.rendererManager.getRenderer(),
      resources: this.resourceManager,
      sceneName,
    });
    nextScene.resize(
      this.rendererManager.getRenderer().domElement.width,
      this.rendererManager.getRenderer().domElement.height,
    );
    nextScene.start();
    this.currentScene = nextScene;
  }

  resize(width: number, height: number): void {
    this.rendererManager.resize(width, height);
    this.currentScene?.resize(width, height);
  }

  pause(): void {
    this.animationManager.pause();
    this.currentScene?.pause();
  }

  resume(): void {
    this.currentScene?.resume();
    this.animationManager.resume();
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.animationManager.destroy();
    this.currentScene?.destroy();
    this.resourceManager.destroy();
    this.rendererManager.destroy();
    this.currentScene = null;
    this.initialized = false;
    this.destroyed = true;
  }

  private update(deltaTime: number, elapsedTime: number): void {
    this.currentScene?.update(deltaTime, elapsedTime);
    if (this.currentScene) {
      this.rendererManager.render(this.currentScene.scene, this.currentScene.camera);
    }
  }

  private createScene(sceneName: SceneName): RenderableScene {
    if (sceneName === 'galaxy') {
      return new GalaxyScene();
    }

    return new SolarScene();
  }
}
