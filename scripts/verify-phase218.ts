/**
 * Phase 2.18 运行断言（Node 数据层 + 接口预留）：
 * 1. GalaxyConfig 数据完整（名称/类型/直径/恒星数/年龄/结构）
 * 2. GalaxyRepository 查询接口（get / getById / getScienceData）
 * 3. GalaxyObjectRuntime 只存引用（id / config / object3D）
 * 4. GalaxyScene 接入（getGalaxyInfo / setSelectedHandler / notifyObjectSelected 预留）
 * 5. Store 只保存字符串（galaxySelectedId / galaxyPanelVisible + actions）
 */
import { galaxyConfig } from '../src/data/galaxy/galaxy.config';
import { galaxyRepository } from '../src/repositories/GalaxyRepository';
import { createPinia, setActivePinia } from 'pinia';

let failures = 0;
function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`PASS: ${label}`);
  } else {
    failures += 1;
    console.error(`FAIL: ${label}`);
  }
}

// 1. GalaxyConfig 数据完整
assert(galaxyConfig.id === 'galaxy', '配置 id = galaxy');
assert(galaxyConfig.name === 'Milky Way', '英文名 Milky Way');
assert(galaxyConfig.displayName === '银河系', '中文名 银河系');
assert(galaxyConfig.type === '棒旋星系', '类型 棒旋星系');
assert(galaxyConfig.diameterLightYears === 100000, '直径 100000 光年');
assert(
  galaxyConfig.estimatedStarCount.includes('1000 亿') &&
    galaxyConfig.estimatedStarCount.includes('4000 亿'),
  '恒星数量 1000 亿-4000 亿',
);
assert(galaxyConfig.ageYears === 1.36e10, '年龄 136 亿年');
assert(galaxyConfig.structure.type === 'spiral', '结构类型 spiral');
assert(galaxyConfig.structure.armCount === 4, '四条主要旋臂');
assert(galaxyConfig.structure.barred === true, '棒旋 barred=true');
assert(galaxyConfig.structure.description.length > 0, '结构描述非空（原创科普）');
assert(galaxyConfig.description.length > 0, '简介非空（原创科普）');
assert(galaxyConfig.science.formation.length > 0, '形成历史非空');
assert(galaxyConfig.science.environment.length > 0, '环境特征非空');
assert(galaxyConfig.science.interestingFacts.length > 0, '趣味知识非空');
assert(
  Number.isFinite(galaxyConfig.position.rightAscension) &&
    Number.isFinite(galaxyConfig.position.declination),
  '位置坐标有限',
);

// 2. GalaxyRepository 查询接口
assert(galaxyRepository.get().id === 'galaxy', 'get() 返回银河配置');
assert(galaxyRepository.getById('galaxy')?.displayName === '银河系', 'getById("galaxy") 命中');
assert(galaxyRepository.getById('unknown') === undefined, 'getById 未知 ID 返回 undefined');
const science = galaxyRepository.getScienceData();
assert(science.formation === galaxyConfig.science.formation, 'getScienceData 返回科学信息');

// 3. GalaxyObjectRuntime 只存引用（类型断言 + 结构契约）
import type { GalaxyObjectRuntime } from '../src/three/galaxy/GalaxyObjectRuntime';
const runtimeShape: GalaxyObjectRuntime = {
  id: 'galaxy',
  config: galaxyConfig,
  object3D: null as unknown as import('three').Object3D, // 仅结构契约（运行时不构造）
};
assert(runtimeShape.id === 'galaxy' && runtimeShape.config === galaxyConfig, 'runtime 持有 config 引用');
assert(
  Object.keys(runtimeShape).length === 3,
  'runtime 只保存 id / config / object3D（不复制数据）',
);

// 4. GalaxyScene 接入（getGalaxyInfo / 预留接口存在）
const galaxySceneSource = await import('../src/three/scenes/GalaxyScene.ts');
assert(
  typeof galaxySceneSource.GalaxyScene.prototype.getGalaxyInfo === 'function',
  'GalaxyScene.getGalaxyInfo 存在',
);
assert(
  typeof galaxySceneSource.GalaxyScene.prototype.setSelectedHandler === 'function',
  'GalaxyScene.setSelectedHandler 存在（交互预留）',
);
assert(
  typeof galaxySceneSource.GalaxyScene.prototype.notifyObjectSelected === 'function',
  'GalaxyScene.notifyObjectSelected 存在（预留触发入口）',
);

// 5. Store 只保存字符串
setActivePinia(createPinia());
const { useUniverseStore } = await import('../src/stores/universe.store.ts');
const store = useUniverseStore();
assert(store.galaxySelectedId === null, 'galaxySelectedId 默认 null');
assert(store.galaxyPanelVisible === false, 'galaxyPanelVisible 默认 false');
store.selectGalaxyObject('galaxy');
assert(store.galaxySelectedId === 'galaxy', 'selectGalaxyObject 保存字符串 id');
assert(store.galaxyPanelVisible === true, 'selectGalaxyObject 打开面板');
assert(typeof store.galaxySelectedId === 'string', 'Store 只保存 string（无 Object3D）');
store.clearGalaxySelection();
assert(store.galaxySelectedId === null && store.galaxyPanelVisible === false, 'clearGalaxySelection 清空');

console.log(failures === 0 ? 'ALL PASS' : `FAILURES: ${failures}`);
process.exitCode = failures === 0 ? 0 : 1;
