/**
 * 恒星坐标转换（Phase 2.17）。
 *
 * 赤经/赤纬（J2000 赤道坐标，度）→ 三维球坐标（场景 y-up 约定）：
 * 天球赤道面 = XZ 平面，天球北极 = +Y，春分点方向 = +X。
 *
 * 公式：
 *   x = r·cos(dec)·cos(ra)
 *   y = r·sin(dec)
 *   z = r·cos(dec)·sin(ra)
 *
 * 纯函数模块：
 * - 禁止依赖 Three.js（不使用 Vector3）/ Vue / Pinia。
 * - 输出写入调用方提供的 target 对象（避免重复创建对象）。
 */

/** 角度转弧度。 */
const DEG_TO_RAD = Math.PI / 180;

/** 三维坐标（纯数据；无 Three.js 依赖）。 */
export interface StarPosition3D {
  x: number;
  y: number;
  z: number;
}

/** 恒星视觉半径下限（场景单位，远大于最远轨道 32，保证深空背景稳定）。 */
const VISUAL_RADIUS_MIN = 500;
/** 恒星视觉半径上限。 */
const VISUAL_RADIUS_MAX = 820;
/** 距离映射参考上限（光年）：超过该值钳制到上限。 */
const DISTANCE_REFERENCE_LIGHT_YEARS = 1000;

/**
 * 光年距离 → 场景视觉半径（对数压缩：近星与远星都在深空球壳内，
 * 避免真实距离比例导致近星混入行星区 / 远星超出相机远平面）。
 */
export function starVisualRadius(distanceLightYears: number): number {
  if (!Number.isFinite(distanceLightYears) || distanceLightYears <= 0) {
    return VISUAL_RADIUS_MIN;
  }
  const clamped = Math.min(distanceLightYears, DISTANCE_REFERENCE_LIGHT_YEARS);
  // 对数映射：0~1000 光年 → 500~820（近星差异放大、远星压缩）。
  const ratio = Math.log10(1 + clamped) / Math.log10(1 + DISTANCE_REFERENCE_LIGHT_YEARS);
  return VISUAL_RADIUS_MIN + ratio * (VISUAL_RADIUS_MAX - VISUAL_RADIUS_MIN);
}

/**
 * 赤经/赤纬 + 半径 → 三维坐标（写入 target，返回 target 便于链式）。
 * 非法输入（NaN / 半径 <= 0）返回 false（target 保持原值）。
 */
export function convertStarPosition(
  rightAscensionDeg: number,
  declinationDeg: number,
  radius: number,
  target: StarPosition3D,
): boolean {
  if (
    !Number.isFinite(rightAscensionDeg) ||
    !Number.isFinite(declinationDeg) ||
    !Number.isFinite(radius) ||
    radius <= 0
  ) {
    return false;
  }

  const raRad = rightAscensionDeg * DEG_TO_RAD;
  const decRad = declinationDeg * DEG_TO_RAD;
  const cosDec = Math.cos(decRad);

  target.x = radius * cosDec * Math.cos(raRad);
  target.y = radius * Math.sin(decRad);
  target.z = radius * cosDec * Math.sin(raRad);
  return true;
}

/**
 * 赤经/赤纬 → 单位方向向量（写入 target）。
 * 非法输入返回 false（target 保持原值）。
 */
export function starDirection(
  rightAscensionDeg: number,
  declinationDeg: number,
  target: StarPosition3D,
): boolean {
  return convertStarPosition(rightAscensionDeg, declinationDeg, 1, target);
}
