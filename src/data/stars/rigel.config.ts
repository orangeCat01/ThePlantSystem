import type { StarConfig } from '@/types/star.types';

/**
 * 参宿七配置（Phase 2.19，真实天文数据）。
 * 坐标：J2000 赤道坐标（度）。
 */
export const rigelConfig = {
  id: 'rigel',
  name: '参宿七',
  englishName: 'Rigel',
  constellation: 'orion',
  distanceLightYears: 863,
  magnitude: 0.13,
  spectralType: 'B8Ia',
  position: { rightAscension: 78.63, declination: -8.2 },
  physical: {
    massSolar: 21,
    radiusSolar: 78.9,
    temperatureK: 12100,
    luminositySolar: 120000,
    spectralType: 'B8Ia',
    magnitude: 0.13,
    distanceLightYear: 863,
  },
  description: '猎户座右脚的蓝超巨星，光度约为太阳十二万倍，是猎户座中最亮的恒星。',
} as const satisfies StarConfig;
