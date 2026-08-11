import type { ExplorationMission } from '@/types/exploration.types';

/**
 * 地球相关探测任务（Phase 2.14.2）。
 * 原创中文短文本科普；数据由 MissionRepository 汇总读取。
 */
export const earthMissions: readonly ExplorationMission[] = [
  {
    id: 'iss',
    name: '国际空间站（ISS）',
    targetPlanetId: 'earth',
    year: '1998',
    agency: 'NASA / 多国合作',
    description: '人类建造的规模最大的近地轨道设施，持续开展微重力科学实验与长期驻留。',
  },
  {
    id: 'apollo-8',
    name: 'Apollo 8',
    targetPlanetId: 'moon',
    year: '1968',
    agency: 'NASA',
    description: '首次载人绕月飞行任务，宇航员从月球轨道回望地球，留下经典照片「地出」。',
  },
  {
    id: 'apollo-program',
    name: '阿波罗计划（Apollo Program）',
    targetPlanetId: 'earth',
    year: '1961',
    agency: 'NASA',
    description: '人类最宏大的载人航天计划，从地球出发完成六次登月，验证了地月往返全流程。',
  },
  {
    id: 'sputnik-1',
    name: 'Sputnik 1',
    targetPlanetId: 'earth',
    year: '1957',
    agency: '苏联',
    description: '人类第一颗人造地球卫星，开启了航天时代，仅以无线电信号宣告太空探索的起点。',
  },
];
