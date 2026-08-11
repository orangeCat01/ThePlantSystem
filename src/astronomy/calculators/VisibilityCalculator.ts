/**
 * 恒星可见性计算器（Phase 2.20）。
 *
 * 规则：
 * - 高度角 > 0 → visible。
 * - 最佳观测等级：
 *   alt > 60 → 'excellent'（接近天顶）
 *   30 ~ 60 → 'good'
 *   0 ~ 30 → 'low'
 *
 * 纯函数模块：禁止依赖 Three.js / Vue / Pinia。
 */

/** 可见性阈值（度）：高度角大于该值视为可见。 */
export const VISIBILITY_ALTITUDE_THRESHOLD = 0;

/** 最佳观测等级。 */
export type VisibilityQuality = 'excellent' | 'good' | 'low';

/** 高度角 → 是否可见（高度角 > 0）。 */
export function isVisible(altitude: number): boolean {
  return Number.isFinite(altitude) && altitude > VISIBILITY_ALTITUDE_THRESHOLD;
}

/** 高度角 → 最佳观测等级；不可见返回 null。 */
export function visibilityQuality(altitude: number): VisibilityQuality | null {
  if (!isVisible(altitude)) {
    return null;
  }
  if (altitude > 60) {
    return 'excellent';
  }
  if (altitude >= 30) {
    return 'good';
  }
  return 'low';
}

/** 可见性结果（写回目标对象，避免创建新对象）。 */
export interface VisibilityResult {
  visible: boolean;
  quality: VisibilityQuality | null;
}

/** 计算高度角对应的可见性（写入 target，返回 target 便于链式）。 */
export function calculateVisibility(altitude: number, target: VisibilityResult): VisibilityResult {
  target.visible = isVisible(altitude);
  target.quality = visibilityQuality(altitude);
  return target;
}
