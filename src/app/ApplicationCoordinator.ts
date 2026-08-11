import type { CameraMode, ObservationMode, SceneName, SerializableError } from '@/types/common.types';
import type { AstronomyEvent } from '@/astronomy/events/astronomy-event.types';
import type { GalaxyConfig } from '@/types/galaxy.types';
import { createObserverLocation } from '@/astronomy/location.types';
import { explorationRepository } from '@/repositories/ExplorationRepository';
import type { CoordinatorOptions } from './app.types';
import { SceneManager } from '@/three/core/SceneManager';
import { SolarScene } from '@/three/scenes/SolarScene';
import { GalaxyScene } from '@/three/scenes/GalaxyScene';
import { modelLoader } from '@/three/loaders/ModelLoader';
import { overlayManager } from '@/app/OverlayManager';
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
  private initialScene: SceneName;
  private initialized = false;
  private destroyed = false;

  constructor(options: CoordinatorOptions) {
    this.initialScene = options.initialScene;
  }

  /** 空白点击入口（由 SolarScene 转发而来）：取消当前选择（异步错误走现有机制）。 */
  private readonly onEmptySelected = (): void => {
    void this.clearPlanetSelection();
  };

  /** 统一目标选择入口（Phase 2.18 / 2.22）：InteractionManager → 统一选择链。 */
  private readonly onTargetSelected = (target: {
    id: string;
    type: 'planet' | 'moon' | 'star' | 'deepSky' | 'spacecraft';
  }): void => {
    void this.selectTarget(target.id);
  };

  /** 相机模式变化入口（由 SolarScene.cameraModeHandler 转发而来）。 */
  private readonly onCameraModeChanged = (mode: CameraMode): void => {
    useUniverseStore().setCameraMode(mode);
  };

  /** 为当前 SolarScene 注册选择事件与相机模式转发（GalaxyScene 不注册）。 */
  private bindSolarScene(scene: SolarScene): void {
    // 统一选择链（Phase 2.18）：InteractionManager 旧回调保留兼容但 Coordinator 不注册，
    // 避免统一事件与旧事件双重触发选择。
    scene.setPlanetSelectedHandler(null);
    scene.setStarSelectedHandler(null);
    scene.setTargetSelectedHandler(this.onTargetSelected);
    // 小天体选择（Phase 2.23）：哈雷彗星 → Store（SolarObjectPanel 展示）。
    scene.setSolarObjectSelectedHandler((objectId) => {
      useUniverseStore().selectSolarObject(objectId);
    });
    scene.setPlanetEmptySelectedHandler(this.onEmptySelected);
    scene.setCameraModeHandler(this.onCameraModeChanged);
    // 同步当前模拟日期到场景的天文时钟（Phase 2.15）。
    // 同步当前观察模式（Phase 2.20.2：默认 SOLAR_SYSTEM → 恒星层/星座线隐藏）。
    scene.setObservationMode(useUniverseStore().starObservationMode);
    // 天体标签默认关闭（Phase 2.20.1/2.20.2：产品默认不显示名称，Store 控制）。
    scene.setPlanetLabelsVisible(useUniverseStore().showPlanetLabels);
    // 任务日期上报（Phase 2.22）：MissionClock → 回调 → Store（无定时器）。
    scene.setMissionDateHandler((date) => {
      useUniverseStore().setMissionDate(date);
    });
    // 加载进度上报（Phase 2.16）：LoadingTracker → 回调 → Store（LoadingScreen 展示）。
    scene.setLoadingProgressHandler((state) => {
      const universeStore = useUniverseStore();
      universeStore.setLoadingCounts(state.loaded, state.total);
      universeStore.setLoadingProgress(state.progress);
      state.failedIds.forEach((planetId) => universeStore.addLoadingError(planetId));
    });
  }

  /** 为 GalaxyScene 注册选择事件转发（Phase 2.19：点击 → Coordinator → Store + 高亮）。 */
  private bindGalaxyScene(scene: GalaxyScene): void {
    scene.setGalaxySelectedHandler((objectId) => {
      this.onGalaxySelected(objectId);
    });
  }

  /** 银河对象选择流程（Phase 2.19）：Store 选择 → 高亮 → 面板更新。 */
  onGalaxySelected(objectId: string): void {
    if (this.destroyed) {
      return;
    }
    const store = useUniverseStore();
    store.selectGalaxyObject(objectId);
    const scene = this.sceneManager.getCurrentScene();
    if (scene instanceof GalaxyScene) {
      scene.showGalaxyHighlight(objectId);
    }
  }

  /** 平滑聚焦银河对象（Phase 2.19；支持 core / arm-1..arm-4）。 */
  focusGalaxyObject(galaxyId: string): Promise<void> {
    if (this.destroyed) {
      return Promise.resolve();
    }
    const scene = this.sceneManager.getCurrentScene();
    if (!(scene instanceof GalaxyScene)) {
      return Promise.resolve();
    }
    return scene.focusGalaxyObject(galaxyId);
  }

  /** 清除银河对象选择（Phase 2.18；UI 关闭按钮入口）。 */
  clearGalaxySelection(): void {
    if (this.destroyed) {
      return;
    }
    useUniverseStore().clearGalaxySelection();
    const scene = this.sceneManager.getCurrentScene();
    if (scene instanceof GalaxyScene) {
      scene.hideGalaxyHighlight();
    }
  }

  /** 银河系数据快照（Phase 2.18；供 GalaxyPanel 展示；场景未就绪返回 null）。 */
  getGalaxyInfo(): GalaxyConfig | null {
    if (this.destroyed) {
      return null;
    }
    const scene = this.sceneManager.getCurrentScene();
    if (!(scene instanceof GalaxyScene)) {
      return null;
    }
    return scene.getGalaxyInfo();
  }

  private reportError(error: unknown, source: string): void {
    useUniverseStore().setError(toSerializableError(error, source));
  }

  /**
   * 初始化三维场景（Phase 2.20.1 修复：支持按当前路由指定初始场景）。
   * 刷新 /universe/galaxy 时传入 'galaxy'，直接初始化银河系，避免
   * 「子路由 onMounted 早于 SceneViewport watch 就绪」导致的初始场景丢失。
   */
  async initialize(container: HTMLElement, initialScene?: SceneName): Promise<void> {
    if (this.initialized) {
      return;
    }
    if (initialScene === 'solar' || initialScene === 'galaxy') {
      this.initialScene = initialScene;
    }

    const store = useUniverseStore();
    try {
      store.setLoading(true, '正在初始化三维场景骨架');
      store.setLoadingProgress(20);
      await this.sceneManager.initialize(container, this.initialScene);
      store.setCurrentScene(this.initialScene);
      const scene = this.sceneManager.getCurrentScene();
      if (scene instanceof SolarScene) {
        this.bindSolarScene(scene);
      } else if (scene instanceof GalaxyScene) {
        // Phase 2.20.1 修复：刷新 /universe/galaxy 直接初始化银河系时，
        // 与 switchScene 同路径绑定交互并打开银河总览面板。
        this.bindGalaxyScene(scene);
        store.selectGalaxyObject('galaxy');
        store.disableTelescope();
      }
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
      // 统一清理（Phase 2.23 修复）：切回太阳系时清空银河选择与统一目标，
      // 避免「天体信息」分组残留空壳（银河自动选中本体在下面 galaxy 分支重新设置）。
      store.clearTarget();
      store.clearGalaxySelection();
      store.closePlanetPanel();
      // Overlay 场景预设（Phase 2.20）：Solar 展开控制卡；Galaxy 关闭太阳系卡片。
      overlayManager.applyScenePreset(sceneName);
      // 新场景注册选择事件转发；旧 SolarScene 已在 SceneManager 切换中销毁并清空回调。
      const scene = this.sceneManager.getCurrentScene();
      if (scene instanceof SolarScene) {
        this.bindSolarScene(scene);
        // 望远镜状态（Phase 2.21）：切回 Solar 且此前开启时，按 Store 档位恢复；
        // 新场景的资源（FOV/星等过滤）以场景实例为准，重复开启安全（幂等）。
        if (store.telescopeEnabled) {
          scene.enableTelescope(store.telescopeZoom, store.telescopeConfigId);
        }
      } else if (scene instanceof GalaxyScene) {
        this.bindGalaxyScene(scene);
        // 银河总览（Phase 2.18）：进入银河场景即选中银河本体，GalaxyPanel 展示数据。
        store.selectGalaxyObject('galaxy');
        // Galaxy 场景无望远镜能力：关闭状态，避免 UI 显示与场景不一致。
        store.disableTelescope();
      } else {
        // Galaxy 场景无望远镜能力：关闭状态，避免 UI 显示与场景不一致。
        store.disableTelescope();
      }
      store.setLoading(false);
    } catch (error) {
      store.setLoading(false);
      store.setError(toSerializableError(error, 'switchScene'));
      throw error;
    } finally {
      store.setSceneSwitching(false);
    }
  }

  /**
   * 选择天体（正式状态闭环，Phase 2.9 行为保留）：
   * 兼容旧接口，内部统一走 selectTarget。
   */
  /** 选择太阳系小天体（Phase 2.23）：Store 记录（面板由 SolarObjectPanel 按 ID 展示）。 */
  selectSolarObject(objectId: string): void {
    if (this.destroyed) {
      return;
    }
    useUniverseStore().selectSolarObject(objectId);
  }

  async selectPlanet(planetId: string): Promise<void> {
    await this.selectTarget(planetId);
  }

  /** 选择恒星（Phase 2.17 行为保留）：兼容旧接口，内部统一走 selectTarget。 */
  selectStar(starId: string): void {
    void this.selectTarget(starId);
  }

  /**
   * 统一目标选择（Phase 2.18）：
   * 1. Store 记录统一目标 + 最近观察。
   * 2. 行星/卫星：高亮 + 相机聚焦 + 打开天体面板（原 selectPlanet 视觉闭环）。
   * 3. 恒星：更新兼容字段（StarPanel 展示）。
   */
  async selectTarget(id: string): Promise<void> {
    if (this.destroyed) {
      return;
    }

    const target = explorationRepository.getById(id);
    if (!target) {
      return;
    }

    const store = useUniverseStore();
    store.selectTarget(target.id, target.type);

    if (target.type === 'star') {
      // 恒星：兼容 StarPanel 选择字段（Phase 2.17）。
      store.selectStar(target.id);
      return;
    }

    if (target.type === 'deepSky') {
      // 深空天体（Phase 2.21）：统一选择字段已写入，DeepSkyPanel 由类型驱动；
      // 相机定位由 focusTarget 完成。
      return;
    }

    if (target.type === 'spacecraft') {
      // 航天任务（Phase 2.22）：统一选择链 → 任务选择（本阶段 spacecraft.id === mission.id）。
      await this.selectMission(target.id);
      return;
    }

    await this.applyPlanetVisualSelection(target.id);
  }

  /** 行星/卫星视觉选择闭环（高亮 + 聚焦 + 面板；失败时回滚并报告）。 */
  private async applyPlanetVisualSelection(planetId: string): Promise<void> {
    const store = useUniverseStore();
    store.selectPlanet(planetId);

    const scene = this.sceneManager.getCurrentScene();
    if (!(scene instanceof SolarScene)) {
      return;
    }

    try {
      scene.showPlanetHighlight(planetId);
      await scene.focusPlanet(planetId);
      store.openPlanetPanel();
    } catch (error) {
      // 聚焦/高亮失败：隐藏高亮并清除 Store 选择状态，不留下错误状态。
      scene.hidePlanetHighlight();
      store.clearPlanetSelection();
      this.reportError(error, 'selectTarget');
    }
  }

  /**
   * 统一目标定位（Phase 2.18，搜索/收藏点击入口）：
   * 选择 + 记录 + 相机定位；恒星定位后切换自由探索模式。
   */
  async focusTarget(id: string): Promise<void> {
    if (this.destroyed) {
      return;
    }

    const target = explorationRepository.getById(id);
    if (!target) {
      return;
    }

    await this.selectTarget(id);

    if (target.type === 'star') {
      const scene = this.sceneManager.getCurrentScene();
      if (scene instanceof SolarScene) {
        await scene.focusTarget(id, 'star');
        // 搜索恒星：自动进入星表模式（Phase 2.19）。
        useUniverseStore().setObservationMode('STAR_CATALOG');
      }
      return;
    }

    if (target.type === 'deepSky') {
      // 深空天体定位（Phase 2.21）：ExplorationManager 内部已切自由探索模式。
      const scene = this.sceneManager.getCurrentScene();
      if (scene instanceof SolarScene) {
        await scene.focusTarget(id, 'deepSky');
        useUniverseStore().setObservationMode('FREE_EXPLORATION');
      }
      return;
    }

    if (target.type === 'spacecraft') {
      // 探测器定位（Phase 2.22）：聚焦任务探测器（MissionController → CameraController）。
      await this.selectMission(target.id);
      const scene = this.sceneManager.getCurrentScene();
      if (scene instanceof SolarScene) {
        await scene.focusSpacecraft(target.id);
      }
    }
  }

  /** 清除统一目标选择（Phase 2.18）：Store + 高亮 + 相机复位。 */
  async clearTarget(): Promise<void> {
    if (this.destroyed) {
      return;
    }

    useUniverseStore().clearTarget();

    const scene = this.sceneManager.getCurrentScene();
    if (!(scene instanceof SolarScene)) {
      return;
    }

    scene.hidePlanetHighlight();
    try {
      await scene.resetCamera();
    } catch (error) {
      // Reset 失败时高亮仍保持隐藏，Store 选择状态已清除。
      this.reportError(error, 'clearTarget');
    }
  }

  /** 清除天体选择（兼容旧接口，内部统一走 clearTarget）。 */
  async clearPlanetSelection(): Promise<void> {
    await this.clearTarget();
  }

  /** 收藏/取消收藏目标（Phase 2.18）：切换收藏状态（只保存 id）。 */
  /**
   * 开启望远镜模式（Phase 2.21）：
   * UI → Coordinator → Store → ObservationController → CameraController。
   * 相机位置保持；FOV 由 TelescopeViewController 按倍率改变；星等过滤生效。
   */
  enableTelescope(): void {
    if (this.destroyed) {
      return;
    }

    const store = useUniverseStore();
    store.enableTelescope();

    const scene = this.sceneManager.getCurrentScene();
    if (scene instanceof SolarScene) {
      scene.enableTelescope(store.telescopeZoom, store.telescopeConfigId);
    }
    store.setObservationMode('TELESCOPE');
  }

  /** 关闭望远镜模式（Phase 2.21）：恢复 FOV / 星等过滤 / 相机与观察模式。 */
  disableTelescope(): void {
    if (this.destroyed) {
      return;
    }

    const store = useUniverseStore();
    store.disableTelescope();

    const scene = this.sceneManager.getCurrentScene();
    if (scene instanceof SolarScene) {
      scene.disableTelescope();
      // 恢复进入前的观察模式（场景侧记录了 previous，读回同步 Store）。
      store.setObservationMode(scene.getObservationMode());
    } else {
      store.setObservationMode('SOLAR_SYSTEM');
    }
  }

  /** 调整望远镜倍率（Phase 2.21；[1, 128] 钳制，Store + 场景同步）。 */
  setTelescopeZoom(zoom: number): void {
    if (this.destroyed) {
      return;
    }

    const store = useUniverseStore();
    store.setTelescopeZoom(zoom);

    const scene = this.sceneManager.getCurrentScene();
    if (scene instanceof SolarScene) {
      scene.setTelescopeZoom(store.telescopeZoom);
    }
  }

  /** 切换望远镜配置（Phase 2.21；启用中立即生效）。 */
  setTelescopeConfigId(configId: string): void {
    if (this.destroyed) {
      return;
    }

    const store = useUniverseStore();
    store.setTelescopeConfigId(configId);

    if (store.telescopeEnabled) {
      this.enableTelescope();
    }
  }

  /** 望远镜状态快照（Phase 2.21；供 TelescopePanel 展示；不可用时返回 null）。 */
  getTelescopeState(): {
    enabled: boolean;
    zoom: number;
    fieldOfViewDeg: number;
    limitingMagnitude: number;
  } | null {
    if (this.destroyed) {
      return null;
    }
    const scene = this.sceneManager.getCurrentScene();
    if (!(scene instanceof SolarScene)) {
      return null;
    }
    return scene.getTelescopeState();
  }

  toggleFavorite(id: string): void {
    if (this.destroyed) {
      return;
    }
    const store = useUniverseStore();
    if (store.favoriteTargets.includes(id)) {
      store.removeFavorite(id);
    } else {
      store.addFavorite(id);
    }
  }

  /**
   * 设置观测地点（Phase 2.20）：Store 校验存储 + SolarScene ObservationEngine 同步；
   * 设置成功后自动进入夜间观测模式。
   */
  setObserverLocation(latitude: number, longitude: number, name: string): void {
    if (this.destroyed) {
      return;
    }
    const location = createObserverLocation(latitude, longitude, name);
    if (!location) {
      return;
    }
    useUniverseStore().setObserverLocation(location);
    const scene = this.sceneManager.getCurrentScene();
    if (scene instanceof SolarScene) {
      scene.setObserverLocation(location.latitude, location.longitude, location.name);
      // 设置地点后自动进入夜间观测模式（Phase 2.20）。
      this.setObservationMode('NIGHT_OBSERVATION');
    }
  }

  /**
   * 设置观测日期时间（Phase 2.20）：
   * Store 快照 + 日期同步模拟日期（时钟）+ 时刻下发观测引擎（LST 偏移）。
   */
  setObserverDateTime(dateTime: string): void {
    if (this.destroyed) {
      return;
    }
    const store = useUniverseStore();
    store.setObserverDateTime(dateTime);
    if (store.observerDateTime !== dateTime) {
      return; // 非法输入被 Store 忽略。
    }
    const parts = dateTime.split('T');
    const timePart = parts[1] ?? '';
    const timeParts = timePart.split(':');
    const hours = Number(timeParts[0]) + Number(timeParts[1]) / 60;
    const scene = this.sceneManager.getCurrentScene();
    if (scene instanceof SolarScene) {
      scene.setObservationTimeOfDay(hours);
    }
  }

  /** 仅显示可见目标开关桥接（Phase 2.20）：Store + SolarScene 标签可见性驱动。 */
  setVisibleOnly(enabled: boolean): void {
    if (this.destroyed) {
      return;
    }
    useUniverseStore().setVisibleOnly(enabled);
    const scene = this.sceneManager.getCurrentScene();
    if (scene instanceof SolarScene) {
      scene.setVisibleOnly(enabled);
    }
  }

  /** 当前可见目标列表（Phase 2.20；非太阳系场景返回空数组）。 */
  getVisibleTargets(): ReturnType<SolarScene['getVisibleTargets']> {
    if (this.destroyed) {
      return [];
    }
    const scene = this.sceneManager.getCurrentScene();
    return scene instanceof SolarScene ? scene.getVisibleTargets() : [];
  }

  /** 当前本地恒星时（度）；未就绪返回 NaN。 */
  getLocalSiderealTime(): number {
    if (this.destroyed) {
      return Number.NaN;
    }
    const scene = this.sceneManager.getCurrentScene();
    return scene instanceof SolarScene ? scene.getLocalSiderealTime() : Number.NaN;
  }

  /** 自动聚焦当前最佳可见目标（Phase 2.20）：今晚最佳目标（如 Sirius）。 */
  async focusVisibleTarget(): Promise<void> {
    if (this.destroyed) {
      return;
    }
    const scene = this.sceneManager.getCurrentScene();
    if (scene instanceof SolarScene) {
      await scene.focusVisibleTarget();
    }
  }

  /**
   * 时间倍率桥接：Store 规范化后同步到 SolarScene 模拟状态。
   * Vue 层未来通过该方法控制演示速度。
   */
  setTimeScale(timeScale: number): void {
    if (this.destroyed) {
      return;
    }

    const store = useUniverseStore();
    store.setTimeScale(timeScale);
    const scene = this.sceneManager.getCurrentScene();
    if (scene instanceof SolarScene) {
      // 使用 Store 规范化后的值（非法输入已恢复为 1）。
      scene.setSimulationState({ timeScale: store.timeScale });
    }
  }

  /** 业务动画暂停桥接：Store 状态同步到 SolarScene 模拟状态。 */
  setAnimationPaused(paused: boolean): void {
    if (this.destroyed) {
      return;
    }

    useUniverseStore().setAnimationPaused(paused);
    const scene = this.sceneManager.getCurrentScene();
    if (scene instanceof SolarScene) {
      scene.setSimulationState({ animationPaused: paused });
    }
  }

  /**
   * 预设模拟速度档位桥接（Phase 2.13.1）：内部复用 setTimeScale
   * （Store 规范化 + SolarScene 同步，NaN / Infinity / 负数安全兜底）。
   */
  setSimulationSpeed(speed: number): void {
    this.setTimeScale(speed);
  }

  /** 模拟暂停/继续语义化入口（Phase 2.13.1）：等价 setAnimationPaused。 */
  setSimulationPaused(paused: boolean): void {
    this.setAnimationPaused(paused);
  }

  /**
   * 模拟日期桥接（Phase 2.14.3）：Store 安全校验后同步到 SolarScene。
   * 本阶段 SolarScene 只保存日期状态，不改变轨道计算（禁止 Date.now() 实时系统）。
   */
  /** 天体标签显示开关桥接（Phase 2.14.4）：Store 状态同步到 SolarScene 标签管理器。 */
  setPlanetLabelsVisible(visible: boolean): void {
    if (this.destroyed) {
      return;
    }

    useUniverseStore().setPlanetLabelsVisible(visible);
    const scene = this.sceneManager.getCurrentScene();
    if (scene instanceof SolarScene) {
      scene.setPlanetLabelsVisible(visible);
    }
  }

  /** 清除恒星选择（Phase 2.17）。 */
  clearStarSelection(): void {
    if (this.destroyed) {
      return;
    }
    useUniverseStore().clearStarSelection();
  }

  /** 深空观察模式桥接（Phase 2.17）：Store 同步 + SolarScene ObservationController 切换。 */
  /**
   * 重新加载当前场景（Phase 2.16 FR-003）：清空模型缓存并重建场景，
   * 用于加载失败后的「重新加载」入口；加载状态重新走 LoadingScreen。
   */
  async reloadScene(): Promise<void> {
    if (this.destroyed) {
      return;
    }

    const store = useUniverseStore();
    try {
      store.setError(null);
      store.setLoading(true, '正在重新加载太阳系资源');
      store.setLoadingProgress(0);
      // 清模型缓存：重新加载时获得全新资源，避免复用脏缓存（Phase 2.16 FR-012/013）。
      modelLoader.clearCache();
      await this.sceneManager.reloadCurrentScene();
      const scene = this.sceneManager.getCurrentScene();
      if (scene instanceof SolarScene) {
        this.bindSolarScene(scene);
      }
      store.setLoadingProgress(100, '场景资源已加载');
      store.setLoading(false);
    } catch (error) {
      store.setLoading(false);
      store.setError(toSerializableError(error, 'reloadScene'));
    }
  }

  /**
   * 选择航天任务（Phase 2.22）：
   * UI → Coordinator → Store → MissionController；加载后自动播放（速度沿用档位）。
   */
  selectMission(missionId: string): void {
    if (this.destroyed) {
      return;
    }

    const store = useUniverseStore();
    store.selectMission(missionId);
    store.setMissionPlaying(true);

    const scene = this.sceneManager.getCurrentScene();
    if (!(scene instanceof SolarScene)) {
      return;
    }
    if (scene.loadMission(missionId)) {
      scene.setMissionSpeed(store.missionSpeed);
      scene.playMission();
    }
  }

  /** 播放任务时间线（Phase 2.22）。 */
  playMission(): void {
    if (this.destroyed) {
      return;
    }
    const store = useUniverseStore();
    store.setMissionPlaying(true);
    const scene = this.sceneManager.getCurrentScene();
    if (scene instanceof SolarScene) {
      scene.playMission();
    }
  }

  /** 暂停任务时间线（Phase 2.22）。 */
  pauseMission(): void {
    if (this.destroyed) {
      return;
    }
    const store = useUniverseStore();
    store.setMissionPlaying(false);
    const scene = this.sceneManager.getCurrentScene();
    if (scene instanceof SolarScene) {
      scene.pauseMission();
    }
  }

  /** 设置任务播放速度（Phase 2.22；1 / 10 / 100 / 1000 档位）。 */
  setMissionSpeed(speed: number): void {
    if (this.destroyed) {
      return;
    }
    const store = useUniverseStore();
    store.setMissionSpeed(speed);
    const scene = this.sceneManager.getCurrentScene();
    if (scene instanceof SolarScene) {
      scene.setMissionSpeed(store.missionSpeed);
    }
  }

  /** 聚焦当前任务探测器（Phase 2.22）：相机过渡并跟随（MISSION_FOLLOW）。 */
  focusMission(): void {
    if (this.destroyed) {
      return;
    }
    const missionId = useUniverseStore().selectedMissionId;
    if (!missionId) {
      return;
    }
    const scene = this.sceneManager.getCurrentScene();
    if (scene instanceof SolarScene) {
      void scene.focusSpacecraft(missionId);
    }
  }

  /** 跟随当前任务探测器（Phase 2.22）：立即进入 MISSION_FOLLOW。 */
  followMission(): void {
    if (this.destroyed) {
      return;
    }
    const missionId = useUniverseStore().selectedMissionId;
    if (!missionId) {
      return;
    }
    const scene = this.sceneManager.getCurrentScene();
    if (scene instanceof SolarScene) {
      scene.followSpacecraft(missionId);
    }
  }

  /** 任务状态快照（Phase 2.22；供 MissionControlPanel 展示；不可用时返回 null）。 */
  getMissionState(): {
    missionId: string | null;
    missionDate: string;
    speed: number;
    paused: boolean;
  } | null {
    if (this.destroyed) {
      return null;
    }
    const scene = this.sceneManager.getCurrentScene();
    if (!(scene instanceof SolarScene)) {
      return null;
    }
    return scene.getMissionState();
  }

  setObservationMode(mode: ObservationMode): void {
    if (this.destroyed) {
      return;
    }

    useUniverseStore().setObservationMode(mode);
    const scene = this.sceneManager.getCurrentScene();
    if (scene instanceof SolarScene) {
      scene.setObservationMode(mode);
    }
  }

  /**
   * 获取天文计算状态（Phase 2.15）：SolarScene 内 AstronomyClock/Engine 的快照。
   * 非太阳系场景或未就绪时返回 null（UI 显示空状态）。
   */
  /**
   * 获取天文事件（Phase 2.16）：SolarScene 内 AstronomyEventEngine 的当前/未来事件。
   * 非太阳系场景或未就绪时返回 null（UI 显示空状态）。
   */
  getAstronomyEvents(): ReturnType<SolarScene['getAstronomyEvents']> {
    if (this.destroyed) {
      return null;
    }
    const scene = this.sceneManager.getCurrentScene();
    return scene instanceof SolarScene ? scene.getAstronomyEvents() : null;
  }

  /** 天文事件开关桥接（Phase 2.16）：Store 状态同步到 SolarScene 事件引擎。 */
  setAstronomyEventsEnabled(enabled: boolean): void {
    if (this.destroyed) {
      return;
    }

    useUniverseStore().setAstronomyEventsEnabled(enabled);
    const scene = this.sceneManager.getCurrentScene();
    if (scene instanceof SolarScene) {
      scene.setAstronomyEventsEnabled(enabled);
    }
  }

  /**
   * 跳转并聚焦天文事件（Phase 2.16 事件交互）：
   * 设置模拟日期 → 定位并高亮相关天体 → 打开天体面板。
   * 链路：EventPanel → Coordinator → SolarScene → CameraController / HighlightEffect。
   */
  async focusAstronomyEvent(event: AstronomyEvent): Promise<void> {
    if (this.destroyed) {
      return;
    }

    const scene = this.sceneManager.getCurrentScene();
    if (!(scene instanceof SolarScene)) {
      return;
    }

    // 1. 选择首个可聚焦的相关天体（复用 selectPlanet：Store + 高亮 + 相机聚焦 + 面板）。
    const target = event.relatedBodies.find((id) => scene.hasPlanet(id));
    if (target) {
      await this.selectPlanet(target);
    }
  }

  /** 轨道显示桥接：Store 状态同步到 SolarScene 轨道管理器。 */
  setOrbitVisible(visible: boolean): void {
    if (this.destroyed) {
      return;
    }

    useUniverseStore().setOrbitVisible(visible);
    const scene = this.sceneManager.getCurrentScene();
    if (scene instanceof SolarScene) {
      scene.setOrbitVisible(visible);
    }
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
