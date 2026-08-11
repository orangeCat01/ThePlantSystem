/**
 * 望远镜领域模型（Phase 2.21）。
 *
 * 纯数据层：全 readonly；禁止依赖 Three.js / Vue / Pinia。
 */

/** 望远镜配置。 */
export interface TelescopeConfig {
  /** 物镜口径（毫米）。 */
  readonly apertureMm: number;
  /** 焦距（毫米）。 */
  readonly focalLengthMm: number;
  /** 标称放大倍率（倍）。 */
  readonly magnification: number;
  /** 标称视场角（度，1× 基准）。 */
  readonly fieldOfViewDeg: number;
  /** 极限星等（裸镜理论值）。 */
  readonly limitingMagnitude: number;
}
