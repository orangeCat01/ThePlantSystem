/**
 * 赤道坐标系（Phase 2.19）。
 *
 * 纯数学模块：
 * - 禁止依赖 Three.js / Vue / Pinia（只返回数学结果）。
 * - 坐标约定：J2000 赤道坐标（度）；场景 y-up 约定下：
 *   天球赤道面 = XZ 平面、天球北极 = +Y、春分点方向 = +X。
 */

/** 赤道坐标（J2000，角度单位：度）。 */
export interface EquatorialCoordinate {
  /** 赤经（度，0~360）。 */
  readonly rightAscension: number;
  /** 赤纬（度，-90~90）。 */
  readonly declination: number;
}

/** 三维直角坐标（纯数据；无 Three.js 依赖）。 */
export interface CartesianPosition {
  x: number;
  y: number;
  z: number;
}

/** 角度转弧度。 */
const DEG_TO_RAD = Math.PI / 180;

/**
 * 赤道坐标 + 距离 → 三维直角坐标（写入 target，返回 boolean）。
 * 公式：
 *   x = r·cos(dec)·cos(ra)
 *   y = r·sin(dec)
 *   z = r·cos(dec)·sin(ra)
 * 非法输入（NaN / 半径 <= 0）返回 false（target 保持原值）。
 */
export function equatorialToCartesian(
  coordinate: EquatorialCoordinate,
  distance: number,
  target: CartesianPosition,
): boolean {
  if (
    !Number.isFinite(coordinate.rightAscension) ||
    !Number.isFinite(coordinate.declination) ||
    !Number.isFinite(distance) ||
    distance <= 0
  ) {
    return false;
  }

  const raRad = coordinate.rightAscension * DEG_TO_RAD;
  const decRad = coordinate.declination * DEG_TO_RAD;
  const cosDec = Math.cos(decRad);

  target.x = distance * cosDec * Math.cos(raRad);
  target.y = distance * Math.sin(decRad);
  target.z = distance * cosDec * Math.sin(raRad);
  return true;
}

/**
 * 赤道坐标 → 单位方向向量（写入 target）。
 * 非法输入返回 false（target 保持原值）。
 */
export function equatorialDirection(
  coordinate: EquatorialCoordinate,
  target: CartesianPosition,
): boolean {
  return equatorialToCartesian(coordinate, 1, target);
}
