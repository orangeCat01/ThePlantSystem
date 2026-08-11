/**
 * 地平坐标计算器（Phase 2.20）。
 *
 * 赤道坐标（赤经/赤纬）+ 观测地点（纬度）+ 本地恒星时 → 高度角 / 方位角。
 *
 * 公式：
 *   H = LST - RA（时角，rad）
 *   sin(alt) = sin(lat)·sin(dec) + cos(lat)·cos(dec)·cos(H)
 *   az = atan2(-cos(dec)·sin(H), sin(dec)·cos(lat) - cos(dec)·sin(lat)·cos(H))
 *   az 归一化到 [0, 360)（北起顺时针）。
 *
 * 纯数学模块：禁止依赖 Three.js / Vue / Pinia。
 */

/** 角度转弧度。 */
const DEG_TO_RAD = Math.PI / 180;
/** 弧度转角度。 */
const RAD_TO_DEG = 180 / Math.PI;

/** 地平坐标（度）。 */
export interface HorizontalCoordinate {
  /** 高度角（度，[-90, 90]）。 */
  readonly altitude: number;
  /** 方位角（度，[0, 360)，北起顺时针）。 */
  readonly azimuth: number;
}

/** 内部可变地平坐标（计算写回目标）。 */
export type MutableHorizontalCoordinate = {
  altitude: number;
  azimuth: number;
};

/** 归一化角度到 [0, 360)。 */
function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/**
 * 计算恒星时（度，[0, 360)）：格林尼治恒星时（简化公式）+ 观测经度。
 * - d = JD - 2451545.0（J2000 起算天数，含小数）。
 * - GMST(度) = 280.46061837 + 360.98564736629 × d（简化，精度约 0.01°）。
 * 非法 JD / 经度返回 NaN。
 */
export function calculateLocalSiderealTime(
  julianDay: number,
  longitudeDeg: number,
): number {
  if (!Number.isFinite(julianDay) || !Number.isFinite(longitudeDeg)) {
    return NaN;
  }
  const daysSinceJ2000 = julianDay - 2451545.0;
  const gmstDegrees = 280.46061837 + 360.98564736629 * daysSinceJ2000;
  return normalizeDegrees(gmstDegrees + longitudeDeg);
}

/**
 * 赤道坐标 → 地平坐标（写入 target；非法输入返回 false，target 保持原值）。
 * 角度单位：度。时角 H = LST - RA。
 */
export function calculateHorizontalCoordinate(
  rightAscensionDeg: number,
  declinationDeg: number,
  latitudeDeg: number,
  localSiderealTimeDeg: number,
  target: MutableHorizontalCoordinate,
): boolean {
  if (
    !Number.isFinite(rightAscensionDeg) ||
    !Number.isFinite(declinationDeg) ||
    !Number.isFinite(latitudeDeg) ||
    !Number.isFinite(localSiderealTimeDeg)
  ) {
    return false;
  }

  const decRad = declinationDeg * DEG_TO_RAD;
  const latRad = latitudeDeg * DEG_TO_RAD;
  const hourAngleRad = (localSiderealTimeDeg - rightAscensionDeg) * DEG_TO_RAD;

  const sinAltitude =
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourAngleRad);
  // 数值保护：浮点误差可能导致略超 [-1, 1]。
  const altitude = Math.asin(Math.min(Math.max(sinAltitude, -1), 1)) * RAD_TO_DEG;

  const azimuthRad = Math.atan2(
    -Math.cos(decRad) * Math.sin(hourAngleRad),
    Math.sin(decRad) * Math.cos(latRad) -
      Math.cos(decRad) * Math.sin(latRad) * Math.cos(hourAngleRad),
  );
  const azimuth = normalizeDegrees(azimuthRad * RAD_TO_DEG);

  target.altitude = altitude;
  target.azimuth = azimuth;
  return true;
}
