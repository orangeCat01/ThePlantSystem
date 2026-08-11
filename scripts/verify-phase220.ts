/**
 * Phase 2.20 运行断言（Node 数据/状态层 + 静态布局契约）：
 * 1. Store overlay 状态：默认值 / set / toggle / reset
 * 2. OverlayManager：isVisible / setVisible / toggle / applyScenePreset（solar/galaxy）
 * 3. OverlayManager 不控制 Three（无 three 依赖）
 * 4. BaseInfoCard / OverlayContainer 组件存在（无 three import）
 * 5. UniverseView 全屏布局契约（exploration-root / overlay-layer 分区）
 * 6. Coordinator.switchScene 接入场景预设
 */
import { createPinia, setActivePinia } from 'pinia';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

// 1. Store overlay 状态
setActivePinia(createPinia());
const { useUniverseStore, DEFAULT_OVERLAY_PANELS } = await import('../src/stores/universe.store.ts');
const store = useUniverseStore();
assert(DEFAULT_OVERLAY_PANELS.simulation === false, '默认收起：simulation（Phase 2.20.2）');
assert(DEFAULT_OVERLAY_PANELS.time === false, '默认收起：time（Phase 2.20.2）');
assert(DEFAULT_OVERLAY_PANELS.observation === false, '默认收起：observation');
assert(DEFAULT_OVERLAY_PANELS.mode === false, '默认收起：mode（Phase 2.20.2）');
assert(DEFAULT_OVERLAY_PANELS.search === false, '默认收起：search（Phase 2.20.2）');
assert(DEFAULT_OVERLAY_PANELS.mission === false, '默认收起：mission');
assert(DEFAULT_OVERLAY_PANELS.telescope === false, '默认收起：telescope');
assert(store.overlayPanels.mission === false, 'Store 初始 mission=false');
assert(store.overlayPanels.simulation === false, 'Store 初始 simulation=false（默认收起）');
store.setOverlayPanel('mission', true);
assert(store.overlayPanels.mission === true, 'setOverlayPanel 打开 mission');
store.toggleOverlayPanel('mission');
assert(store.overlayPanels.mission === false, 'toggleOverlayPanel 关闭 mission');
store.toggleOverlayPanel('unknown-key');
assert(store.overlayPanels['unknown-key'] === undefined, '未知 key 安全忽略');
store.resetOverlayPanels({ ...DEFAULT_OVERLAY_PANELS });
assert(store.overlayPanels.simulation === false, 'resetOverlayPanels 恢复默认（全部收起）');
const serializable = JSON.parse(JSON.stringify(store.overlayPanels));
assert(typeof serializable === 'object' && serializable !== null, 'overlay 状态可序列化（只含 boolean）');

// 2. OverlayManager
const { overlayManager } = await import('../src/app/OverlayManager.ts');
assert(overlayManager.isVisible('simulation') === false, 'OverlayManager.isVisible 默认 false（全部收起）');
overlayManager.setVisible('simulation', false);
assert(store.overlayPanels.simulation === false, 'OverlayManager.setVisible 生效');
overlayManager.toggle('simulation');
assert(store.overlayPanels.simulation === true, 'OverlayManager.toggle 生效');
overlayManager.applyScenePreset('galaxy');
assert(store.overlayPanels.simulation === false, 'Galaxy 预设：关闭 simulation');
assert(store.overlayPanels.time === false, 'Galaxy 预设：关闭 time');
assert(store.overlayPanels.mission === false, 'Galaxy 预设：关闭 mission');
assert(store.overlayPanels.telescope === false, 'Galaxy 预设：关闭 telescope');
assert(store.overlayPanels.search === true, 'Galaxy 预设：保留 search');
overlayManager.applyScenePreset('solar');
assert(
  store.overlayPanels.simulation === false && store.overlayPanels.time === false,
  'Solar 预设：全部控制卡默认收起（Phase 2.20.2）',
);

// 3. OverlayManager 不控制 Three
const overlayManagerSource = readFileSync(resolve(srcRoot, 'app/OverlayManager.ts'), 'utf-8');
assert(!overlayManagerSource.includes("from 'three'"), 'OverlayManager 无 three 依赖（不控制 Three）');

// 4. BaseInfoCard / OverlayContainer 组件（存在 + 无 three import）
const baseCardSource = readFileSync(resolve(srcRoot, 'components/overlay/BaseInfoCard.vue'), 'utf-8');
assert(baseCardSource.includes('panelKey'), 'BaseInfoCard 支持 panelKey prop');
assert(baseCardSource.includes('<slot'), 'BaseInfoCard 支持 slot');
assert(!baseCardSource.includes("from 'three'"), 'BaseInfoCard 无 three import');
const overlayContainerSource = readFileSync(
  resolve(srcRoot, 'components/overlay/OverlayContainer.vue'),
  'utf-8',
);
assert(overlayContainerSource.includes('__top'), 'OverlayContainer 含 TopBar 区');
assert(overlayContainerSource.includes('__left'), 'OverlayContainer 含 LeftPanel 区');
assert(overlayContainerSource.includes('__right'), 'OverlayContainer 含 RightPanel 区');
assert(overlayContainerSource.includes('__bottom'), 'OverlayContainer 含 BottomPanel 区');
assert(!overlayContainerSource.includes("from 'three'"), 'OverlayContainer 无 three import');

// 5. UniverseView 全屏布局契约
const universeViewSource = readFileSync(resolve(srcRoot, 'views/UniverseView.vue'), 'utf-8');
assert(universeViewSource.includes('exploration-root'), 'UniverseView 使用 exploration-root');
assert(universeViewSource.includes('OverlayContainer'), 'UniverseView 挂载 OverlayContainer');
assert(universeViewSource.includes('SceneViewport'), 'UniverseView 保留 SceneViewport（Canvas 层）');
assert(universeViewSource.includes('LoadingScreen'), 'UniverseView 保留 LoadingScreen');
assert(!universeViewSource.includes('universe-view__grid'), '旧 grid 布局已移除');
assert(!universeViewSource.includes('universe-view__controls'), '旧右侧占位已移除');

// 6. Coordinator.switchScene 接入场景预设
const coordinatorSource = readFileSync(resolve(srcRoot, 'app/ApplicationCoordinator.ts'), 'utf-8');
assert(coordinatorSource.includes('overlayManager.applyScenePreset'), 'switchScene 调用场景预设');

console.log(failures === 0 ? 'ALL PASS' : `FAILURES: ${failures}`);
process.exitCode = failures === 0 ? 0 : 1;
