/**
 * 行星日心黄经计算器（Phase 2.16，事件引擎用）。
 *
 * 简化算法：J2000 平均轨道根数（平黄经 L0 + 每日运动 n），
 * L = L0 + n × (JD - 2451545.0)，归一化到 [0, 360)。
 * 精度约 0.1°~0.5°（未含摄动项），满足日食/冲日/合相的事件级检测。
 *
 * 纯函数模块：禁止依赖 Vue / Pinia / Three.js；不使用 Date.now()。
 */

/** J2000.0 纪元儒略日。 */
const J2000_JD = 2451545.0;

/** 行星平均轨道根数（J2000 平黄经 L0、每日运动 n，单位：度 / 度每天）。 */
const PLANET_MEAN_ORBITS: Record<string, { readonly l0: number; readonly dailyMotion: number }> = {
  mercury: { l0: 252.25, dailyMotion: 4.092334 },
  venus: { l0: 181.98, dailyMotion: 1.60213 },
  earth: { l0: 100.47, dailyMotion: 0.985647 },
  mars: { l0: 355.43, dailyMotion: 0.524033 },
  jupiter: { l0: 34.35, dailyMotion: 0.083129 },
  saturn: { l0: 50.08, dailyMotion: 0.033508 },
  uranus: { l0: 314.06, dailyMotion: 0.011728 },
  neptune: { l0: 304.35, dailyMotion: 0.005997 },
};

/** 归一化角度到 [0, 360)。 */
function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/**
 * 计算行星日心黄经（度，[0, 360)）。
 * 未知天体 ID 或非法 JD 返回 NaN。
 */
export function calculatePlanetHeliocentricLongitude(planetId: string, julianDay: number): number {
  if (!Number.isFinite(julianDay)) {
    return NaN;
  }
  const orbit = PLANET_MEAN_ORBITS[planetId];
  if (!orbit) {
    return NaN;
  }
  const daysSinceJ2000 = julianDay - J2000_JD;
  return normalizeDegrees(orbit.l0 + orbit.dailyMotion * daysSinceJ2000);
}

/** 归一化角差到 [-180, 180)（用于冲日/合相判定）。 */
export function normalizedAngularDifference(a: number, b: number): number {
  const raw = ((a - b) % 360 + 360) % 360;
  return raw > 180 ? raw - 360 : raw;
}

/** 支持的行星 ID 列表（供调用方遍历）。 */
export const PLANET_IDS: readonly string[] = Object.keys(PLANET_MEAN_ORBITS);
