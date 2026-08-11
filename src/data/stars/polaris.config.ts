import type { StarConfig } from '@/types/star.types';

/**
 * 北极星配置（Phase 2.19，真实天文数据）。
 * 坐标：J2000 赤道坐标（度）。
 */
export const polarisConfig = {
  id: 'polaris',
  name: '北极星',
  englishName: 'Polaris',
  constellation: 'ursa-minor',
  distanceLightYears: 433,
  magnitude: 1.98,
  spectralType: 'F7Ib',
  position: { rightAscension: 37.95, declination: 89.26 },
  physical: {
    massSolar: 5.4,
    radiusSolar: 37.5,
    temperatureK: 6015,
    luminositySolar: 1260,
    spectralType: 'F7Ib',
    magnitude: 1.98,
    distanceLightYear: 433,
  },
  description: '目前最接近天球北极的亮星，几乎固定于正北方向，是历代航海的定向参照。',
} as const satisfies StarConfig;
