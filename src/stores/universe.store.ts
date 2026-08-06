import type { CameraMode, QualityLevel, SceneName, SerializableError } from '@/types/common.types';
import { defineStore } from 'pinia';

interface UniverseState {
  currentScene: SceneName;
  selectedPlanetId: string | null;
  cameraMode: CameraMode;
  panelVisible: boolean;
  loading: boolean;
  loadingProgress: number;
  loadingMessage: string;
  sceneSwitching: boolean;
  animationPaused: boolean;
  timeScale: number;
  orbitVisible: boolean;
  qualityLevel: QualityLevel;
  error: SerializableError | null;
}

const clampProgress = (progress: number): number => Math.min(100, Math.max(0, progress));

export const useUniverseStore = defineStore('universe', {
  state: (): UniverseState => ({
    currentScene: 'solar',
    selectedPlanetId: null,
    cameraMode: 'FREE',
    panelVisible: false,
    loading: false,
    loadingProgress: 0,
    loadingMessage: '',
    sceneSwitching: false,
    animationPaused: false,
    timeScale: 1,
    orbitVisible: true,
    qualityLevel: 'MEDIUM',
    error: null,
  }),
  actions: {
    setCurrentScene(sceneName: SceneName): void {
      this.currentScene = sceneName;
    },
    selectPlanet(planetId: string): void {
      this.selectedPlanetId = planetId;
      this.panelVisible = true;
    },
    clearSelection(): void {
      this.selectedPlanetId = null;
    },
    openPlanetPanel(): void {
      this.panelVisible = true;
    },
    closePlanetPanel(): void {
      this.panelVisible = false;
    },
    setCameraMode(cameraMode: CameraMode): void {
      this.cameraMode = cameraMode;
    },
    setLoading(loading: boolean, message = ''): void {
      this.loading = loading;
      this.loadingMessage = message;
      if (!loading) {
        this.loadingProgress = 100;
      }
    },
    setLoadingProgress(progress: number, message?: string): void {
      this.loadingProgress = clampProgress(progress);
      if (message !== undefined) {
        this.loadingMessage = message;
      }
    },
    setSceneSwitching(sceneSwitching: boolean): void {
      this.sceneSwitching = sceneSwitching;
    },
    setAnimationPaused(animationPaused: boolean): void {
      this.animationPaused = animationPaused;
    },
    setTimeScale(timeScale: number): void {
      this.timeScale = Math.max(0, timeScale);
    },
    setOrbitVisible(orbitVisible: boolean): void {
      this.orbitVisible = orbitVisible;
    },
    setQualityLevel(qualityLevel: QualityLevel): void {
      this.qualityLevel = qualityLevel;
    },
    setError(error: SerializableError | null): void {
      this.error = error;
    },
    resetTransientState(): void {
      this.selectedPlanetId = null;
      this.panelVisible = false;
      this.loading = false;
      this.loadingProgress = 0;
      this.loadingMessage = '';
      this.sceneSwitching = false;
      this.animationPaused = false;
      this.error = null;
    },
  },
});

