import type { CameraMode, ObservationMode, QualityLevel, SceneName, SerializableError } from '@/types/common.types';
import type { ExplorationTargetType } from '@/types/exploration.types';
import type { ObserverLocation } from '@/astronomy/location.types';
import { defineStore } from 'pinia';
import { DEFAULT_TELESCOPE_ID } from '@/data/telescope/telescopes';
import { TELESCOPE_ZOOM_MAX, TELESCOPE_ZOOM_MIN } from '@/astronomy/TelescopeEngine';
import { planetRepository } from '@/repositories/PlanetRepository';

/** 探索历史最大条数（Phase 2.18）。 */
const RECENT_TARGETS_LIMIT = 20;

/** Overlay 卡片默认显隐（Phase 2.20 / 2.20.2；只存 boolean）。 */
export const DEFAULT_OVERLAY_PANELS: Readonly<Record<string, boolean>> = {
  // Phase 2.20.2：所有控制面板默认收起（沉浸式探索，用户点击后展开）。
  simulation: false,
  time: false,
  observation: false,
  mode: false,
  search: false,
  mission: false,
  telescope: false,
  // Phase 2.21：天体信息分组（选中天体时抽屉动态出现）。
  planetInfo: true,
};

/** 预设模拟速度档位（Phase 2.13.1）：0 停止、0.1 慢速、1 正常、5 加速、20 高速。 */
export const SIMULATION_SPEED_OPTIONS: readonly number[] = [0, 0.1, 1, 5, 20];

/** 模拟日期格式校验（YYYY-MM-DD，Phase 2.14.3）。 */
const SIMULATION_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 观测日期时间格式校验（YYYY-MM-DDTHH:mm，Phase 2.20）。 */
const OBSERVER_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/**
 * 校验观测日期时间（YYYY-MM-DDTHH:mm）：日期必须真实存在，时刻在 [00:00, 23:59]。
 * 非法返回 false（调用方安全忽略）。
 */
function isValidObserverDateTime(dateTime: string): boolean {
  if (!OBSERVER_DATETIME_PATTERN.test(dateTime)) {
    return false;
  }
  const parts = dateTime.split('T');
  const datePart = parts[0] ?? '';
  const timePart = parts[1] ?? '';
  if (!isValidSimulationDate(datePart)) {
    return false;
  }
  const timeParts = timePart.split(':');
  const hours = Number(timeParts[0]);
  const minutes = Number(timeParts[1]);
  return (
    Number.isFinite(hours) &&
    Number.isFinite(minutes) &&
    hours >= 0 &&
    hours < 24 &&
    minutes >= 0 &&
    minutes < 60
  );
}

/**
 * 校验模拟日期字符串：必须为 YYYY-MM-DD 且是真实存在的日期。
 * 非法返回 false（调用方安全忽略，不抛错）。
 */
export function isValidSimulationDate(date: string): boolean {
  if (!SIMULATION_DATE_PATTERN.test(date)) {
    return false;
  }
  const parts = date.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return false;
  }
  if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  // 用 Date 构造反向校验（2026-02-30 会溢出到 3 月，需逐项比对）。
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

interface UniverseState {
  currentScene: SceneName;
  selectedPlanetId: string | null;
  /** 当前选中的太阳系小天体 ID（Phase 2.23；哈雷彗星等；只保存可序列化 id）。 */
  selectedSolarObjectId: string | null;
  /** 当前选中的恒星 ID（Phase 2.17；只保存可序列化 id，禁止保存 Three.js 对象）。 */
  selectedStarId: string | null;
  /** 统一探索目标 ID（Phase 2.18；与 selectedPlanetId / selectedStarId 并存兼容）。 */
  selectedTargetId: string | null;
  /** 统一探索目标类型（Phase 2.18 / 2.21）。 */
  selectedTargetType: ExplorationTargetType | null;
  /** 望远镜模式开关（Phase 2.21）。 */
  telescopeEnabled: boolean;
  /** 当前望远镜配置 ID（Phase 2.21）。 */
  telescopeConfigId: string;
  /** 当前望远镜倍率（Phase 2.21；1~128）。 */
  telescopeZoom: number;
  /** 当前航天任务 ID（Phase 2.22；只保存 id）。 */
  selectedMissionId: string | null;
  /** 任务播放状态（Phase 2.22）。 */
  missionPlaying: boolean;
  /** 任务播放速度倍率（Phase 2.22；1 / 10 / 100 / 1000）。 */
  missionSpeed: number;
  /** 当前任务日期（Phase 2.22；MissionClock 推进，经回调上报，可序列化）。 */
  missionDate: string;
  /** 收藏目标 ID 列表（Phase 2.18；只保存 id）。 */
  favoriteTargets: string[];
  /** 最近观察目标 ID 列表（Phase 2.18；最多 20 条，去重置顶，不持久化）。 */
  recentTargets: string[];
  /** 观测地点（Phase 2.20；null 表示未设置，使用默认地点）。 */
  observerLocation: ObserverLocation | null;
  /** 观测日期时间（Phase 2.20；格式 'YYYY-MM-DDTHH:mm'，设定快照）。 */
  observerDateTime: string;
  /** 仅显示可见目标（Phase 2.20；true 时隐藏地平线以下恒星标签）。 */
  visibleOnly: boolean;
  /** 深空观察模式（Phase 2.17）。 */
  starObservationMode: ObservationMode;
  /** 当前选中天体的中文名称（可序列化；禁止保存 Three.js 对象）。 */
  selectedPlanetName: string | null;
  cameraMode: CameraMode;
  panelVisible: boolean;
  loading: boolean;
  loadingProgress: number;
  loadingMessage: string;
  /** 已完成（含降级）天体数（Phase 2.16）。 */
  loadingLoaded: number;
  /** 总天体数（Phase 2.16）。 */
  loadingTotal: number;
  /** 加载失败天体 ID 列表（Phase 2.16；去重，可序列化）。 */
  loadingErrors: string[];
  /** 首次操作引导显示状态（Phase 2.16；禁止 localStorage）。 */
  showOperationGuide: boolean;
  /** 当前选中的银河对象 ID（Phase 2.18；只保存字符串；默认 null）。 */
  galaxySelectedId: string | null;
  /** 银河对象面板显示状态（Phase 2.18；默认 false）。 */
  galaxyPanelVisible: boolean;
  /** Overlay 卡片显隐（Phase 2.20；只存 boolean，key 为固定字符串）。 */
  overlayPanels: Record<string, boolean>;
  /** Phase 2.22：可完全隐藏的抽屉分组（太阳系「场景信息/模拟控制」；银河系本就隐藏）。 */
  hiddenDrawerSections: Record<string, boolean>;
  sceneSwitching: boolean;
  animationPaused: boolean;
  timeScale: number;
  /** 预设模拟速度档位（只读，UI 展示与校验使用）。 */
  simulationSpeedOptions: readonly number[];
  /** 天文事件计算/显示开关（Phase 2.16）。 */
  astronomyEventsEnabled: boolean;
  /** 当前展示中的天文事件 ID 列表（只保存可序列化 id，禁止保存 Three.js 对象）。 */
  visibleAstronomyEvents: string[];
  /** 天体标签显示开关（Phase 2.14.4）。 */
  showPlanetLabels: boolean;
  orbitVisible: boolean;
  qualityLevel: QualityLevel;
  error: SerializableError | null;
}

const clampProgress = (progress: number): number => Math.min(100, Math.max(0, progress));

export const useUniverseStore = defineStore('universe', {
  state: (): UniverseState => ({
    currentScene: 'solar',
    selectedPlanetId: null,
    selectedSolarObjectId: null,
    selectedStarId: null,
    selectedTargetId: null,
    selectedTargetType: null,
    telescopeEnabled: false,
    telescopeConfigId: DEFAULT_TELESCOPE_ID,
    telescopeZoom: 1,
    selectedMissionId: null,
    missionPlaying: false,
    missionSpeed: 10,
    missionDate: '—',
    favoriteTargets: [],
    recentTargets: [],
    observerLocation: null,
    observerDateTime: '2026-01-01T22:00',
    visibleOnly: false,
    starObservationMode: 'SOLAR_SYSTEM',
    selectedPlanetName: null,
    cameraMode: 'FREE',
    panelVisible: false,
    loading: false,
    loadingProgress: 0,
    loadingMessage: '',
    loadingLoaded: 0,
    loadingTotal: 0,
    loadingErrors: [],
    // Phase 2.21 五：教学面板默认隐藏，由底部「帮助」按钮展开。
    showOperationGuide: false,
    galaxySelectedId: null,
    galaxyPanelVisible: false,
    overlayPanels: DEFAULT_OVERLAY_PANELS,
    // 页面默认不显示场景信息/模拟控制（Canvas 为主体；左下角提供恢复入口）。
    hiddenDrawerSections: { observation: true, simulation: true },
    sceneSwitching: false,
    animationPaused: false,
    timeScale: 1,
    simulationSpeedOptions: SIMULATION_SPEED_OPTIONS,
    astronomyEventsEnabled: true,
    visibleAstronomyEvents: [],
    showPlanetLabels: false,
    orbitVisible: true,
    qualityLevel: 'MEDIUM',
    error: null,
  }),
  actions: {
    setCurrentScene(sceneName: SceneName): void {
      this.currentScene = sceneName;
    },
    /** 选择太阳系小天体（Phase 2.23：哈雷彗星等；未选中天体安全忽略）。 */
    selectSolarObject(objectId: string): void {
      this.selectedSolarObjectId = objectId;
    },
    /** 清除太阳系小天体选择（点击空白 / ESC / 清除统一目标）。 */
    clearSolarObject(): void {
      this.selectedSolarObjectId = null;
    },
    selectPlanet(planetId: string): void {
      this.selectedPlanetId = planetId;
      // 名称来自数据层（可序列化）；未知 ID 时为 null，由 UI 空状态兜底。
      this.selectedPlanetName = planetRepository.getById(planetId)?.name ?? null;
      this.panelVisible = true;
    },
    clearSelection(): void {
      this.selectedPlanetId = null;
      this.selectedPlanetName = null;
    },
    openPlanetPanel(): void {
      this.panelVisible = true;
    },
    closePlanetPanel(): void {
      this.panelVisible = false;
    },
    /**
     * 清除天体选择：清空选中 ID 并关闭信息面板。
     * 与 clearSelection（只清 ID）保持共存，供正式选择清除命令使用。
     */
    clearPlanetSelection(): void {
      this.selectedPlanetId = null;
      this.selectedPlanetName = null;
      this.panelVisible = false;
    },
    /** 选择恒星（Phase 2.17；与行星选择互斥）。 */
    selectStar(starId: string): void {
      this.selectedStarId = starId;
    },
    /** 开启望远镜模式（幂等）。 */
    enableTelescope(): void {
      this.telescopeEnabled = true;
    },
    /** 关闭望远镜模式（幂等；倍率保留，重新开启时沿用）。 */
    disableTelescope(): void {
      this.telescopeEnabled = false;
    },
    /** 切换望远镜配置（非法 id 安全忽略）。 */
    setTelescopeConfigId(configId: string): void {
      if (configId.length > 0) {
        this.telescopeConfigId = configId;
      }
    },
    /** 选择航天任务（Phase 2.22；只保存 id）。 */
    selectMission(missionId: string): void {
      this.selectedMissionId = missionId;
      this.missionPlaying = false;
    },
    /** 清除航天任务选择（Phase 2.22）。 */
    clearMission(): void {
      this.selectedMissionId = null;
      this.missionPlaying = false;
    },
    /** 设置任务播放速度（Phase 2.22；[1, 10000] 钳制，非法值安全忽略）。 */
    setMissionSpeed(speed: number): void {
      if (!Number.isFinite(speed)) {
        return;
      }
      this.missionSpeed = Math.min(Math.max(speed, 1), 10000);
    },
    /** 设置任务播放状态（Phase 2.22）。 */
    setMissionPlaying(playing: boolean): void {
      this.missionPlaying = playing;
    },
    /** 设置当前任务日期（Phase 2.22；MissionClock 回调上报，非法值安全忽略）。 */
    setMissionDate(date: string): void {
      if (typeof date === 'string' && date.length > 0) {
        this.missionDate = date;
      }
    },
    /** 设置倍率（Phase 2.21；钳制 [1, 128]，非法值安全忽略）。 */
    setTelescopeZoom(zoom: number): void {
      if (!Number.isFinite(zoom)) {
        return;
      }
      this.telescopeZoom = Math.min(Math.max(zoom, TELESCOPE_ZOOM_MIN), TELESCOPE_ZOOM_MAX);
    },
    /** 清除恒星选择（Phase 2.17）。 */
    clearStarSelection(): void {
      this.selectedStarId = null;
    },
    /**
     * 统一目标选择（Phase 2.18）：记录目标与最近观察（去重置顶，最多 20 条）。
     * 只保存 id 与类型（可序列化）。
     */
    selectTarget(targetId: string, type: ExplorationTargetType): void {
      this.selectedTargetId = targetId;
      this.selectedTargetType = type;
      this.addRecentTarget(targetId);
    },
    /** 清除统一目标选择（Phase 2.18；兼容清除行星/恒星选择字段）。 */
    clearTarget(): void {
      this.selectedSolarObjectId = null;
      this.selectedTargetId = null;
      this.selectedTargetType = null;
      this.selectedPlanetId = null;
      this.selectedPlanetName = null;
      this.selectedStarId = null;
    },
    /** 收藏目标（幂等；只保存 id）。 */
    addFavorite(targetId: string): void {
      if (!this.favoriteTargets.includes(targetId)) {
        this.favoriteTargets.push(targetId);
      }
    },
    /** 取消收藏（幂等）。 */
    removeFavorite(targetId: string): void {
      this.favoriteTargets = this.favoriteTargets.filter((id) => id !== targetId);
    },
    /** 记录最近观察（去重置顶，最多 RECENT_TARGETS_LIMIT 条；刷新页面不持久化）。 */
    addRecentTarget(targetId: string): void {
      const withoutDuplicate = this.recentTargets.filter((id) => id !== targetId);
      this.recentTargets = [targetId, ...withoutDuplicate].slice(0, RECENT_TARGETS_LIMIT);
    },
    /**
     * 设置观测地点（Phase 2.20）：只保存校验通过的地点（非法安全忽略）。
     */
    setObserverLocation(location: ObserverLocation | null): void {
      this.observerLocation = location;
    },
    /** 设置观测日期时间（Phase 2.20；格式 'YYYY-MM-DDTHH:mm'，非法安全忽略）。 */
    setObserverDateTime(dateTime: string): void {
      if (isValidObserverDateTime(dateTime)) {
        this.observerDateTime = dateTime;
      }
    },
    /** 设置仅显示可见目标开关（Phase 2.20）。 */
    setVisibleOnly(enabled: boolean): void {
      this.visibleOnly = enabled;
    },
    /** 设置深空观察模式（Phase 2.17）。 */
    setObservationMode(mode: ObservationMode): void {
      this.starObservationMode = mode;
    },
    setCameraMode(cameraMode: CameraMode): void {
      this.cameraMode = cameraMode;
    },
    setLoading(loading: boolean, message = ''): void {
      this.loading = loading;
      this.loadingMessage = message;
      if (loading) {
        // 新一批加载开始：重置计数与错误列表（Phase 2.16）。
        this.loadingLoaded = 0;
        this.loadingTotal = 0;
        this.loadingErrors = [];
        this.loadingProgress = 0;
      }
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
    /** 设置加载计数（Phase 2.16；非法值安全忽略）。 */
    setLoadingCounts(loaded: number, total: number): void {
      if (Number.isFinite(loaded) && loaded >= 0) {
        this.loadingLoaded = Math.floor(loaded);
      }
      if (Number.isFinite(total) && total >= 0) {
        this.loadingTotal = Math.floor(total);
      }
    },
    /** 记录加载失败天体（Phase 2.16；去重）。 */
    addLoadingError(planetId: string): void {
      if (planetId && !this.loadingErrors.includes(planetId)) {
        this.loadingErrors.push(planetId);
      }
    },
    /** 设置操作引导显示状态（Phase 2.16）。 */
    setShowOperationGuide(visible: boolean): void {
      this.showOperationGuide = visible;
    },
    /** 选择银河对象（Phase 2.18；只保存字符串 ID；默认选中银河本体）。 */
    selectGalaxyObject(objectId: string): void {
      if (objectId.length === 0) {
        return;
      }
      this.galaxySelectedId = objectId;
      this.galaxyPanelVisible = true;
    },
    /** 清除银河对象选择（Phase 2.18）。 */
    clearGalaxySelection(): void {
      this.galaxySelectedId = null;
      this.galaxyPanelVisible = false;
    },
    /** 设置 Overlay 卡片显隐（Phase 2.20；未知 key 安全忽略）。 */
    setOverlayPanel(key: string, visible: boolean): void {
      if (key.length === 0) {
        return;
      }
      this.overlayPanels = { ...this.overlayPanels, [key]: visible };
    },
    /** 切换 Overlay 卡片显隐（Phase 2.20）。 */
    toggleOverlayPanel(key: string): void {
      const current = this.overlayPanels[key];
      if (typeof current === 'boolean') {
        this.overlayPanels = { ...this.overlayPanels, [key]: !current };
      }
    },
    /** 设置抽屉分组完全隐藏（Phase 2.22；hidden=true 时分组从 Drawer 移除）。 */
    setDrawerSectionHidden(key: string, hidden: boolean): void {
      this.hiddenDrawerSections = { ...this.hiddenDrawerSections, [key]: hidden };
    },
    /** 批量重置 Overlay 卡片显隐（Phase 2.20；场景切换预设）。 */
    resetOverlayPanels(panels: Record<string, boolean>): void {
      this.overlayPanels = { ...panels };
    },
    setSceneSwitching(sceneSwitching: boolean): void {
      this.sceneSwitching = sceneSwitching;
    },
    setAnimationPaused(animationPaused: boolean): void {
      this.animationPaused = animationPaused;
    },
    /**
     * 设置时间倍率。非法值（NaN / Infinity / 负数）安全恢复为 1。
     */
    setTimeScale(timeScale: number): void {
      this.timeScale = Number.isFinite(timeScale) && timeScale >= 0 ? timeScale : 1;
    },
    /**
     * 设置预设模拟速度档位（Phase 2.13.1）。
     * 内部复用 setTimeScale（含 NaN / Infinity / 负数安全处理）。
     */
    setSimulationSpeed(speed: number): void {
      this.setTimeScale(speed);
    },
    /** 设置天文事件计算/显示开关（Phase 2.16）。 */
    setAstronomyEventsEnabled(enabled: boolean): void {
      this.astronomyEventsEnabled = enabled;
    },
    /** 同步当前展示的天文事件 ID 列表（Phase 2.16；只保存 id，禁止保存对象）。 */
    setVisibleAstronomyEvents(eventIds: readonly string[]): void {
      this.visibleAstronomyEvents = [...eventIds];
    },
    /** 设置天体标签显示开关（Phase 2.14.4）。 */
    setPlanetLabelsVisible(visible: boolean): void {
      this.showPlanetLabels = visible;
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
      this.selectedPlanetName = null;
      this.selectedStarId = null;
      this.selectedTargetId = null;
      this.selectedTargetType = null;
      this.telescopeEnabled = false;
      this.selectedMissionId = null;
      this.missionPlaying = false;
      this.galaxySelectedId = null;
      this.galaxyPanelVisible = false;
      this.starObservationMode = 'SOLAR_SYSTEM';
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

