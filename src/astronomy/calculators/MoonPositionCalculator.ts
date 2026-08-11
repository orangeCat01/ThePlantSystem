/**
 * 月球黄道坐标计算器（Phase 2.16，日食/月食检测用）。
 *
 * 简化算法（Meeus 低精度主要项）：
 * - L'（月球平黄经）、D（日月平距角）、M（太阳平近点角）、
 *   M'（月球平近点角）、F（月球纬度参数）。
 * - 黄经主要项：λ = L' + 6.289·sin(M') + 1.274·sin(2D-M') + 0.658·sin(2D)。
 * - 黄纬主要项：β = 5.128·sin(F) + 0.28·sin(M'+F) - 0.28·sin(M'-F) - 0.17·sin(M-F)。
 * 精度约 0.1° 量级，满足事件级检测（食相判定阈值 1°~2°）。
 *
 * 纯函数模块：禁止依赖 Vue / Pinia / Three.js；不使用 Date.now()。
 */

/** J2000.0 纪元儒略日。 */
const J2000_JD = 2451545.0;
/** 角度转弧度。 */
const DEG_TO_RAD = Math.PI / 180;

/** 月球黄道坐标（只读视图）。 */
export interface MoonEclipticPosition {
  /** 黄经（度，[0, 360)）。 */
  readonly longitude: number;
  /** 黄纬（度，[-90, 90]）。 */
  readonly latitude: number;
}

/** 内部可变月球黄道坐标（计算写回目标）。 */
export type MutableMoonEclipticPosition = {
  longitude: number;
  latitude: number;
};

/** 归一化角度到 [0, 360)。 */
function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/**
 * 计算月球黄道坐标（复用入参对象写回，避免创建新对象）。
 * 非法 JD 返回 false（结果对象保持原值）。
 */
export function calculateMoonEclipticPosition(
  julianDay: number,
  target: MutableMoonEclipticPosition,
): boolean {
  if (!Number.isFinite(julianDay)) {
    return false;
  }

  const n = julianDay - J2000_JD;

  // 基础角度（度）。
  const moonMeanLongitude = 218.316 + 13.176396 * n; // L'
  const meanElongation = 297.85 + 12.190749 * n; // D
  const sunMeanAnomaly = 357.529 + 0.9856003 * n; // M
  const moonMeanAnomaly = 134.963 + 13.064993 * n; // M'
  const moonArgumentOfLatitude = 93.272 + 13.22935 * n; // F

  const mRad = sunMeanAnomaly * DEG_TO_RAD;
  const mPrimeRad = moonMeanAnomaly * DEG_TO_RAD;
  const dRad = meanElongation * DEG_TO_RAD;
  const fRad = moonArgumentOfLatitude * DEG_TO_RAD;

  // 黄经主要项（度）。
  const longitude = normalizeDegrees(
    moonMeanLongitude +
      6.289 * Math.sin(mPrimeRad) +
      1.274 * Math.sin(2 * dRad - mPrimeRad) +
      0.658 * Math.sin(2 * dRad),
  );

  // 黄纬主要项（度）。
  const latitude =
    5.128 * Math.sin(fRad) +
    0.28 * Math.sin(mPrimeRad + fRad) -
    0.28 * Math.sin(mPrimeRad - fRad) -
    0.17 * Math.sin(mRad - fRad);

  target.longitude = longitude;
  target.latitude = latitude;
  return true;
}
