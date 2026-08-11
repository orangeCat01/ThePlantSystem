import { useUniverseStore } from '@/stores/universe.store';
import { DEFAULT_OVERLAY_PANELS } from '@/stores/universe.store';

/**
 * Overlay 卡片键（Phase 2.20；固定字符串，与 Store.overlayPanels 对齐）。
 */
export const OVERLAY_PANEL_KEYS = {
  simulation: 'simulation',
  time: 'time',
  observation: 'observation',
  mode: 'mode',
  search: 'search',
  mission: 'mission',
  telescope: 'telescope',
  planetInfo: 'planetInfo',
} as const;

export type OverlayPanelKey = (typeof OVERLAY_PANEL_KEYS)[keyof typeof OVERLAY_PANEL_KEYS];

/** 太阳系场景预设（默认展开控制/时间/观测/模式/搜索）。 */
const SOLAR_PRESET: Readonly<Record<string, boolean>> = {
  ...DEFAULT_OVERLAY_PANELS,
};

/** 银河系场景预设：关闭太阳系相关卡片（时间/模拟/观测/模式/任务/望远镜），保留搜索。 */
const GALAXY_PRESET: Readonly<Record<string, boolean>> = {
  ...DEFAULT_OVERLAY_PANELS,
  simulation: false,
  time: false,
  observation: false,
  mode: false,
  mission: false,
  telescope: false,
  search: true,
};

/**
 * Overlay 管理器（Phase 2.20）。
 *
 * 职责：管理全屏 UI 卡片（Overlay Card）的显示状态。
 * - 不控制 Three.js（不触 Scene / Camera / Renderer）。
 * - 状态只保存在 Store（可序列化 boolean），本类为 UI 与 Store 之间的封装层。
 * - 场景切换时按预设批量重置（Coordinator.switchScene 调用）。
 */
export class OverlayManager {
  /** 当前卡片是否可见（未知 key 返回 false）。 */
  isVisible(key: string): boolean {
    return useUniverseStore().overlayPanels[key] === true;
  }

  /** 设置卡片显隐。 */
  setVisible(key: string, visible: boolean): void {
    useUniverseStore().setOverlayPanel(key, visible);
  }

  /** 切换卡片显隐。 */
  toggle(key: string): void {
    useUniverseStore().toggleOverlayPanel(key);
  }

  /** 恢复默认（太阳系预设）。 */
  resetDefault(): void {
    useUniverseStore().resetOverlayPanels({ ...SOLAR_PRESET });
  }

  /** 应用场景预设（Phase 2.20：Solar → 默认；Galaxy → 关闭太阳系卡片）。 */
  applyScenePreset(sceneName: 'solar' | 'galaxy'): void {
    const preset = sceneName === 'galaxy' ? GALAXY_PRESET : SOLAR_PRESET;
    useUniverseStore().resetOverlayPanels({ ...preset });
  }
}

/** 全局 Overlay 管理器单例（纯状态管理，无 Three / Vue 依赖之外副作用）。 */
export const overlayManager = new OverlayManager();
