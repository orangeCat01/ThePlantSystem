import type { SceneName, SerializableError } from '@/types/common.types';
import type { CoordinatorOptions } from './app.types';
import { SceneManager } from '@/three/core/SceneManager';
import { useUniverseStore } from '@/stores/universe.store';

const toSerializableError = (error: unknown, source: string): SerializableError => {
  if (error instanceof Error) {
    return {
      code: 'APP_COORDINATOR_ERROR',
      message: error.message,
      recoverable: true,
      source,
    };
  }

  return {
    code: 'APP_COORDINATOR_UNKNOWN_ERROR',
    message: '应用协调器发生未知错误。',
    recoverable: true,
    source,
  };
};

export class ApplicationCoordinator {
  private readonly sceneManager = new SceneManager();
  private readonly initialScene: SceneName;
  private initialized = false;
  private destroyed = false;

  constructor(options: CoordinatorOptions) {
    this.initialScene = options.initialScene;
  }

  async initialize(container: HTMLElement): Promise<void> {
    if (this.initialized) {
      return;
    }

    const store = useUniverseStore();
    try {
      store.setLoading(true, '正在初始化三维场景骨架');
      store.setLoadingProgress(20);
      await this.sceneManager.initialize(container, this.initialScene);
      store.setCurrentScene(this.initialScene);
      store.setLoadingProgress(100, '场景骨架已加载');
      store.setLoading(false);
      this.initialized = true;
      this.destroyed = false;
    } catch (error) {
      store.setLoading(false);
      store.setError(toSerializableError(error, 'initialize'));
      throw error;
    }
  }

  async switchScene(sceneName: SceneName): Promise<void> {
    if (!this.initialized) {
      return;
    }

    const store = useUniverseStore();
    try {
      store.setSceneSwitching(true);
      store.setLoading(true, sceneName === 'solar' ? '正在切换到太阳系骨架' : '正在切换到银河系骨架');
      await this.sceneManager.switchScene(sceneName);
      store.setCurrentScene(sceneName);
      store.clearSelection();
      store.closePlanetPanel();
      store.setLoading(false);
    } catch (error) {
      store.setError(toSerializableError(error, 'switchScene'));
      throw error;
    } finally {
      store.setSceneSwitching(false);
    }
  }

  async selectPlanet(planetId: string): Promise<void> {
    const store = useUniverseStore();
    store.selectPlanet(planetId);
  }

  async clearPlanetSelection(): Promise<void> {
    const store = useUniverseStore();
    store.clearSelection();
    store.closePlanetPanel();
  }

  pause(): void {
    this.sceneManager.pause();
    useUniverseStore().setAnimationPaused(true);
  }

  resume(): void {
    this.sceneManager.resume();
    useUniverseStore().setAnimationPaused(false);
  }

  resize(width: number, height: number): void {
    this.sceneManager.resize(width, height);
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.sceneManager.destroy();
    this.initialized = false;
    this.destroyed = true;
  }
}
