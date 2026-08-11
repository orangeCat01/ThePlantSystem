import type { ExplorationMission } from '@/types/exploration.types';

/**
 * 火星探测任务（Phase 2.14.2）。
 * 原创中文短文本科普；数据由 MissionRepository 汇总读取。
 */
export const marsMissions: readonly ExplorationMission[] = [
  {
    id: 'spirit',
    name: 'Spirit（勇气号）',
    targetPlanetId: 'mars',
    year: '2004',
    agency: 'NASA',
    description: '双胞胎火星车之一，原定任务 90 个火星日，实际工作超过 6 年，发现古火山与热液活动痕迹。',
  },
  {
    id: 'opportunity',
    name: 'Opportunity（机遇号）',
    targetPlanetId: 'mars',
    year: '2004',
    agency: 'NASA',
    description: '在火星表面行驶约 45 公里，确认古代火星曾长期存在液态水环境，工作近 15 年。',
  },
  {
    id: 'curiosity',
    name: 'Curiosity（好奇号）',
    targetPlanetId: 'mars',
    year: '2012',
    agency: 'NASA',
    description: '第一辆核动力火星车，在盖尔撞击坑发现宜居环境证据，确认甲烷浓度随季节变化。',
  },
  {
    id: 'tianwen-1',
    name: '天问一号',
    targetPlanetId: 'mars',
    year: '2021',
    agency: '中国国家航天局',
    description: '中国首次火星探测任务，一次完成环绕、着陆与巡视，祝融号火星车开展巡视探测。',
  },
];
