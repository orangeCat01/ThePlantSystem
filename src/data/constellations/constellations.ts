import type { ConstellationConfig } from '@/types/star.types';

/**
 * 星座配置（Phase 2.19）。
 * 连线为数组对格式 [起点星 ID, 终点星 ID]（标准星图连线；
 * 恒星 ID 引用 StarRepository 目录）。
 */
export const constellationCatalog: readonly ConstellationConfig[] = [
  {
    id: 'orion',
    name: '猎户座',
    englishName: 'Orion',
    stars: ['betelgeuse', 'rigel', 'bellatrix', 'saiph', 'alnitak', 'alnilam', 'mintaka'],
    lines: [
      ['betelgeuse', 'bellatrix'],
      ['betelgeuse', 'alnilam'],
      ['bellatrix', 'alnitak'],
      ['alnitak', 'alnilam'],
      ['alnilam', 'mintaka'],
      ['mintaka', 'saiph'],
      ['saiph', 'rigel'],
      ['rigel', 'alnitak'],
    ],
  },
  {
    id: 'lyra',
    name: '天琴座',
    englishName: 'Lyra',
    stars: ['vega', 'epsilon-lyrae'],
    lines: [['vega', 'epsilon-lyrae']],
  },
  {
    id: 'ursa-major',
    name: '大熊座',
    englishName: 'Ursa Major',
    stars: ['dubhe', 'merak', 'phecda', 'megrez', 'alioth', 'mizar', 'alkaid'],
    lines: [
      ['dubhe', 'merak'],
      ['merak', 'phecda'],
      ['phecda', 'megrez'],
      ['megrez', 'alioth'],
      ['alioth', 'mizar'],
      ['mizar', 'alkaid'],
    ],
  },
  {
    id: 'cassiopeia',
    name: '仙后座',
    englishName: 'Cassiopeia',
    stars: ['caph', 'schedar', 'gamma-cassiopeiae', 'ruchbah', 'segin'],
    lines: [
      ['caph', 'schedar'],
      ['schedar', 'gamma-cassiopeiae'],
      ['gamma-cassiopeiae', 'ruchbah'],
      ['ruchbah', 'segin'],
    ],
  },
];
