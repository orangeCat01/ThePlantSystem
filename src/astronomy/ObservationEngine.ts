import type { SimulationTimeState } from './astronomy.types';
import type { ObserverLocation } from './location.types';
import { createObserverLocation, isValidLatitude, isValidLongitude } from './location.types';
import type { TargetVisibility } from './observation.types';
import {
  calculateHorizontalCoordinate,
  calculateLocalSiderealTime,
  type MutableHorizontalCoordinate,
} from './calculators/HorizontalCoordinateCalculator';
import {
  calculateVisibility,
  type VisibilityResult,
} from './calculators/VisibilityCalculator';
import { starRepository } from '@/repositories/StarRepository';

/** 默认观测地点（未设置时使用：北京，东八区演示友好）。 */
const DEFAULT_LOCATION: ObserverLocation = {
  latitude: 39.9,
  longitude: 116.4,
  name: '北京',
};

/** 内部可变恒星可见性状态（每帧写回复用，禁止创建新对象）。 */
type MutableTargetVisibility = {
  starId: string;
  altitude: number;
  azimuth: number;
  visible: boolean;
  quality: 'excellent' | 'good' | 'low' | null;
};

/**
 * 天文观测引擎（Phase 2.20）。
 *
 * 职责：统一管理观测地点、本地恒星时、恒星可见性与地平坐标计算。
 * - 时间链路：模拟时间（AstronomyClock.julianDay + 时刻偏移）→ JD →
 *   本地恒星时（LST）→ 可见性计算。
 * - 不使用 Date.now() / 真实系统时间。
 * - update 每帧由 SolarScene 调用；内部状态对象复用（每帧不创建新对象）。
 * - 禁止依赖 Vue / Pinia / Three.js（仅依赖数据层 StarRepository 与纯函数计算器）。
 */
export class ObservationEngine {
  private location: ObserverLocation = DEFAULT_LOCATION;
  /** 用户设定的观测时刻偏移（小时，0~24；按地点当地时区解释）。 */
  private timeOfDayOffsetHours = 0;
  /** 观测地点时区偏移（小时，UTC+8 = 8；默认北京/东八区）。 */
  private timezoneOffsetHours = 8;
  private localSiderealTime = 0;
  private readonly horizontal: MutableHorizontalCoordinate = { altitude: 0, azimuth: 0 };
  private readonly visibility: VisibilityResult = { visible: false, quality: null };
  private readonly starVisibilities = new Map<string, MutableTargetVisibility>();
  /** 可见性标记 Map（update 写回复用；标签隐藏读取，不创建新对象）。 */
  private readonly visibilityMap = new Map<string, boolean>();

  constructor() {
    // 预创建全部恒星的可见性状态条目（每帧写回，不创建对象）。
    for (const star of starRepository.getAll()) {
      this.starVisibilities.set(star.id, {
        starId: star.id,
        altitude: 0,
        azimuth: 0,
        visible: false,
        quality: null,
      });
    }
  }

  /** 设置观测地点；非法输入安全忽略（保持原值）。 */
  setLocation(latitude: number, longitude: number, name: string, elevation?: number): boolean {
    const location = createObserverLocation(latitude, longitude, name, elevation);
    if (!location) {
      return false;
    }
    this.location = location;
    return true;
  }

  /** 当前观测地点。 */
  getLocation(): ObserverLocation {
    return this.location;
  }

  /** 设置观测时刻偏移（小时，[0, 24)；非法忽略）。 */
  setTimeOfDay(hours: number): void {
    if (Number.isFinite(hours) && hours >= 0 && hours < 24) {
      this.timeOfDayOffsetHours = hours;
    }
  }

  /** 设置观测地点时区偏移（小时，UTC+8 = 8；非法忽略）。 */
  setTimezone(hours: number): void {
    if (Number.isFinite(hours) && hours >= -12 && hours <= 14) {
      this.timezoneOffsetHours = hours;
    }
  }

  /** 当前时区偏移（小时）。 */
  getTimezone(): number {
    return this.timezoneOffsetHours;
  }

  /** 当前本地恒星时（度，[0, 360)）。 */
  getLocalSiderealTime(): number {
    return this.localSiderealTime;
  }

  /**
   * 每帧更新：根据模拟时间（JD + 时刻偏移）计算 LST 与全部恒星可见性。
   * 非法输入安全保留旧值。
   */
  update(simulationTime: SimulationTimeState): void {
    if (!simulationTime || !Number.isFinite(simulationTime.julianDay)) {
      return;
    }

    // 观测时刻按地点当地时区换算为 UT 偏移后叠加到 JD（0h UT 基准）。
    const utOffsetHours = this.timeOfDayOffsetHours - this.timezoneOffsetHours;
    const effectiveJulianDay = simulationTime.julianDay + utOffsetHours / 24;
    this.localSiderealTime = calculateLocalSiderealTime(
      effectiveJulianDay,
      this.location.longitude,
    );
    if (!Number.isFinite(this.localSiderealTime)) {
      return;
    }

    this.starVisibilities.forEach((target) => {
      const star = starRepository.getById(target.starId);
      if (!star) {
        return;
      }
      if (
        !calculateHorizontalCoordinate(
          star.position.rightAscension,
          star.position.declination,
          this.location.latitude,
          this.localSiderealTime,
          this.horizontal,
        )
      ) {
        return;
      }
      target.altitude = this.horizontal.altitude;
      target.azimuth = this.horizontal.azimuth;
      calculateVisibility(this.horizontal.altitude, this.visibility);
      target.visible = this.visibility.visible;
      target.quality = this.visibility.quality;
      this.visibilityMap.set(target.starId, this.visibility.visible);
    });
  }

  /** 全部可见目标（按高度角降序；调用频率低，事件级构建数组）。 */
  getVisibleTargets(): readonly TargetVisibility[] {
    const visible: TargetVisibility[] = [];
    this.starVisibilities.forEach((target) => {
      if (target.visible) {
        visible.push({
          starId: target.starId,
          altitude: target.altitude,
          azimuth: target.azimuth,
          visible: true,
          quality: target.quality,
        });
      }
    });
    return visible.sort((a, b) => b.altitude - a.altitude);
  }

  /** 恒星 ID → 可见性（每帧结果；未知 ID 返回 null）。 */
  getStarVisibility(starId: string): TargetVisibility | null {
    const entry = this.starVisibilities.get(starId);
    if (!entry) {
      return null;
    }
    return {
      starId: entry.starId,
      altitude: entry.altitude,
      azimuth: entry.azimuth,
      visible: entry.visible,
      quality: entry.quality,
    };
  }

  /** 全部恒星的可见性标记（复用内部 Map，只读视图；标签隐藏用）。 */
  getVisibilityMap(): ReadonlyMap<string, boolean> {
    return this.visibilityMap;
  }
}

export { isValidLatitude, isValidLongitude };
