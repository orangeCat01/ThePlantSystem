import type { ExplorationMission } from '@/types/exploration.types';

/**
 * 木星探测任务（Phase 2.14.2）。
 * 原创中文短文本科普；数据由 MissionRepository 汇总读取。
 */
export const jupiterMissions: readonly ExplorationMission[] = [
  {
    id: 'galileo',
    name: 'Galileo（伽利略号）',
    targetPlanetId: 'jupiter',
    year: '1995',
    agency: 'NASA',
    description: '首个环绕木星的探测器，发现木卫二冰壳下可能存在液态海洋，并释放子探测器进入木星大气。',
  },
  {
    id: 'juno',
    name: 'Juno（朱诺号）',
    targetPlanetId: 'jupiter',
    year: '2016',
    agency: 'NASA',
    description: '极地轨道探测器，深入木星云层之下研究其内部结构与磁场，拍摄了大量风暴影像。',
  },
];
