/**
 * 观测地点模型（Phase 2.20）。
 *
 * 纯数据层：禁止依赖 Three.js / Vue / Pinia。
 */

/** 观测地点（全 readonly；纬度/经度经校验后存储）。 */
export interface ObserverLocation {
  /** 纬度（度，[-90, 90]；北纬为正）。 */
  readonly latitude: number;
  /** 经度（度，[-180, 180]；东经为正）。 */
  readonly longitude: number;
  /** 海拔（米，可选）。 */
  readonly elevation?: number;
  /** 地点名称（如 '北京'）。 */
  readonly name: string;
}

/** 校验纬度（度，[-90, 90]）。 */
export function isValidLatitude(latitude: number): boolean {
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90;
}

/** 校验经度（度，[-180, 180]）。 */
export function isValidLongitude(longitude: number): boolean {
  return Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

/**
 * 创建观测地点；非法输入（纬度/经度越界或 NaN / Infinity）返回 null（调用方安全处理）。
 */
export function createObserverLocation(
  latitude: number,
  longitude: number,
  name: string,
  elevation?: number,
): ObserverLocation | null {
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return null;
  }
  if (elevation !== undefined && (!Number.isFinite(elevation) || elevation < 0)) {
    return null;
  }
  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    return null;
  }
  return {
    latitude,
    longitude,
    elevation,
    name: trimmedName,
  };
}
