import type { ExplorationMission } from '@/types/exploration.types';

/**
 * 土星探测任务（Phase 2.14.2）。
 * 原创中文短文本科普；数据由 MissionRepository 汇总读取。
 */
export const saturnMissions: readonly ExplorationMission[] = [
  {
    id: 'cassini',
    name: 'Cassini（卡西尼号）',
    targetPlanetId: 'saturn',
    year: '2004',
    agency: 'NASA / ESA / ASI',
    description: '环绕土星 13 年的旗舰任务，发现土卫二冰喷泉与土卫六甲烷湖泊，最终坠入土星大气结束使命。',
  },
  {
    id: 'voyager-1',
    name: 'Voyager 1（旅行者 1 号）',
    targetPlanetId: 'saturn',
    year: '1980',
    agency: 'NASA',
    description: '飞掠土星时发现环缝结构由牧羊卫星维持，借助引力弹弓加速飞向星际空间。',
  },
];
