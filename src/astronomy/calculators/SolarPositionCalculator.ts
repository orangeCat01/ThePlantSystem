/**
 * 太阳位置计算器（Phase 2.15）。
 *
 * 计算太阳在黄道坐标中的位置（几何平黄经 + 主要摄动项）与日地距离。
 * 简化天文算法（Meeus 低精度式）：
 * - n = JD - 2451545.0（J2000 起算天数）。
 * - L = 280.46 + 0.9856474 × n（太阳平均黄经）。
 * - g = 357.528 + 0.9856003 × n（平近点角）。
 *
 * 用途：为未来光照方向、昼夜变化、地球光照增强提供数据基础。
 * 本阶段只计算数据，不修改 Light。
 *
 * 纯函数模块：禁止依赖 Vue / Pinia / Three.js；不使用 Date.now()。
 */

/** 太阳位置数据。 */
export interface SolarPositionData {
  /** 太阳黄经（度，0~360，归一化）。 */
  readonly longitude: number;
  /** 太阳黄纬（度；本简化算法恒为 0）。 */
  readonly latitude: number;
  /** 日地距离（天文单位 AU）。 */
  readonly distance: number;
}

/** 内部可变太阳位置状态（计算写回目标；只读视图为 SolarPositionData）。 */
export type MutableSolarPositionData = {
  longitude: number;
  latitude: number;
  distance: number;
};

/** J2000.0 纪元儒略日。 */
const J2000_JD = 2451545.0;
/** 角度转弧度。 */
const DEG_TO_RAD = Math.PI / 180;

/** 归一化角度到 [0, 360)。 */
function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/**
 * 计算太阳黄道位置（复用入参对象写回，避免创建新对象）。
 * 非法 JD 返回 false（结果对象保持原值，调用方安全处理）。
 */
export function calculateSolarPosition(
  julianDay: number,
  target: MutableSolarPositionData,
): boolean {
  if (!Number.isFinite(julianDay)) {
    return false;
  }

  const daysSinceJ2000 = julianDay - J2000_JD;

  const meanLongitude = 280.46 + 0.9856474 * daysSinceJ2000;
  const meanAnomaly = 357.528 + 0.9856003 * daysSinceJ2000;

  // 主要摄动项（黄经方程中心差）。
  const anomalyRad = meanAnomaly * DEG_TO_RAD;
  const longitude =
    meanLongitude + 1.915 * Math.sin(anomalyRad) + 0.02 * Math.sin(2 * anomalyRad);

  // 日地距离（AU，含轨道偏心率影响）。
  const distance =
    1.00014 - 0.01671 * Math.cos(anomalyRad) - 0.00014 * Math.cos(2 * anomalyRad);

  target.longitude = normalizeDegrees(longitude);
  target.latitude = 0;
  target.distance = distance;
  return true;
}
