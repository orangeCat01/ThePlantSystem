import type { StarConfig } from '@/types/star.types';

/**
 * 天狼星配置（Phase 2.19，真实天文数据）。
 * 坐标：J2000 赤道坐标（度）。
 */
export const siriusConfig = {
  id: 'sirius',
  name: '天狼星',
  englishName: 'Sirius',
  constellation: 'canis-major',
  distanceLightYears: 8.6,
  magnitude: -1.46,
  spectralType: 'A1V',
  position: { rightAscension: 101.29, declination: -16.72 },
  physical: {
    massSolar: 2.06,
    radiusSolar: 1.71,
    temperatureK: 9940,
    luminositySolar: 25.4,
    spectralType: 'A1V',
    magnitude: -1.46,
    distanceLightYear: 8.6,
  },
  description: '夜空最亮的恒星，距离仅 8.6 光年，拥有白矮星伴星，古埃及曾以它的偕日升标记尼罗河泛滥。',
} as const satisfies StarConfig;
