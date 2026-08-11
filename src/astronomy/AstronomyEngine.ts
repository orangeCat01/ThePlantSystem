import type { SimulationTimeState } from './astronomy.types';
import {
  calculateMoonPhase,
  type MoonPhaseData,
  type MutableMoonPhaseData,
} from './calculators/MoonPhaseCalculator';
import {
  calculateSolarPosition,
  type MutableSolarPositionData,
  type SolarPositionData,
} from './calculators/SolarPositionCalculator';

/**
 * 天文计算引擎（Phase 2.15）。
 *
 * 职责：统一天文计算入口——基于 SimulationTimeState 计算月相与太阳位置。
 *
 * 设计约束：
 * - 本阶段计算结果不直接控制轨道 / 光照（仅提供数据基础）。
 * - update 每帧由 SolarScene 调用（唯一 AnimationManager RAF 驱动）。
 * - 内部持有复用状态对象，每帧写回（不创建新对象，满足性能约束）。
 * - 禁止依赖 Vue / Pinia / Three.js；不使用 Date.now()。
 */
export class AstronomyEngine {
  private readonly moonPhase: MutableMoonPhaseData = {
    illumination: 0,
    phaseName: '新月',
    age: 0,
  };

  private readonly solarPosition: MutableSolarPositionData = {
    longitude: 0,
    latitude: 0,
    distance: 1,
  };

  /**
   * 根据模拟时间更新天文计算状态（每帧调用；非法输入安全保留旧值）。
   */
  update(simulationTime: SimulationTimeState): void {
    if (!simulationTime || !Number.isFinite(simulationTime.julianDay)) {
      return;
    }

    calculateMoonPhase(simulationTime.julianDay, this.moonPhase);
    calculateSolarPosition(simulationTime.julianDay, this.solarPosition);
  }

  /** 当前月相（只读视图；调用方不得修改返回对象）。 */
  getMoonPhase(): MoonPhaseData {
    return this.moonPhase;
  }

  /** 当前太阳位置（只读视图；调用方不得修改返回对象）。 */
  getSolarPosition(): SolarPositionData {
    return this.solarPosition;
  }
}
