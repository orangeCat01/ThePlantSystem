/**
 * Phase 2.20.1 运行断言（静态 + 状态层）：
 * 1. 场景切换链路：switchScene catch 不再卡 loading；Overlay 交互元素 pointer-events:auto
 * 2. 唯一全局标题：路由页无 skeleton/探索入口标题
 * 3. showPlanetLabels 默认 false
 * 4. 望远镜 / 航天任务 UI 入口隐藏（组件与按钮保留数据与代码）
 * 5. 卡片无内部滚动（全 components/views 无 overflow auto/scroll）
 * 6. GridHelper / AxesHelper 默认关闭（debug 配置）
 * 7. HighlightEffect 柔和化（0x6ddcff / 0.25 / 0.85）
 * 8. 架构约束（pinia/three/raf）
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

const srcRoot = resolve(import.meta.dirname ?? '.', '../src');
const read = (path: string): string => readFileSync(resolve(srcRoot, path), 'utf-8');

// 1. 场景切换链路
const coordinatorSource = read('app/ApplicationCoordinator.ts');
assert(
  coordinatorSource.includes("store.setLoading(false);\n      store.setError(toSerializableError(error, 'switchScene'))"),
  'switchScene catch 释放 loading（按钮不再被禁用卡死）',
);
const overlayContainerSource = read('components/overlay/OverlayContainer.vue');
assert(overlayContainerSource.includes('pointer-events: none'), 'Overlay 容器背景 pointer-events:none');
assert(overlayContainerSource.includes('pointer-events: auto'), 'Overlay 交互区 pointer-events:auto');
const universeViewSource = read('views/UniverseView.vue');
assert(
  universeViewSource.includes('pointer-events: auto') &&
    universeViewSource.includes('exploration-root__top-actions'),
  '顶部操作区（SceneSwitch）显式 pointer-events:auto',
);

// 2. 唯一全局标题
const solarView = read('views/SolarSystemView.vue');
const galaxyView = read('views/GalaxyView.vue');
assert(!solarView.includes('太阳系探索入口') && !solarView.includes('Solar Skeleton'), '太阳系路由页无重复标题');
assert(!galaxyView.includes('GALAXY SKELETON') && !galaxyView.includes('银河系探索入口'), '银河系路由页无重复标题');
const appHeader = read('components/layout/AppHeader.vue');
assert(appHeader.includes('银河系科普探索站'), '全局标题保留（AppHeader）');

// 3. showPlanetLabels 默认 false
setActivePinia(createPinia());
const { useUniverseStore } = await import('../src/stores/universe.store.ts');
const store = useUniverseStore();
assert(store.showPlanetLabels === false, 'Store.showPlanetLabels 默认 false（无默认天体文字）');

// 4. 隐藏望远镜 / 航天任务入口（保留组件与数据文件）
assert(!universeViewSource.includes('TelescopePanel'), 'UniverseView 无望远镜入口');
assert(!universeViewSource.includes('MissionPanel'), 'UniverseView 无任务详情入口');
assert(!universeViewSource.includes('MissionControlPanel'), 'UniverseView 无任务控制入口');
const modeSwitchSource = read('components/star/ObservationModeSwitch.vue');
assert(!modeSwitchSource.includes('TELESCOPE'), '观察模式按钮无望远镜入口');
const missionDataExists = (() => {
  try {
    read('data/missions/spacecraft/spacecraft.missions.ts');
    return true;
  } catch {
    return false;
  }
})();
assert(missionDataExists, 'MissionRepository 数据保留（可未来扩展）');
const telescopePanelExists = (() => {
  try {
    read('components/astronomy/TelescopePanel.vue');
    return true;
  } catch {
    return false;
  }
})();
assert(telescopePanelExists, 'TelescopePanel 组件保留（可未来扩展）');

// 5. 卡片无内部滚动
const componentFiles = ['components/planet/PlanetPanel.vue', 'components/exploration/FavoritePanel.vue', 'components/exploration/ExplorationSearch.vue', 'components/astronomy/ObservationPanel.vue', 'components/astronomy/AstronomyEventPanel.vue', 'components/overlay/OverlayContainer.vue', 'components/overlay/BaseInfoCard.vue'];
let noScroll = true;
for (const file of componentFiles) {
  const source = read(file);
  if (source.includes('overflow-y: auto') || source.includes('overflow: auto') || source.includes('overflow: scroll') || source.includes('overflow-y: scroll')) {
    noScroll = false;
    console.error(`  ${file} 含内部滚动`);
  }
}
assert(noScroll, '卡片与 Overlay 区域无内部滚动条');

// 6. GridHelper / AxesHelper 默认关闭
const solarSceneSource = read('three/scenes/SolarScene.ts');
assert(solarSceneSource.includes('showGrid: false') && solarSceneSource.includes('showAxes: false'), 'debug 配置默认 false');
assert(solarSceneSource.includes('if (this.debugOptions.showGrid)'), 'GridHelper 由配置控制创建');
assert(solarSceneSource.includes('if (this.debugOptions.showAxes)'), 'AxesHelper 由配置控制创建');
assert(solarSceneSource.includes('new GridHelper'), 'GridHelper 代码保留');

// 7. HighlightEffect 柔和化
const highlightSource = read('three/effects/HighlightEffect.ts');
assert(highlightSource.includes('color: 0x6ddcff'), '高亮颜色 0x6ddcff（冰蓝）');
assert(highlightSource.includes('opacity: 0.25'), '高亮透明度 0.25');
assert(highlightSource.includes('baseScale * 0.85'), '高亮缩放降低 15%');
assert(highlightSource.includes('PULSE'), '呼吸动画保留');
assert(!highlightSource.includes('ShaderMaterial') && !highlightSource.includes('EffectComposer'), '无 Shader/Composer');

// 8. 架构约束（静态 grep）
const threeTree = ['three/scenes/SolarScene.ts', 'three/effects/HighlightEffect.ts'];
let piniaFree = true;
for (const file of threeTree) {
  if (read(file).includes('pinia')) {
    piniaFree = false;
  }
}
assert(piniaFree, 'Three 层无 pinia 依赖');
assert(!universeViewSource.includes("from 'three'"), '视图层无 three import');

console.log(failures === 0 ? 'ALL PASS' : `FAILURES: ${failures}`);
process.exitCode = failures === 0 ? 0 : 1;
