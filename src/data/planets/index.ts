import type { PlanetConfig } from '@/types/planet.types';
import { sunConfig } from './sun.config';
import { mercuryConfig } from './mercury.config';
import { venusConfig } from './venus.config';
import { earthConfig } from './earth.config';
import { moonConfig } from './moon.config';
import { marsConfig } from './mars.config';
import { jupiterConfig } from './jupiter.config';
import { saturnConfig } from './saturn.config';
import { panConfig, prometheusConfig, atlasConfig } from './saturn-moons.config';
import { uranusConfig } from './uranus.config';
import { neptuneConfig } from './neptune.config';
import { assertValidPlanetConfig } from './validation';

/**
 * 全部天体配置的聚合入口。
 *
 * 新增天体时：
 * 1. 新建 `<id>.config.ts` 并导出 `as const satisfies PlanetConfig` 的配置。
 * 2. 在本文件数组中按轨道顺序追加。
 * 3. 不要在其他模块重复保存同一份天体参数。
 */
const configs = [
  sunConfig,
  mercuryConfig,
  venusConfig,
  earthConfig,
  moonConfig,
  marsConfig,
  jupiterConfig,
  saturnConfig,
  panConfig,
  prometheusConfig,
  atlasConfig,
  uranusConfig,
  neptuneConfig,
] as const;

// 模块加载时执行开发期校验（fail fast），配置错误属于编程错误。
configs.forEach(assertValidPlanetConfig);

/** 只读配置集合。调用方不得修改其中任何配置。 */
export const planetConfigs: readonly PlanetConfig[] = configs;

export { sunConfig } from './sun.config';
export { mercuryConfig } from './mercury.config';
export { venusConfig } from './venus.config';
export { earthConfig } from './earth.config';
export { moonConfig } from './moon.config';
export { marsConfig } from './mars.config';
export { jupiterConfig } from './jupiter.config';
export { saturnConfig } from './saturn.config';
export { panConfig, prometheusConfig, atlasConfig } from './saturn-moons.config';
export { uranusConfig } from './uranus.config';
export { neptuneConfig } from './neptune.config';
export { assertValidPlanetConfig } from './validation';
