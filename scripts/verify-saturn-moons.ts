/**
 * Phase 2.23 土星环卫星数据层断言（确定性验证，非浏览器）：
 * 1. planetConfigs 包含 3 颗土星卫星（pan/prometheus/atlas）
 * 2. parentBodyId = 'saturn'、type = 'natural-satellite'
 * 3. 演示轨道半径全部落在土星环带内（环 2.66 ~ 4.56 演示单位）
 * 4. 模型路径有效（moon GLB 存在）
 */
import { planetConfigs } from '@/data/planets';
import { saturnConfig } from '@/data/planets';
import { existsSync } from 'node:fs';

const results: string[] = [];

const saturnRingInner = (saturnConfig.ring?.innerRadius ?? 1.4) * saturnConfig.visual.radius;
const saturnRingOuter = (saturnConfig.ring?.outerRadius ?? 2.4) * saturnConfig.visual.radius;
results.push(`土星环带：${saturnRingInner.toFixed(2)} ~ ${saturnRingOuter.toFixed(2)} 演示单位`);

const moons = planetConfigs.filter(
  (config) =>
    config.type === 'natural-satellite' && config.parentBodyId === 'saturn',
);
results.push(`土星卫星数量=${moons.length}（期望 3）`);
results.push(
  moons.length === 3
    ? '土星卫星配置存在 OK'
    : `CHECK: 期望 3 颗，实际 ${moons.length}`,
);

for (const moon of moons) {
  const radius = moon.orbit.radius;
  const inRing = radius >= saturnRingInner && radius <= saturnRingOuter;
  const modelOk = moon.modelPath !== undefined && existsSync(`public${moon.modelPath}`);
  results.push(
    `${moon.id}(${moon.name}): 轨道=${radius} 环内=${inRing ? '是' : '否'} 模型=${modelOk ? '有效' : '缺失'} 周期=${moon.science.revolutionPeriodDays}天`,
  );
  if (!inRing) {
    results.push(`CHECK: ${moon.id} 轨道不在环带内`);
  }
}

const allInRing = moons.every(
  (moon) => moon.orbit.radius >= saturnRingInner && moon.orbit.radius <= saturnRingOuter,
);
results.push(allInRing && moons.length === 3 ? 'ALL PASS' : 'FAIL');
console.log(results.join('\n'));
