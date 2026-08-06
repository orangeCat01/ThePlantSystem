import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import type { SceneName } from '@/types/common.types';
import type { ResourceManager } from './ResourceManager';

export interface SceneContext {
  renderer: WebGLRenderer;
  resources: ResourceManager;
  sceneName: SceneName;
}

export interface RenderableScene {
  readonly sceneName: SceneName;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  init(context: SceneContext): Promise<void>;
  start(): void;
  update(deltaTime: number, elapsedTime: number): void;
  pause(): void;
  resume(): void;
  resize(width: number, height: number): void;
  destroy(): void;
}

export type AnimationUpdateCallback = (deltaTime: number, elapsedTime: number) => void;
