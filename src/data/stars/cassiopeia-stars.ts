import type { StarConfig } from '@/types/star.types';

/**
 * 仙后座星目录（Phase 2.19，真实天文数据，W 形主星 5 颗）。
 * 坐标：J2000 赤道坐标（度）。
 */
export const cassiopeiaCatalog: readonly StarConfig[] = [
  {
    id: 'schedar',
    name: '王良四',
    englishName: 'Schedar',
    constellation: 'cassiopeia',
    distanceLightYears: 228,
    magnitude: 2.24,
    spectralType: 'K0IIIa',
    position: { rightAscension: 10.13, declination: 56.54 },
    description: '仙后座 α 星，橙巨星，W 形星群的右端。',
  },
  {
    id: 'caph',
    name: '策',
    englishName: 'Caph',
    constellation: 'cassiopeia',
    distanceLightYears: 54.5,
    magnitude: 2.27,
    spectralType: 'F2III',
    position: { rightAscension: 2.36, declination: 59.15 },
    description: '仙后座 β 星，距离较近的盾牌座δ型变星。',
  },
  {
    id: 'gamma-cassiopeiae',
    name: '策星三',
    englishName: 'Gamma Cassiopeiae',
    constellation: 'cassiopeia',
    distanceLightYears: 550,
    magnitude: 2.47,
    spectralType: 'B0.5IVe',
    position: { rightAscension: 14.22, declination: 60.72 },
    description: 'W 形星群的中央顶点，罕见的快速自转 Be 星，亮度会剧烈变化。',
  },
  {
    id: 'ruchbah',
    name: '阁道三',
    englishName: 'Ruchbah',
    constellation: 'cassiopeia',
    distanceLightYears: 99.4,
    magnitude: 2.68,
    spectralType: 'A5V',
    position: { rightAscension: 21.43, declination: 60.24 },
    description: '仙后座 δ 星，目视双星，W 形的第二个折点。',
  },
  {
    id: 'segin',
    name: '阁道二',
    englishName: 'Segin',
    constellation: 'cassiopeia',
    distanceLightYears: 410,
    magnitude: 3.38,
    spectralType: 'B3V',
    position: { rightAscension: 28.53, declination: 63.67 },
    description: '仙后座 ε 星，W 形的左端蓝白色恒星。',
  },
];
