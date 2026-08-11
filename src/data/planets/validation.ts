import type { PlanetConfig } from '@/types/planet.types';

/**
 * 开发期配置校验。不引入任何运行时验证库。
 *
 * 配置是静态权威数据，校验失败属于编程错误，应当尽早暴露（fail fast），
 * 因此校验不返回布尔值，而是直接抛出带明确信息的 Error。
 */
export function assertValidPlanetConfig(config: PlanetConfig): void {
  if (!config.id.trim()) {
    throw new Error(`[planet-config] 天体 ID 不能为空（name=${config.name}）。`);
  }

  if (config.id !== config.id.toLowerCase()) {
    throw new Error(`[planet-config] 天体 ID 必须为小写（id=${config.id}）。`);
  }

  // 无公转天体（如恒星，orbit.enabled === false）固定于中心，轨道半径可为 0。
  if (config.orbit.enabled && config.orbit.radius <= 0) {
    throw new Error(`[planet-config] 轨道半径必须大于 0（id=${config.id}）。`);
  }

  if (config.visual.radius <= 0) {
    throw new Error(`[planet-config] 视觉半径必须大于 0（id=${config.id}）。`);
  }

  if (config.visual.cameraDistance <= config.visual.radius) {
    throw new Error(
      `[planet-config] 相机距离必须大于视觉半径（id=${config.id}, cameraDistance=${config.visual.cameraDistance}, radius=${config.visual.radius}）。`,
    );
  }

  if (config.rotation.direction !== 1 && config.rotation.direction !== -1) {
    throw new Error(`[planet-config] rotation.direction 只能是 1 或 -1（id=${config.id}）。`);
  }

  if (config.science.satelliteCount < 0) {
    throw new Error(`[planet-config] satelliteCount 不能为负数（id=${config.id}）。`);
  }

  if (config.science.temperatureMinCelsius > config.science.temperatureMaxCelsius) {
    throw new Error(
      `[planet-config] 最低温度不能大于最高温度（id=${config.id}, min=${config.science.temperatureMinCelsius}, max=${config.science.temperatureMaxCelsius}）。`,
    );
  }

  if (config.ring) {
    const { innerRadiusScale, outerRadiusScale, opacity } = config.ring;
    if (!Number.isFinite(innerRadiusScale) || innerRadiusScale <= 0) {
      throw new Error(`[planet-config] 环内径倍数必须大于 0（id=${config.id}）。`);
    }
    if (!Number.isFinite(outerRadiusScale) || outerRadiusScale <= innerRadiusScale) {
      throw new Error(
        `[planet-config] 环外径倍数必须大于内径倍数（id=${config.id}, inner=${innerRadiusScale}, outer=${outerRadiusScale}）。`,
      );
    }
    if (!Number.isFinite(opacity) || opacity <= 0 || opacity > 1) {
      throw new Error(`[planet-config] 环不透明度必须在 (0, 1] 区间（id=${config.id}, opacity=${opacity}）。`);
    }
  }
}
