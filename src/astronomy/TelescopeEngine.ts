import type { TelescopeConfig } from './telescope.types';

/** 倍率有效区间。 */
export const TELESCOPE_ZOOM_MIN = 1;
export const TELESCOPE_ZOOM_MAX = 128;
/** 极限星等钳制区间。 */
const LIMITING_MAGNITUDE_MIN = 4;
const LIMITING_MAGNITUDE_MAX = 16;

/**
 * 望远镜引擎（Phase 2.21）。
 *
 * 纯数学模块：根据望远镜配置与倍率计算视场角 / 极限星等 / 可见星等范围。
 * 禁止依赖 Three.js / Vue / Pinia。
 */
export class TelescopeEngine {
  private config: TelescopeConfig;
  private zoom = 1;

  constructor(config: TelescopeConfig) {
    this.config = config;
  }

  /** 切换望远镜配置（非法输入安全忽略）。 */
  setConfig(config: TelescopeConfig | null): boolean {
    if (!config || !Number.isFinite(config.apertureMm) || config.apertureMm <= 0) {
      return false;
    }
    this.config = config;
    return true;
  }

  /** 设置倍率（[1, 128]；非法忽略）。 */
  setZoom(zoom: number): boolean {
    if (!Number.isFinite(zoom)) {
      return false;
    }
    this.zoom = Math.min(Math.max(zoom, TELESCOPE_ZOOM_MIN), TELESCOPE_ZOOM_MAX);
    return true;
  }

  /** 当前倍率。 */
  getZoom(): number {
    return this.zoom;
  }

  /** 当前视场角（度）：标称视场 / 倍率。 */
  getFieldOfView(): number {
    return this.config.fieldOfViewDeg / this.zoom;
  }

  /** 当前极限星等：理论值 + 倍率增益（2.5·log10(zoom)），钳制到 [4, 16]。 */
  getLimitingMagnitude(): number {
    const gain = this.zoom > 1 ? 2.5 * Math.log10(this.zoom) : 0;
    const limiting = this.config.limitingMagnitude + gain;
    return Math.min(Math.max(limiting, LIMITING_MAGNITUDE_MIN), LIMITING_MAGNITUDE_MAX);
  }

  /** 目标星等是否在当前可见范围内（<= 极限星等）。 */
  calculateVisibleMagnitude(magnitude: number): boolean {
    return Number.isFinite(magnitude) && magnitude <= this.getLimitingMagnitude();
  }

  /** 当前可见星等范围（[裸眼下限, 极限星等]；本阶段下限固定为 -2）。 */
  getVisibleMagnitudeRange(): { min: number; max: number } {
    return { min: -2, max: this.getLimitingMagnitude() };
  }
}
