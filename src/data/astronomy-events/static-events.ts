import type { AstronomyEvent } from '@/astronomy/events/astronomy-event.types';

/**
 * 静态天文事件（Phase 2.16）。
 *
 * 内容：已知的流星雨极大、特殊天象与经人工核对的食/冲日事件。
 * 动态引擎（AstronomyEventEngine）也会计算食与冲日；合并时静态优先
 * （人工校验过的日期精度更高），同类型近邻日期去重。
 *
 * 原创中文短文本；禁止复制百科长文本。
 */
export const staticAstronomyEvents: readonly AstronomyEvent[] = [
  {
    id: 'meteor-quadrantids-2026',
    type: 'meteor_shower',
    title: '象限仪座流星雨极大',
    date: '2026-01-03',
    description: '年度三大流星雨之一，极大时每小时天顶流量可达百余颗，辐射点位于牧夫座方向。',
    relatedBodies: ['earth'],
    importance: 'normal',
  },
  {
    id: 'lunar-eclipse-2026-02-17',
    type: 'lunar_eclipse',
    title: '月偏食',
    date: '2026-02-17',
    description: '月球部分进入地球本影，亚洲与欧洲部分地区可见，食分较小。',
    relatedBodies: ['sun', 'earth', 'moon'],
    importance: 'normal',
  },
  {
    id: 'solar-eclipse-2026-03-03',
    type: 'solar_eclipse',
    title: '日全食',
    date: '2026-03-03',
    description: '全食带经过北太平洋与极北地区，月球完全遮住太阳，可见短暂白昼。',
    relatedBodies: ['sun', 'earth', 'moon'],
    importance: 'major',
  },
  {
    id: 'opposition-saturn-2026-03-14',
    type: 'opposition',
    title: '土星冲日',
    date: '2026-03-14',
    description: '土星与太阳分处地球两侧，整夜可见，是观测土星环的最佳窗口。',
    relatedBodies: ['saturn', 'earth'],
    importance: 'normal',
  },
  {
    id: 'meteor-lyrids-2026',
    type: 'meteor_shower',
    title: '天琴座流星雨极大',
    date: '2026-04-22',
    description: '母体为撒切尔彗星，极大时每小时天顶流量约 18 颗，偶有明亮火流星。',
    relatedBodies: ['earth'],
    importance: 'minor',
  },
  {
    id: 'meteor-perseids-2026',
    type: 'meteor_shower',
    title: '英仙座流星雨极大',
    date: '2026-08-12',
    description: '全年最稳定的流星雨之一，极大时每小时天顶流量可达百颗，夏季观测条件友好。',
    relatedBodies: ['earth'],
    importance: 'major',
  },
  {
    id: 'lunar-eclipse-2026-08-28',
    type: 'lunar_eclipse',
    title: '月偏食',
    date: '2026-08-28',
    description: '月球部分进入地球本影，亚洲东部与美洲西部可见。',
    relatedBodies: ['sun', 'earth', 'moon'],
    importance: 'normal',
  },
  {
    id: 'opposition-jupiter-2026-09-27',
    type: 'opposition',
    title: '木星冲日',
    date: '2026-09-27',
    description: '木星整夜可见且视直径最大，适合观测大红斑与四颗伽利略卫星。',
    relatedBodies: ['jupiter', 'earth'],
    importance: 'normal',
  },
  {
    id: 'meteor-geminids-2026',
    type: 'meteor_shower',
    title: '双子座流星雨极大',
    date: '2026-12-14',
    description: '年度最稳定的流星雨，极大时每小时天顶流量可达百五十颗，速度偏慢适合观测。',
    relatedBodies: ['earth'],
    importance: 'major',
  },
  // 历史事件（供「历史事件」查询）。
  {
    id: 'solar-eclipse-2024-04-08',
    type: 'solar_eclipse',
    title: '日全食',
    date: '2024-04-08',
    description: '全食带横贯北美洲，数百万人在全食阶段目睹日冕与钻石环效应。',
    relatedBodies: ['sun', 'earth', 'moon'],
    importance: 'major',
  },
  {
    id: 'lunar-eclipse-2025-09-07',
    type: 'lunar_eclipse',
    title: '月全食',
    date: '2025-09-07',
    description: '月球完全进入地球本影，呈现红铜色的「血月」，亚欧大陆大部可见。',
    relatedBodies: ['sun', 'earth', 'moon'],
    importance: 'major',
  },
];
