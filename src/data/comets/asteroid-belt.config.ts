/**
 * 小行星带配置（Phase 2.23）。
 *
 * 语义：火星（演示轨道 11）与木星（演示轨道 17）之间的环带，
 * 对应真实 2.1 ~ 3.3 AU 小行星带。演示单位：内半径 12.5 / 外半径 15.5。
 */
import type { SolarObjectConfig } from '@/types/solar-object.types';

/** 小行星带配置。 */
export const asteroidBeltConfig: SolarObjectConfig = {
  id: 'asteroid-belt',
  type: 'asteroid-belt',
  name: '小行星带',
  orbit: {
    innerRadius: 12.5,
    outerRadius: 15.5,
    speed: 0.004,
  },
  visual: {
    count: 8000,
    size: 0.08,
    color: 0x8c8c8c,
    opacity: 0.65,
  },
  science: {
    typeLabel: '小行星带',
    periodYears: 4.6,
    origin: '太阳系早期',
    summary: '位于火星与木星之间的岩石小天体聚集区，是太阳系最密集的小天体结构。',
  },
};
