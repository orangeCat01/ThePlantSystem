import type { StarConfig } from '@/types/star.types';
import { siriusConfig } from './sirius.config';
import { polarisConfig } from './polaris.config';
import { betelgeuseConfig } from './betelgeuse.config';
import { rigelConfig } from './rigel.config';
import { brightStarCatalog } from './bright-stars';
import { bigDipperCatalog } from './big-dipper';
import { cassiopeiaCatalog } from './cassiopeia-stars';

/**
 * 恒星目录汇总（Phase 2.19）。
 * 权威数据源：4 颗独立配置（含物理参数）+ 亮星目录 + 北斗七星 + 仙后座。
 * 禁止在 Three.js 层硬编码恒星数据。
 */
export const starCatalog: readonly StarConfig[] = [
  siriusConfig,
  polarisConfig,
  betelgeuseConfig,
  rigelConfig,
  ...brightStarCatalog,
  ...bigDipperCatalog,
  ...cassiopeiaCatalog,
];
