import {
  AmbientLight,
  AxesHelper,
  Color,
  GridHelper,
  Object3D,
  PerspectiveCamera,
  PointLight,
  Scene,
  Vector3,
} from 'three';
import { BaseScene } from '@/three/core/BaseScene';
import type { SceneContext } from '@/three/core/three.types';
import { PlanetManager } from '@/three/solar/PlanetManager';
import { OrbitManager } from '@/three/solar/OrbitManager';
import { SatelliteManager } from '@/three/solar/SatelliteManager';
import { AsteroidBeltManager } from '@/three/solar/AsteroidBeltManager';
import { CometManager } from '@/three/solar/CometManager';
import { asteroidBeltConfig } from '@/data/comets/asteroid-belt.config';
import { halleyCometConfig } from '@/data/comets/halley.comet';
import { RingManager } from '@/three/solar/RingManager';
import type { PlanetSelectedHandler, PlanetUpdateOptions } from '@/three/solar/solar.types';
import { InteractionManager } from '@/three/controllers/InteractionManager';
import { CameraController, computeSafeCameraDistance } from '@/three/controllers/CameraController';
import { HighlightEffect } from '@/three/effects/HighlightEffect';
import { SunGlowEffect } from '@/three/effects/SunGlowEffect';
import { EarthCloudEffect } from '@/three/effects/EarthCloudEffect';
import { BackgroundStarField } from '@/three/background/BackgroundStarField';
import { StarCatalogManager } from '@/three/stars/StarCatalogManager';
import { ConstellationManager } from '@/three/stars/ConstellationManager';
import { ObservationController } from '@/three/controllers/ObservationController';
import { ExplorationManager } from '@/three/exploration/ExplorationManager';
import { DeepSkyManager } from '@/three/deepsky/DeepSkyManager';
import { deepSkyRepository } from '@/repositories/DeepSkyRepository';
import { MissionController } from '@/three/controllers/MissionController';
import { SpacecraftManager } from '@/three/mission/SpacecraftManager';
import { TrajectoryRenderer } from '@/three/mission/TrajectoryRenderer';
import { missionRepository } from '@/repositories/MissionRepository';
import { TelescopeViewController } from '@/three/controllers/TelescopeViewController';
import { TelescopeEngine } from '@/astronomy/TelescopeEngine';
import { ENTRY_TELESCOPE, TELESCOPE_CONFIGS } from '@/data/telescope/telescopes';
import { PlanetLabelManager } from '@/three/effects/PlanetLabelManager';
import { starRepository } from '@/repositories/StarRepository';
import { AstronomyEventEngine } from '@/astronomy/AstronomyEventEngine';
import { ObservationEngine } from '@/astronomy/ObservationEngine';
import type { TargetVisibility } from '@/astronomy/observation.types';
import type { AstronomyEventsResult } from '@/astronomy/events/astronomy-event.types';
import type { CameraMode, ObservationMode } from '@/types/common.types';
import { planetRepository } from '@/repositories/PlanetRepository';
import { modelLoader } from '@/three/loaders/ModelLoader';
import { LoadingTracker, type LoadingProgressState } from '@/three/loaders/LoadingTracker';

/** 太阳点光源颜色（暖白）。 */
const SUN_LIGHT_COLOR = 0xfff3e0;
/** 太阳点光源强度（r181 物理光照单位，照亮 14 单位外的地球）。 */
const SUN_LIGHT_INTENSITY = 200;
/** 环境光强度：仅用于避免背面完全漆黑。 */
const AMBIENT_LIGHT_INTENSITY = 0.35;
/** GridHelper 下移高度，避免网格线与太阳占位球相交遮挡。 */
const GRID_Y = -3.5;

/**
 * 太阳系调试辅助配置（Phase 2.20.1）：生产环境默认关闭。
 * 保留 GridHelper / AxesHelper 代码与资源登记，由配置控制创建。
 */
export interface SolarDebugOptions {
  /** 显示 GridHelper（调试网格）。 */
  readonly showGrid: boolean;
  /** 显示 AxesHelper（坐标轴）。 */
  readonly showAxes: boolean;
}

/** 默认调试配置（生产：全部关闭）。 */
const SOLAR_DEBUG_DEFAULTS: SolarDebugOptions = {
  showGrid: false,
  showAxes: false,
};
/** 默认相机位置（Phase 2.22 十：太阳系视觉主体占比提升，距离 22.34 → 16；
 *  相对初始 27.93 总放大 ~75%）。 */
const DEFAULT_CAMERA_POSITION = new Vector3(8, 5.7, 12.6);
/** 默认观察目标（太阳系中心）。 */
const DEFAULT_CAMERA_TARGET = new Vector3(0, 0, 0);

/**
 * 太阳系场景（Phase 2.4：地球公转、自转 + Three.js 层模拟状态控制）。
 *
 * 两类暂停语义：
 * - 场景生命周期暂停：由 BaseScene / SceneManager 控制，场景完全不更新。
 * - 业务动画暂停：由 setAnimationPaused 控制，场景仍渲染但天体与辅助动画不运动。
 *
 * 节点层级（Phase 2.11 多中心 + Phase 2.12 视觉增强）：
 *
 * ```text
 * scene
 * ├── BackgroundStarField          // 随机星空背景（Phase 2.13）
 * ├── StarCatalogPoints           // 真实恒星层（Phase 2.17）
 * ├── ConstellationLines          // 星座连线（Phase 2.17）
 * ├── ObservationAnchors          // 观察模式锚点（Phase 2.17）
 * ├── StarField                   // 星空背景（与 SolarSystemRoot 同级，不随太阳系移动）
 * └── SolarSystemRoot
 *     ├── SunGlowOuter / SunGlowInner     // 光晕 Sprite，挂根节点（不随太阳自转）
 *     ├── SunOrbitNode                    // 固定于原点（无公转）
 *     │   └── SunBodyRoot
 *     │       ├── SunRotationNode → SunModelPivot → SunModel
 *     │       └── SunCameraAnchor
 *     ├── EarthOrbitNode                  // 行星挂载于 SunBodyRoot（多中心层级）
 *     │   └── EarthBodyRoot
 *     │       ├── EarthRotationNode → EarthModelPivot → EarthModel
 *     │       ├── EarthCloud              // 云层球（独立旋转）
 *     │       ├── EarthCameraAnchor
 *     │       └── MoonOrbitNode           // 卫星：月球绕地球公转
 *     │           └── MoonBodyRoot
 *     │               ├── MoonRotationNode → MoonModelPivot → MoonModel
 *     │               └── MoonCameraAnchor
 *     └── SaturnBodyRoot
 *         ├── SaturnRotationNode → SaturnModelPivot → SaturnModel
 *         └── SaturnRing                  // 程序化环（跟随公转与轴倾角）
 * ```
 *
 * 资源所有权：本场景创建的 Geometry / Material 全部登记到
 * ResourceManager('solar')，由 releaseGroup 统一释放；onDestroy 只负责
 * 移除节点与清空引用，不重复 dispose。
 */
export class SolarScene extends BaseScene {
  readonly sceneName = 'solar' as const;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(55, 1, 0.1, 1000);

  private solarSystemRoot: Object3D | null = null;
  private pointLight: PointLight | null = null;
  private ambientLight: AmbientLight | null = null;
  private planetManager: PlanetManager | null = null;
  private satelliteManager: SatelliteManager | null = null;
  private orbitManager: OrbitManager | null = null;
  private ringManager: RingManager | null = null;
  private sunGlowEffect: SunGlowEffect | null = null;
  private earthCloudEffect: EarthCloudEffect | null = null;
  private starField: BackgroundStarField | null = null;
  private starCatalogManager: StarCatalogManager | null = null;
  private constellationManager: ConstellationManager | null = null;
  private observationController: ObservationController | null = null;
  private explorationManager: ExplorationManager | null = null;
  private missionController: MissionController | null = null;
  private telescopeViewController: TelescopeViewController | null = null;
  private deepSkyManager: DeepSkyManager | null = null;
  /** 任务日期上报处理器（Phase 2.22 Coordinator 注册）；null 时安全忽略。 */
  private missionDateHandler: ((date: string) => void) | null = null;

  /** 调试辅助配置（Phase 2.20.1；默认生产关闭）。 */
  private readonly debugOptions: SolarDebugOptions = { ...SOLAR_DEBUG_DEFAULTS };

  /** 加载进度跟踪器（Phase 2.16；每场景实例独立，destroy 幂等）。 */
  private loadingTracker: LoadingTracker | null = null;
  /** 加载进度上报处理器（Phase 2.16 Coordinator 注册）；null 时安全忽略。 */
  private loadingProgressHandler: ((state: LoadingProgressState) => void) | null = null;

  /** 进入望远镜模式前的观察模式（Phase 2.21；退出时恢复）。 */
  private telescopePreviousObservationMode: ObservationMode | null = null;
  /** 当前望远镜配置 ID（Phase 2.21；默认入门镜）。 */
  private telescopeConfigId = 'entry';
  private planetLabelManager: PlanetLabelManager | null = null;
  /** 小天体管理器（Phase 2.23：小行星带 + 哈雷彗星）。 */
  private asteroidBeltManager: AsteroidBeltManager | null = null;
  private cometManager: CometManager | null = null;
  private astronomyEventEngine: AstronomyEventEngine | null = null;
  private observationEngine: ObservationEngine | null = null;
  private cameraController: CameraController | null = null;
  private highlightEffect: HighlightEffect | null = null;
  private interactionManager: InteractionManager | null = null;
  private grid: GridHelper | null = null;
  private axes: AxesHelper | null = null;

  /** 上层选择事件处理器（Phase 2.9 ApplicationCoordinator 注册）；null 时点击安全无副作用。 */
  private planetSelectedHandler: PlanetSelectedHandler | null = null;

  /** 空白点击处理器（Phase 2.13.2 ApplicationCoordinator 注册）；null 时点击安全无副作用。 */
  private planetEmptySelectedHandler: (() => void) | null = null;

  /** 恒星选择处理器（Phase 2.17 ApplicationCoordinator 注册）；null 时点击安全无副作用。 */
  private starSelectedHandler: ((starId: string) => void) | null = null;
  /** 小天体选择处理器（Phase 2.23：哈雷彗星等；Coordinator 注册）。 */
  private solarObjectSelectedHandler: ((objectId: string) => void) | null = null;

  /** 统一目标选择处理器（Phase 2.18 ApplicationCoordinator 注册）；null 时点击安全无副作用。 */
  private targetSelectedHandler: ((target: { id: string; type: 'planet' | 'moon' | 'star' | 'deepSky' | 'spacecraft' }) => void) | null = null;

  /** 相机模式变化处理器（Phase 2.9 ApplicationCoordinator 注册后同步到 Store）。 */
  private cameraModeHandler: ((mode: CameraMode) => void) | null = null;

  /** 模拟日期状态（Phase 2.14.3，用户模拟时间，非 Date.now() 实时系统）。
   * 本阶段仅保存状态，不参与轨道计算；值由 Store 校验后经 Coordinator 下发。 */

  /**
   * Three.js 层模拟状态（非响应式、可序列化）。
   * 由 setTimeScale / setAnimationPaused / setSimulationState 命令驱动。
   */
  private simulationState: PlanetUpdateOptions = {
    timeScale: 1,
    animationPaused: false,
  };

  protected async onInit(context: SceneContext): Promise<void> {
    this.scene.background = new Color(0x060b1c);
    // 默认相机位置保证太阳（原点）与地球（轨道半径 14 处）同屏可见。
    this.camera.position.copy(DEFAULT_CAMERA_POSITION);
    this.camera.lookAt(DEFAULT_CAMERA_TARGET);

    // 调试辅助对象（Phase 2.20.1：由 debugOptions 控制，生产默认关闭；
    // 网格下移避免遮挡太阳；代码与资源登记保留）。
    if (this.debugOptions.showGrid) {
      this.grid = new GridHelper(12, 12, 0x3a88ff, 0x1d2d52);
      this.grid.position.y = GRID_Y;
      this.scene.add(this.grid);
      context.resources.registerDisposable(this.sceneName, this.grid.geometry);
      context.resources.registerDisposable(this.sceneName, this.grid.material);
    }
    if (this.debugOptions.showAxes) {
      this.axes = new AxesHelper(2.5);
      this.scene.add(this.axes);
      context.resources.registerDisposable(this.sceneName, this.axes.geometry);
      context.resources.registerDisposable(this.sceneName, this.axes.material);
    }

    try {
      const root = this.createSolarSystemRoot();
      // 天文时间层先行：时钟与引擎在视觉创建前就绪（Phase 2.15）。
      this.createAstronomy();
      // GLTF 模型加载为异步：等待全部天体（含卫星）完成后再进入视觉与交互初始化。
      this.createLights();
      await this.createPlanets(root, context);
      this.createOrbits(root, context);
      this.createRings(context);
      this.createSunGlow(context);
      this.createEarthCloud(context);
      this.createStarField(context);
      this.createStarCatalog(context);
      this.createConstellation(context);
      this.createPlanetLabels(context);
      // OrbitControls 先注册 Pointer 事件，InteractionManager 后注册点击观察。
      this.createCameraController(context);
      this.createObservation();
      this.createExploration();
      this.createMission(context);
      this.createTelescope();
      this.createDeepSky(context);
      // 小天体生态（Phase 2.23）：小行星带 + 哈雷彗星（在交互初始化前创建，
      // 使彗核可注册进拾取通道）。
      this.createAsteroidBelt(root, context);
      this.createComets(root, context);
      this.createHighlightEffect(context);
      this.createInteraction(context);
      this.scene.add(root);
    } catch (error) {
      // 初始化中途失败时清理已创建资源，避免半初始化场景残留。
      this.onDestroy();
      throw error;
    }
  }

  update(deltaTime: number, _elapsedTime: number): void {
    // Phase 2.22 精简：天文时间模块（时钟/月相/模拟日期）已删除；
    // 观测/事件引擎保持初始状态（其 UI 入口已移除，无每帧驱动开销）。

    this.planetManager?.update(deltaTime, this.simulationState);
    // 小天体生态（Phase 2.23）：整体旋转 / 彗星公转（每帧仅标量与 position 写入）。
    this.asteroidBeltManager?.update(deltaTime);
    this.cometManager?.update(deltaTime);
    this.cameraController?.update(deltaTime);
    this.observationController?.update(deltaTime);
    this.missionController?.update(deltaTime);
    this.telescopeViewController?.update(deltaTime);
    this.deepSkyManager?.update(deltaTime, this.camera);
    // 最后更新高亮：读取最新天体位置与 Camera 朝向。
    this.highlightEffect?.update(deltaTime, this.camera);

    // 视觉动画（光晕呼吸、云层旋转、星空慢转）与业务暂停（animationPaused）保持一致：
    // 暂停时天体、辅助动画与视觉效果一并静止。
    if (!this.simulationState.animationPaused) {
      this.sunGlowEffect?.update(deltaTime, this.camera);
      this.earthCloudEffect?.update(deltaTime);
      this.ringManager?.update(deltaTime);
      this.starField?.update(deltaTime);
    }

    // 天体标签跟随天体位置（视觉层，不受业务暂停影响：位置静止时标签仍对齐）。
    this.planetLabelManager?.update(deltaTime, this.camera);

    // GridHelper 为开发辅助动画，业务暂停（animationPaused）时一并停止。
    if (!this.simulationState.animationPaused && this.grid) {
      this.grid.rotation.y += deltaTime * 0.05;
    }
  }

  /**
   * 设置时间倍率（>= 0）。非法值（NaN / Infinity / 负数）安全兜底为 1。
   * destroy 后调用安全返回。
   */
  setTimeScale(timeScale: number): void {
    this.setSimulationState({ timeScale });
  }

  /** 设置业务动画暂停状态。destroy 后调用安全返回。 */
  setAnimationPaused(paused: boolean): void {
    this.setSimulationState({ animationPaused: paused });
  }

  /**
   * 部分更新模拟状态（Phase 2.9 ApplicationCoordinator 接入入口）。
   * 只接收普通数字和布尔值，不接收 Store 实例。
   */
  setSimulationState(state: Partial<PlanetUpdateOptions>): void {
    if (this.destroyed) {
      return;
    }

    // PlanetUpdateOptions 字段只读，通过展开构造新状态对象，不修改旧对象。
    const next: PlanetUpdateOptions = {
      timeScale:
        state.timeScale !== undefined
          ? this.normalizeTimeScale(state.timeScale)
          : this.simulationState.timeScale,
      animationPaused:
        state.animationPaused !== undefined
          ? state.animationPaused
          : this.simulationState.animationPaused,
    };
    this.simulationState = next;

  }

  /** 全局显示/隐藏轨道（Phase 2.9 由 ApplicationCoordinator 从 store.orbitVisible 同步）。 */
  setOrbitVisible(visible: boolean): void {
    this.orbitManager?.setVisible(visible);
  }

  /** 全局显示/隐藏天体标签（Phase 2.14.4 由 ApplicationCoordinator 同步）。 */
  setPlanetLabelsVisible(visible: boolean): void {
    this.planetLabelManager?.setVisible(visible);
  }


  /**
   * 切换深空观察模式（Phase 2.17 / 2.20.2，由 Coordinator 从 store.starObservationMode 同步）。
   * 显隐联动：默认太阳系模式隐藏「恒星观测叠加层」与「星座连线」（避免干扰太阳系主视觉）；
   * 仅当用户手动切换到对应模式后才显示（不破坏模式结构，只改默认显隐）。
   */
  setObservationMode(mode: ObservationMode): void {
    this.observationController?.setMode(mode);
    // 恒星目录层（真实恒星 Sprite）：非太阳系模式（恒星观测/星座/星表/夜间观测）显示。
    if (this.starCatalogManager) {
      this.starCatalogManager.root.visible = mode !== 'SOLAR_SYSTEM';
    }
    // 星座连线：仅星座模式显示（默认隐藏）。
    if (this.constellationManager) {
      this.constellationManager.lines.visible = mode === 'CONSTELLATION_VIEW';
    }
  }

  /** 当前观察模式（Phase 2.17）。 */
  getObservationMode(): ObservationMode {
    return this.observationController?.getMode() ?? 'SOLAR_SYSTEM';
  }

  /**
   * 统一目标定位（Phase 2.18 / 2.21）：
   * - star / deepSky：按世界坐标聚焦（ExplorationManager + CameraController.focusPosition）。
   * - planet / moon：经 cameraAnchor 聚焦（focusPlanet）。
   */
  focusTarget(id: string, type: 'planet' | 'moon' | 'star' | 'deepSky'): Promise<void> {
    if (type === 'star' || type === 'deepSky') {
      const position =
        type === 'star'
          ? this.getStarWorldPosition(id)
          : (this.deepSkyManager?.getPosition(id) ?? null);
      if (!position) {
        return Promise.resolve();
      }
      const result = this.explorationManager?.focusTarget(type, position);
      return result instanceof Promise ? result : Promise.resolve();
    }
    return this.focusPlanet(id);
  }

  /** 从恒星目录层读取恒星世界坐标（无该恒星返回 null）。 */
  private getStarWorldPosition(starId: string): { x: number; y: number; z: number } | null {
    return this.starCatalogManager?.getPosition(starId) ?? null;
  }

  /**
   * 开启望远镜模式（Phase 2.21，Coordinator 桥接）：
   * - 记录进入前的观察模式（退出时恢复）。
   * - CameraController 进入 TELESCOPE 状态（保持相机位置）。
   * - TelescopeViewController 按倍率改变 FOV。
   * - StarCatalogManager 按当前极限星等过滤（只改 visible）。
   * - ObservationController 切换到 TELESCOPE 模式。
   */
  enableTelescope(zoom: number, configId?: string): void {
    if (!this.cameraController || !this.telescopeViewController) {
      return;
    }
    if (configId && configId !== this.telescopeConfigId) {
      const config = TELESCOPE_CONFIGS[configId];
      if (config) {
        // 从配置初始化引擎（口径等参数驱动极限星等；切换配置时重建控制器）。
        this.telescopeViewController = new TelescopeViewController(
          this.camera,
          new TelescopeEngine(config),
        );
        this.telescopeConfigId = configId;
      }
    }
    if (!this.telescopeViewController.isEnabled()) {
      this.telescopePreviousObservationMode = this.getObservationMode();
    }
    this.cameraController.enterTelescope();
    this.telescopeViewController.setEnabled(true);
    this.telescopeViewController.setZoom(zoom);
    this.starCatalogManager?.setLimitingMagnitude(
      this.telescopeViewController.getLimitingMagnitude(),
    );
    this.observationController?.setMode('TELESCOPE');
  }

  /** 关闭望远镜模式（Phase 2.21）：恢复 FOV / 星等过滤 / 相机与观察模式。 */
  disableTelescope(): void {
    if (!this.cameraController || !this.telescopeViewController) {
      return;
    }
    this.telescopeViewController.reset();
    this.cameraController.exitTelescope();
    this.starCatalogManager?.setLimitingMagnitude(null);
    const previous = this.telescopePreviousObservationMode ?? 'SOLAR_SYSTEM';
    this.telescopePreviousObservationMode = null;
    this.observationController?.setMode(previous);
  }

  /** 调整望远镜倍率（Phase 2.21）：倍率改变 FOV 与极限星等（仅望远镜模式生效）。 */
  setTelescopeZoom(zoom: number): void {
    const controller = this.telescopeViewController;
    if (!controller) {
      return;
    }
    controller.setZoom(zoom);
    if (controller.isEnabled()) {
      this.starCatalogManager?.setLimitingMagnitude(controller.getLimitingMagnitude());
    }
  }

  /** 望远镜状态快照（Phase 2.21，Coordinator → UI；数据可序列化）。 */
  getTelescopeState(): {
    enabled: boolean;
    zoom: number;
    fieldOfViewDeg: number;
    limitingMagnitude: number;
  } | null {
    const controller = this.telescopeViewController;
    if (!controller) {
      return null;
    }
    return {
      enabled: controller.isEnabled(),
      zoom: controller.getZoom(),
      fieldOfViewDeg: controller.getFieldOfView(),
      limitingMagnitude: controller.getLimitingMagnitude(),
    };
  }

  /**
   * 天文事件快照（Phase 2.16）：当前与未来事件（事件引擎整数日缓存）。
   * 供 Coordinator → 事件面板展示；数据可序列化。
   */
  getAstronomyEvents(): AstronomyEventsResult | null {
    return this.astronomyEventEngine?.getEvents() ?? null;
  }

  /** 启用 / 禁用天文事件计算（Phase 2.16，由 Coordinator 从 store 开关同步）。 */
  setAstronomyEventsEnabled(enabled: boolean): void {
    this.astronomyEventEngine?.setEnabled(enabled);
  }

  /** 指定天体是否存在于当前场景（Phase 2.16 事件聚焦用）。 */
  hasPlanet(planetId: string): boolean {
    return this.planetManager?.getPlanet(planetId) !== undefined;
  }

  /** 设置观测时刻偏移（小时，Phase 2.20；由 Coordinator 从观测面板时间下发）。 */
  setObservationTimeOfDay(hours: number): void {
    this.observationEngine?.setTimeOfDay(hours);
  }

  /** 设置观测地点（Phase 2.20；由 Coordinator 从观测面板下发；非法忽略）。 */
  setObserverLocation(latitude: number, longitude: number, name: string): boolean {
    return this.observationEngine?.setLocation(latitude, longitude, name) ?? false;
  }

  /** 设置仅显示可见目标开关（Phase 2.22 精简：观测环境 UI 已移除，接口保留兼容；恒星标签不显示）。 */
  setVisibleOnly(_enabled: boolean): void {
    this.starCatalogManager?.stars.forEach((sprite) => {
      sprite.visible = true;
    });
  }

  /** 当前可见目标列表（按高度角降序；观测面板展示）。 */
  getVisibleTargets(): readonly TargetVisibility[] {
    return this.observationEngine?.getVisibleTargets() ?? [];
  }

  /** 当前本地恒星时（度）；引擎未就绪返回 NaN。 */
  getLocalSiderealTime(): number {
    return this.observationEngine?.getLocalSiderealTime() ?? Number.NaN;
  }

  /**
   * 自动聚焦当前最佳可见目标（Phase 2.20）：取可见列表中高度角最高的恒星。
   * 无可见目标时安全返回。
   */
  async focusVisibleTarget(): Promise<void> {
    const visible = this.getVisibleTargets();
    if (visible.length === 0) {
      return;
    }
    const best = visible[0];
    if (!best) {
      return;
    }
    await this.focusTarget(best.starId, 'star');
  }

  /**
   * 注册天体选择事件处理器（null 清除）。
   * 上层（Phase 2.9 ApplicationCoordinator）通过该接口接收 planetId。
   */
  setPlanetSelectedHandler(handler: PlanetSelectedHandler | null): void {
    this.planetSelectedHandler = handler;
  }

  /**
   * 注册空白点击处理器（null 清除，Phase 2.13.2）。
   * 上层（ApplicationCoordinator）通过该接口取消当前选择。
   */
  setPlanetEmptySelectedHandler(handler: (() => void) | null): void {
    this.planetEmptySelectedHandler = handler;
  }

  /**
   * 注册恒星选择处理器（null 清除，Phase 2.17）。
   * 上层（ApplicationCoordinator）通过该接口更新 Store 恒星选择。
   */
  setStarSelectedHandler(handler: ((starId: string) => void) | null): void {
    this.starSelectedHandler = handler;
  }

  /** 注册小天体选择处理器（Phase 2.23；null 清除；Coordinator 注册）。 */
  setSolarObjectSelectedHandler(handler: ((objectId: string) => void) | null): void {
    this.solarObjectSelectedHandler = handler;
  }

  /**
   * 注册统一目标选择处理器（null 清除，Phase 2.18）。
   * 上层（ApplicationCoordinator）通过该接口走统一选择链。
   */
  setTargetSelectedHandler(
    handler: ((target: { id: string; type: 'planet' | 'moon' | 'star' | 'deepSky' | 'spacecraft' }) => void) | null,
  ): void {
    this.targetSelectedHandler = handler;
  }

  /** 启用/禁用 Canvas 指针交互（Phase 2.9 场景切换与 Coordinator 预留）。 */
  setInteractionEnabled(enabled: boolean): void {
    this.interactionManager?.setEnabled(enabled);
  }

  /**
   * 聚焦天体：通过 PlanetManager 获取相机锚点与配置距离，交给 CameraController。
   * 不修改 Store、不显示高亮、不打开面板。
   */
  async focusPlanet(planetId: string): Promise<void> {
    if (this.destroyed || !this.cameraController) {
      return;
    }

    const runtime = this.planetManager?.getPlanet(planetId);
    const anchor = this.planetManager?.getCameraAnchor(planetId);
    if (!runtime || !anchor) {
      throw new Error(`PlanetManager 中找不到天体 ${planetId} 的相机锚点。`);
    }

    const distance = runtime.config.visual.cameraDistance;
    if (!Number.isFinite(distance) || distance <= 0) {
      throw new Error(`天体 ${planetId} 的 cameraDistance 非法（${distance}）。`);
    }

    // 安全距离：不小于目标视觉半径的 2.5 倍，避免相机进入天体内部。
    const safeDistance = computeSafeCameraDistance(distance, runtime.config.visual.radius);
    await this.cameraController.focus(anchor, { distance: safeDistance });
  }

  /** 复位到太阳系全局视角。不清除 Store（本阶段未接入 Store）。 */
  async resetCamera(): Promise<void> {
    if (this.destroyed) {
      return;
    }
    await this.cameraController?.reset();
  }

  /** 当前相机模式（FREE / FOCUSING / FOLLOWING / RESETTING）。 */
  getCameraMode(): CameraMode {
    return this.cameraController?.getMode() ?? 'FREE';
  }

  /**
   * 显示天体选中高亮：目标为 bodyRoot（天体中心），尺寸由 PlanetConfig 计算。
   * 未知 planetId 或非法尺寸抛出明确错误（由 Coordinator 走现有错误机制）。
   */
  showPlanetHighlight(planetId: string): void {
    if (this.destroyed) {
      return;
    }

    const runtime = this.planetManager?.getPlanet(planetId);
    if (!runtime) {
      throw new Error(`PlanetManager 中找不到天体 ${planetId}，无法显示高亮。`);
    }

    const { visual } = runtime.config;
    // baseScale = 视觉半径 × 整体缩放 × 高亮放大系数（地球当前 1.2 × 1 × 1.5 = 1.8）。
    const baseScale = visual.radius * visual.scale * visual.highlightScale;
    this.highlightEffect?.show(runtime.bodyRoot, baseScale);
  }

  /** 隐藏高亮（Camera Reset 与选择清除时调用）。 */
  hidePlanetHighlight(): void {
    this.highlightEffect?.hide();
  }

  /** 当前是否有可见高亮。 */
  isPlanetHighlighted(): boolean {
    return this.highlightEffect?.isVisible() ?? false;
  }

  /** 启用/禁用相机控制（Phase 2.9 场景切换与 Coordinator 预留）。 */
  setCameraEnabled(enabled: boolean): void {
    this.cameraController?.setEnabled(enabled);
  }

  private normalizeTimeScale(timeScale: number): number {
    return Number.isFinite(timeScale) && timeScale >= 0 ? timeScale : 1;
  }

  protected onDestroy(): void {
    // 先禁用并销毁交互管理器，移除 Canvas 监听，再清空选择回调，
    // 随后取消并销毁相机控制器（含 OrbitControls.dispose），避免旧过渡影响已销毁场景。
    this.interactionManager?.setEnabled(false);
    this.interactionManager?.destroy();
    this.interactionManager = null;
    this.planetSelectedHandler = null;
    this.planetEmptySelectedHandler = null;
    this.starSelectedHandler = null;
    this.solarObjectSelectedHandler = null;
    this.targetSelectedHandler = null;
    this.cameraModeHandler = null;
    this.missionDateHandler = null;
    this.loadingProgressHandler = null;

    // 加载跟踪器（Phase 2.16）：destroy 幂等；同时解绑全局 Loader 的失败回调
    // （避免旧场景实例被新场景的加载事件误触；新场景 init 时重新注册）。
    this.loadingTracker?.destroy();
    this.loadingTracker = null;
    modelLoader.onModelError = null;

    this.cameraController?.cancelTransition();
    this.cameraController?.destroy();
    this.cameraController = null;

    // 探索定位管理器：移除锚点并清引用（Phase 2.18）。
    this.explorationManager?.destroy();
    this.explorationManager = null;

    // 任务控制器：卸载探测器/轨迹并清引用（Phase 2.22；资源由 releaseGroup 统一释放）。
    this.missionController?.destroy();
    this.missionController = null;

    // 深空天体管理器：移除节点并清引用（Phase 2.21；纹理/材质由 releaseGroup 统一释放）。
    this.deepSkyManager?.destroy();
    this.deepSkyManager = null;

    // 望远镜视场控制器：恢复基础 FOV 并清引用（Phase 2.21）。
    this.telescopeViewController?.reset();
    this.telescopeViewController = null;

    // 观察模式控制器：移除锚点并清引用（Phase 2.17）。
    this.observationController?.destroy();
    this.observationController = null;

    this.highlightEffect?.hide();
    this.highlightEffect?.destroy();
    this.highlightEffect = null;

    // 视觉增强：光晕 → 云层 → 环，先于天体管理器销毁（不持有对方引用，顺序仅为可读性）。
    this.sunGlowEffect?.destroy();
    this.sunGlowEffect = null;

    this.earthCloudEffect?.destroy();
    this.earthCloudEffect = null;

    this.ringManager?.destroy();
    this.ringManager = null;

    // 星空背景：移除节点并清引用（Geometry/Material 由 releaseGroup 统一释放）。
    this.starField?.destroy();
    this.starField = null;

    // 真实恒星层与星座线：移除节点并清引用（Phase 2.17 / 2.19）。
    this.starCatalogManager?.destroy();
    this.starCatalogManager = null;

    this.constellationManager?.destroy();
    this.constellationManager = null;

    // 天体标签：移除 Sprite 并清引用（Texture/Material 由 releaseGroup 统一释放）。
    this.planetLabelManager?.destroy();
    this.planetLabelManager = null;

    // 天文计算层：纯计算模块，无资源释放，仅清引用。
    this.astronomyEventEngine = null;
    this.observationEngine = null;

    this.orbitManager?.destroy();
    this.orbitManager = null;

    // 卫星索引只清引用：节点与 GPU 资源由 PlanetManager / releaseGroup 统一处理。
    this.satelliteManager?.destroy();
    this.satelliteManager = null;

    // 全部天体（含太阳、卫星）的模型缓存由 PlanetManager.destroy 统一清理。
    this.planetManager?.destroy();
    this.planetManager = null;
    this.asteroidBeltManager?.destroy();
    this.asteroidBeltManager = null;
    this.cometManager?.destroy();
    this.cometManager = null;

    if (this.solarSystemRoot) {
      this.scene.remove(this.solarSystemRoot);
      this.solarSystemRoot = null;
    }

    if (this.pointLight) {
      this.scene.remove(this.pointLight);
      this.pointLight = null;
    }

    if (this.ambientLight) {
      this.scene.remove(this.ambientLight);
      this.ambientLight = null;
    }

    if (this.grid) {
      this.scene.remove(this.grid);
      this.grid = null;
    }

    if (this.axes) {
      this.scene.remove(this.axes);
      this.axes = null;
    }

    // 太阳 Geometry / Material 已登记到 ResourceManager('solar')，由 releaseGroup 释放；
    // SunModel 由 solarSystemRoot 节点树持有，根节点移除后整棵子树可被 GC。
  }

  /** 创建天文计算层（Phase 2.22 精简）：事件引擎 + 观测引擎（纯计算，无 Three.js 资源）。 */
  private createAstronomy(): void {
    this.astronomyEventEngine = new AstronomyEventEngine();
    // 天文观测引擎（Phase 2.20）：地点/恒星时/可见性（纯计算，无资源）。
    this.observationEngine = new ObservationEngine();
  }

  private createSolarSystemRoot(): Object3D {
    const root = new Object3D();
    root.name = 'solar-system-root';
    this.solarSystemRoot = root;
    return root;
  }

  private createLights(): void {
    // PointLight 模拟太阳照明，位于世界原点（太阳中心）。
    const pointLight = new PointLight(SUN_LIGHT_COLOR, SUN_LIGHT_INTENSITY, 0, 2);
    pointLight.position.set(0, 0, 0);
    this.pointLight = pointLight;

    // 环境光只用于避免背面完全漆黑。
    this.ambientLight = new AmbientLight(0xffffff, AMBIENT_LIGHT_INTENSITY);

    // 光源对象无需 dispose，但由本场景持有并在 destroy 时移除。
    this.scene.add(pointLight, this.ambientLight);
  }

  /**
   * 创建全部天体（Phase 2.11 多中心两阶段初始化）。
   *
   * 第一阶段：创建中心天体（star 与无 parentBodyId 的天体），挂载到 SolarSystemRoot。
   * 太阳（star）经统一管线创建：节点树、模型归一化、资源登记与行星完全一致。
   *
   * 第二阶段：按 parentBodyId 逐层解析父级创建卫星（挂父天体 bodyRoot）。
   * 循环直至全部卫星创建完成，支持任意层级（如未来的卫星的卫星）；
   * 父级缺失或存在循环依赖时抛出明确错误。
   */
  private async createPlanets(parent: Object3D, context: SceneContext): Promise<void> {
    const manager = new PlanetManager(parent, context.resources, this.sceneName);
    const satelliteManager = new SatelliteManager(manager);

    // 加载进度跟踪（Phase 2.16）：总数 = 全部天体；每个天体创建完成（成功或占位降级）推进一次。
    const tracker = this.ensureLoadingTracker();
    tracker.start(planetRepository.getAll().length);

    // 第一阶段：中心天体。
    for (const config of planetRepository.getAll()) {
      if (config.parentBodyId) {
        continue;
      }
      await manager.createPlanet(config);
      tracker.itemLoaded();
      this.syncLoadingProgress();
    }

    // 第二阶段：卫星（按层级解析父级，直至全部创建）。
    const pending = new Set(
      planetRepository
        .getAll()
        .filter((config) => config.parentBodyId !== undefined)
        .map((config) => config.id),
    );
    while (pending.size > 0) {
      const created: string[] = [];
      for (const id of pending) {
        const config = planetRepository.getById(id);
        const parentId = config?.parentBodyId;
        if (!config || !parentId) {
          continue;
        }
        const parentRuntime = manager.getPlanet(parentId);
        if (!parentRuntime) {
          // 父级本轮未就绪（父级自身是更深层卫星），留待下一轮。
          continue;
        }
        await satelliteManager.createSatellite(config, parentRuntime);
        tracker.itemLoaded();
        this.syncLoadingProgress();
        created.push(id);
      }
      if (created.length === 0) {
        throw new Error('存在无法解析父级天体的配置（parentBodyId 无效或存在循环依赖）。');
      }
      created.forEach((id) => pending.delete(id));
    }

    this.planetManager = manager;
    this.satelliteManager = satelliteManager;
  }

  private createOrbits(parent: Object3D, context: SceneContext): void {
    const manager = new OrbitManager(parent, context.resources, this.sceneName);

    for (const config of planetRepository.getAll()) {
      // 明确行为：star 与 orbit.enabled === false 的天体不创建轨道。
      if (config.type === 'star' || !config.orbit.enabled) {
        continue;
      }

      // 轨道中心：卫星轨道（centerBodyId 非 'sun'）挂到中心天体 bodyRoot，
      // 轨道线随主星移动；绕太阳的轨道保持挂 SolarSystemRoot（原点、水平轨道面）。
      let centerObject: Object3D | undefined;
      const centerId = config.orbit.centerBodyId;
      if (centerId && centerId !== 'sun') {
        centerObject = this.planetManager?.getPlanet(centerId)?.bodyRoot;
      }
      manager.createOrbit(config, centerObject);
    }

    this.orbitManager = manager;
  }

  /** 为配置了 ring 的天体创建程序化环（当前为土星）。 */
  private createRings(context: SceneContext): void {
    const manager = new RingManager(context.resources, this.sceneName);

    for (const config of planetRepository.getAll()) {
      if (!config.ring) {
        continue;
      }
      const runtime = this.planetManager?.getPlanet(config.id);
      if (!runtime) {
        throw new Error(`PlanetManager 中找不到天体 ${config.id}，无法创建环。`);
      }
      manager.createRing(runtime, config.ring);
    }

    this.ringManager = manager;
  }

  /** 创建太阳光晕（挂 SolarSystemRoot，不随太阳自转）。 */
  private createSunGlow(context: SceneContext): void {
    if (!this.solarSystemRoot) {
      throw new Error('SolarSystemRoot 未创建，无法创建太阳光晕。');
    }
    const effect = new SunGlowEffect(this.solarSystemRoot, context.resources, this.sceneName);
    effect.show();
    this.sunGlowEffect = effect;
  }

  /** 创建地球云层（挂 EarthBodyRoot，独立于地表自转）。 */
  private createEarthCloud(context: SceneContext): void {
    const earth = this.planetManager?.getPlanet('earth');
    if (!earth) {
      throw new Error('PlanetManager 中找不到 earth，无法创建云层。');
    }
    const effect = new EarthCloudEffect(earth.bodyRoot, context.resources, this.sceneName);
    effect.create();
    this.earthCloudEffect = effect;
  }

  /** 创建星空背景（挂 scene，与 SolarSystemRoot 同级；固定种子，不参与拾取）。 */
  private createStarField(context: SceneContext): void {
    const starField = new BackgroundStarField(context.resources, this.sceneName);
    this.scene.add(starField.points);
    this.starField = starField;
  }

  /** 创建真实恒星层（Sprite 每星，Phase 2.19；可拾取：统一 targetType/targetId 约定）。 */
  private createStarCatalog(context: SceneContext): void {
    const manager = new StarCatalogManager(
      starRepository.getAll(),
      context.resources,
      this.sceneName,
    );
    this.scene.add(manager.root);
    this.starCatalogManager = manager;
  }

  /** 创建星座连线（挂 scene；不可交互；端点与恒星层同一坐标映射）。 */
  private createConstellation(context: SceneContext): void {
    const manager = new ConstellationManager(
      starRepository.getConstellations(),
      (starId) => starRepository.getById(starId),
      context.resources,
      this.sceneName,
    );
    this.scene.add(manager.lines);
    this.constellationManager = manager;
  }

  /** 创建深空观察模式控制器（组合 CameraController；锚点挂 scene）。 */
  private createObservation(): void {
    if (!this.cameraController) {
      throw new Error('CameraController 未创建，无法创建观察模式控制器。');
    }
    const controller = new ObservationController(this.cameraController);
    this.scene.add(controller.stellarAnchor, controller.constellationAnchor);
    this.observationController = controller;
  }

  /** 创建望远镜视场控制器（Phase 2.21；组合 CameraController + TelescopeEngine）。 */
  private createTelescope(): void {
    if (!this.cameraController) {
      throw new Error('CameraController 未创建，无法创建望远镜控制器。');
    }
    const engine = new TelescopeEngine(ENTRY_TELESCOPE);
    this.telescopeViewController = new TelescopeViewController(this.camera, engine);
  }

  /** 创建深空天体管理器（Phase 2.21；Sprite 每深空天体，资源登记到 'solar' 组）。 */
  /** 创建小行星带（Phase 2.23）：火星-木星环带粒子（不可点击）。 */
  private createAsteroidBelt(parent: Object3D, context: SceneContext): void {
    const manager = new AsteroidBeltManager(context.resources, this.sceneName);
    manager.create(parent, asteroidBeltConfig);
    this.asteroidBeltManager = manager;
  }

  /** 创建哈雷彗星（Phase 2.23）：椭圆轨道 + 彗核 + 彗尾（彗核可点击）。 */
  private createComets(parent: Object3D, context: SceneContext): void {
    const manager = new CometManager(context.resources, this.sceneName);
    manager.create(parent, halleyCometConfig);
    this.cometManager = manager;
  }

  private createDeepSky(context: SceneContext): void {
    const manager = new DeepSkyManager(deepSkyRepository.getAll(), context.resources, 'solar');
    this.scene.add(manager.root);
    this.deepSkyManager = manager;
  }

  /** 创建任务控制器（Phase 2.22；组合 CameraController + SpacecraftManager + TrajectoryRenderer）。 */
  private createMission(context: SceneContext): void {
    if (!this.cameraController) {
      throw new Error('CameraController 未创建，无法创建任务控制器。');
    }
    const spacecraftManager = new SpacecraftManager(context.resources, 'solar');
    const trajectoryRenderer = new TrajectoryRenderer(context.resources, 'solar');
    const controller = new MissionController(
      this.cameraController,
      spacecraftManager,
      trajectoryRenderer,
      (date) => {
        this.missionDateHandler?.(date);
      },
    );
    this.scene.add(spacecraftManager.root, trajectoryRenderer.root);
    this.missionController = controller;
  }

  /** 注册任务日期上报处理器（null 清除；Phase 2.22 Coordinator 注册）。 */
  setMissionDateHandler(handler: ((date: string) => void) | null): void {
    this.missionDateHandler = handler;
  }

  /**
   * 加载航天任务（Phase 2.22）：卸载旧任务（探测器/轨迹），加载新任务并创建探测器。
   * 未知任务 ID 安全忽略（返回 false）。
   */
  loadMission(missionId: string): boolean {
    const mission = missionRepository.getMissionById(missionId);
    return this.missionController?.loadMission(mission ?? null) ?? false;
  }

  /** 任务播放（Phase 2.22）。 */
  playMission(): void {
    this.missionController?.play();
  }

  /** 任务暂停（Phase 2.22）。 */
  pauseMission(): void {
    this.missionController?.pause();
  }

  /** 任务重置：回到发射日期与轨迹起点（Phase 2.22）。 */
  resetMission(): void {
    this.missionController?.reset();
  }

  /** 设置任务播放速度（Phase 2.22；[1, 10000] 钳制）。 */
  setMissionSpeed(speed: number): void {
    this.missionController?.setSpeed(speed);
  }

  /** 当前任务状态快照（Phase 2.22；数据可序列化）。 */
  getMissionState(): {
    missionId: string | null;
    missionDate: string;
    speed: number;
    paused: boolean;
  } | null {
    const controller = this.missionController;
    if (!controller) {
      return null;
    }
    return {
      missionId: controller.getCurrentMission()?.id ?? null,
      missionDate: controller.getMissionDate(),
      speed: controller.getSpeed(),
      paused: controller.isPaused(),
    };
  }

  /** 聚焦探测器（Phase 2.22）：相机过渡到探测器并跟随（MISSION_FOLLOW）。 */
  focusSpacecraft(spacecraftId: string): Promise<void> {
    return this.missionController?.focusSpacecraft(spacecraftId) ?? Promise.resolve();
  }

  /** 跟随探测器（Phase 2.22）：立即进入 MISSION_FOLLOW 跟随。 */
  followSpacecraft(spacecraftId: string): void {
    this.missionController?.followSpacecraft(spacecraftId);
  }

  /** 创建探索定位管理器（Phase 2.18；组合 CameraController / ObservationController）。 */
  private createExploration(): void {
    if (!this.cameraController || !this.observationController) {
      throw new Error('CameraController / ObservationController 未创建，无法创建探索管理器。');
    }
    const manager = new ExplorationManager(this.cameraController, this.observationController);
    this.scene.add(manager.starFocusAnchor);
    this.explorationManager = manager;
  }

  /** 懒创建加载跟踪器并注册模型失败回调（Phase 2.16；幂等）。 */
  private ensureLoadingTracker(): LoadingTracker {
    if (this.loadingTracker) {
      return this.loadingTracker;
    }
    const tracker = new LoadingTracker();
    // 模型加载失败：记录失败天体（去重）并同步进度（其他天体继续加载）。
    modelLoader.onModelError = (planetId, _error) => {
      tracker.itemFailed(planetId);
      this.syncLoadingProgress();
    };
    this.loadingTracker = tracker;
    return tracker;
  }

  /** 同步加载进度到上层（Coordinator → Store → UI；handler 为 null 时安全忽略）。 */
  private syncLoadingProgress(): void {
    const tracker = this.loadingTracker;
    if (!tracker) {
      return;
    }
    this.loadingProgressHandler?.(tracker.getState());
  }

  /** 注册加载进度上报处理器（null 清除；Phase 2.16 Coordinator 注册）。 */
  setLoadingProgressHandler(handler: ((state: LoadingProgressState) => void) | null): void {
    this.loadingProgressHandler = handler;
  }

  /**
   * 创建全部天体名称标签（挂 scene，不挂天体节点；
   * 名称来自配置 displayName ?? englishName，不参与拾取）。
   */
  private createPlanetLabels(context: SceneContext): void {
    const manager = new PlanetLabelManager(this.scene, context.resources, this.sceneName);
    this.planetManager
      ?.getAllPlanets()
      .forEach((runtime) => manager.createLabel(runtime));
    this.planetLabelManager = manager;
  }

  private createInteraction(context: SceneContext): void {
    const manager = new InteractionManager({
      camera: this.camera,
      domElement: context.renderer.domElement,
      onPlanetSelected: (planetId) => {
        // 没有注册上层 handler 时点击安全无副作用。
        this.planetSelectedHandler?.(planetId);
      },
      // 恒星拾取（Phase 2.17）：命中星点顶点时上报 starId。
      onStarSelected: (starId) => {
        this.starSelectedHandler?.(starId);
      },
      // 小天体拾取（Phase 2.23）：命中彗核时上报 objectId。
      onSolarObjectSelected: (objectId) => {
        this.solarObjectSelectedHandler?.(objectId);
      },
      // 统一目标选择（Phase 2.18）：旧回调保留兼容，新回调走统一选择链。
      onTargetSelected: (target) => {
        this.targetSelectedHandler?.(target);
      },
      // 目标类型解析：卫星 → moon，其余太阳系天体 → planet（恒星独立上报）。
      resolveTargetType: (planetId) => {
        const config = this.planetManager?.getPlanet(planetId)?.config;
        return config?.type === 'natural-satellite' ? 'moon' : 'planet';
      },
      // 点击未命中任何可选天体（空白/太阳/轨道/高亮）时上报，用于取消选择。
      onEmptySelected: () => {
        this.planetEmptySelectedHandler?.();
      },
      // OrbitControls 负责拖动期间的 Pointer Capture，InteractionManager 只观察点击。
      usePointerCapture: false,
    });

    // Raycaster 只检测 PlanetManager 注册的天体对象（太阳、轨道、辅助对象天然排除）。
    manager.setSelectableObjects(this.planetManager?.getSelectableObjects() ?? []);
    // 小天体拾取（Phase 2.23）：哈雷彗星彗核（小行星带不可点击，不注册）。
    const cometNucleus = this.cometManager?.getNucleus();
    manager.setSolarObjectSelectableObjects(cometNucleus ? [cometNucleus] : []);
    // 恒星拾取独立通道（Phase 2.17 / 2.19）：Sprite 每星（统一 targetType/targetId 约定）。
    manager.setStarSelectableObjects(
      this.starCatalogManager ? Array.from(this.starCatalogManager.stars.values()) : [],
    );
    // 深空天体拾取（Phase 2.21）：Sprite 每深空天体（统一 targetType/targetId 约定）。
    manager.setDeepSkySelectableObjects(
      this.deepSkyManager ? Array.from(this.deepSkyManager.objects.values()) : [],
    );
    // 探测器拾取（Phase 2.22）：Sprite 每探测器（轨迹线不可点击）。
    const mission = this.missionController;
    manager.setSpacecraftSelectableObjects(
      mission ? Array.from(mission.getSpacecraftObjects()) : [],
    );
    this.interactionManager = manager;
  }

  /**
   * 注册相机模式变化处理器（null 清除）。
   * 上层（Phase 2.9 ApplicationCoordinator）通过该接口将模式同步到 Store。
   */
  setCameraModeHandler(handler: ((mode: CameraMode) => void) | null): void {
    this.cameraModeHandler = handler;
  }

  private createCameraController(context: SceneContext): void {
    this.cameraController = new CameraController({
      camera: this.camera,
      domElement: context.renderer.domElement,
      defaultPosition: DEFAULT_CAMERA_POSITION,
      defaultTarget: DEFAULT_CAMERA_TARGET,
      onModeChanged: (mode) => {
        // 只上报普通字符串模式，不传递 Camera / Controls 对象。
        this.cameraModeHandler?.(mode);
      },
    });
  }

  private createHighlightEffect(context: SceneContext): void {
    // 高亮 Mesh 直接挂到 scene 根节点：世界坐标/世界四元数可直接使用，
    // 不继承天体局部旋转；资源登记到 'solar' 组由 ResourceManager 统一释放。
    this.highlightEffect = new HighlightEffect({
      parent: this.scene,
      resources: context.resources,
      resourceGroup: this.sceneName,
    });
  }
}
