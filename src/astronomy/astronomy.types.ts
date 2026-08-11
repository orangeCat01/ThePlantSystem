import type { MoonPhaseData } from './calculators/MoonPhaseCalculator';
import type { SolarPositionData } from './calculators/SolarPositionCalculator';

/**
 * 天文时间系统类型定义（Phase 2.15）。
 *
 * 本层为纯计算模块：
 * - 禁止依赖 Vue / Pinia / Store / Three.js。
 * - 禁止使用 Date.now() / 真实系统时间；一切基于模拟日期推进。
 * - 所有数据可序列化，可安全跨 UI / Three.js 边界传递。
 */

/** 模拟时间状态（AstronomyClock 的可序列化快照）。 */
export interface SimulationTimeState {
  /** 当前模拟日期（YYYY-MM-DD）。 */
  readonly date: string;
  /** 当前儒略日（JD，0h UT 约定，如 2026-01-01 → 2461041.5）。 */
  readonly julianDay: number;
  /** 时间倍率（>= 0；0 等同暂停推进）。 */
  readonly timeScale: number;
  /** 是否暂停（true 时时间不推进）。 */
  readonly paused: boolean;
}

/** 天文计算状态（AstronomyEngine 输出快照，供 UI 与未来轨道层消费）。 */
export interface AstronomyStateData {
  /** 当前模拟日期（YYYY-MM-DD）。 */
  readonly date: string;
  /** 当前儒略日。 */
  readonly julianDay: number;
  /** 时间倍率。 */
  readonly timeScale: number;
  /** 是否暂停。 */
  readonly paused: boolean;
  /** 月相数据。 */
  readonly moonPhase: MoonPhaseData;
  /** 太阳位置数据（本阶段仅计算，不修改 Light）。 */
  readonly solarPosition: SolarPositionData;
}
