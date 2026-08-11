import type { ObserverLocation } from './location.types';

/**
 * 观测状态模型（Phase 2.20）。
 *
 * 纯数据层：全 readonly；禁止依赖 Three.js / Vue / Pinia。
 */

/** 观测状态（地点 + 模拟日期时间 + 本地恒星时 + 时区）。 */
export interface ObservationState {
  /** 观测地点。 */
  readonly location: ObserverLocation;
  /** 模拟日期（YYYY-MM-DD，用户设定）。 */
  readonly simulationDate: string;
  /** 模拟时刻（HH:mm，用户设定；LST 由天文时钟 JD + 该时刻偏移计算）。 */
  readonly simulationTime: string;
  /** 本地恒星时（度，[0, 360)）。 */
  readonly localSiderealTime: number;
  /** 时区偏移（小时，UTC+8 = 8；本阶段固定为 0 的 UTC 约定由 JD 承担）。 */
  readonly timezone: number;
}

/** 恒星地平坐标与可见性（Phase 2.20 计算输出）。 */
export interface TargetVisibility {
  /** 恒星 ID。 */
  readonly starId: string;
  /** 高度角（度，[-90, 90]；> 0 可见）。 */
  readonly altitude: number;
  /** 方位角（度，[0, 360)，北起顺时针）。 */
  readonly azimuth: number;
  /** 是否可见（高度角 > 0）。 */
  readonly visible: boolean;
  /** 最佳观测等级（仅 visible 时有意义）。 */
  readonly quality: 'excellent' | 'good' | 'low' | null;
}
