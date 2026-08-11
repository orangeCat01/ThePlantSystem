import type { ExplorationMission } from '@/types/exploration.types';

/**
 * 月球探测任务（Phase 2.14.2）。
 * 原创中文短文本科普；数据由 MissionRepository 汇总读取。
 */
export const moonMissions: readonly ExplorationMission[] = [
  {
    id: 'apollo-11',
    name: 'Apollo 11',
    targetPlanetId: 'moon',
    year: '1969',
    agency: 'NASA',
    description: '人类首次载人登月任务，阿姆斯特朗与奥尔德林踏上月球表面，带回约 21 千克月岩样本。',
  },
  {
    id: 'luna-2',
    name: 'Luna 2',
    targetPlanetId: 'moon',
    year: '1959',
    agency: '苏联',
    description: '第一颗抵达月球表面的人造探测器，以硬着陆方式验证了地月航线与测控能力。',
  },
  {
    id: 'change-4',
    name: '嫦娥四号',
    targetPlanetId: 'moon',
    year: '2019',
    agency: '中国国家航天局',
    description: '人类首次着陆月球背面，玉兔二号巡视器开展月背地质与低频射电探测。',
  },
];
