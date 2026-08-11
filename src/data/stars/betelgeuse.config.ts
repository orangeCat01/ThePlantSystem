import type { StarConfig } from '@/types/star.types';

/**
 * 参宿四配置（Phase 2.19，真实天文数据）。
 * 坐标：J2000 赤道坐标（度）。
 */
export const betelgeuseConfig = {
  id: 'betelgeuse',
  name: '参宿四',
  englishName: 'Betelgeuse',
  constellation: 'orion',
  distanceLightYears: 548,
  magnitude: 0.5,
  spectralType: 'M1-2Ia',
  position: { rightAscension: 88.79, declination: 7.41 },
  physical: {
    massSolar: 16.5,
    radiusSolar: 764,
    temperatureK: 3600,
    luminositySolar: 126000,
    spectralType: 'M1-2Ia',
    magnitude: 0.5,
    distanceLightYear: 548,
  },
  description: '猎户座左肩的红超巨星，体积约为太阳十亿倍，是已知最亮红超巨星之一，未来将超新星爆发。',
} as const satisfies StarConfig;
