/**
 * Phase 2.19 运行断言（Node 数据层 + DOM mock 构造 Three 对象）：
 * 1. GalaxySelectableObject 数据（core + 4 臂 / 类型 / 描述）
 * 2. GalaxyRepository 查询接口
 * 3. GalaxyManager userData 标记（interactive / galaxyId / galaxyType）
 * 4. GalaxyHighlightEffect 接口与显示/隐藏
 * 5. GalaxyScene / GalaxyInteractionManager 接口存在（静态）
 * 6. Store 只保存字符串
 */
// ---- DOM mock：Node 无 document，提供最小 canvas 2D 上下文（仅构造期使用）----
const gradientStub = { addColorStop: () => undefined };
const contextStub = {
  createRadialGradient: () => gradientStub,
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  beginPath: () => undefined,
  moveTo: () => undefined,
  lineTo: () => undefined,
  stroke: () => undefined,
  fillRect: () => undefined,
  fill: () => undefined,
};
(globalThis as Record<string, unknown>).document = {
  createElement: () => ({
    width: 0,
    height: 0,
    getContext: () => contextStub,
  }),
};

import { galaxyRepository } from '../src/repositories/GalaxyRepository';
import { GalaxyManager } from '../src/three/galaxy/GalaxyManager';
import { GalaxyHighlightEffect } from '../src/three/effects/GalaxyHighlightEffect';
import { ResourceManager } from '../src/three/core/ResourceManager';
import { Object3D } from 'three';
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

// 1. GalaxySelectableObject 数据
const objects = galaxyRepository.getSelectableObjects();
assert(objects.length === 5, '可选择对象 5 个（core + 4 臂）');
const core = galaxyRepository.getSelectableObjectById('core');
assert(core?.type === 'core', 'core 类型 core');
assert(core?.displayName === '银河中心', 'core 显示名 银河中心');
assert(core !== undefined && core.description.length > 0, 'core 描述非空（黑洞区域说明）');
for (let index = 1; index <= 4; index += 1) {
  const arm = galaxyRepository.getSelectableObjectById(`arm-${index}`);
  assert(arm?.type === 'spiral-arm', `arm-${index} 类型 spiral-arm`);
  assert(arm !== undefined && arm.displayName.length > 0, `arm-${index} 显示名非空`);
  assert(arm !== undefined && arm.description.length > 0, `arm-${index} 描述非空（恒星形成区）`);
}
assert(galaxyRepository.getSelectableObjectById('unknown') === undefined, '未知对象 ID 返回 undefined');

// 2. GalaxyManager userData 标记（统一约定）
const resources = new ResourceManager();
const manager = new GalaxyManager(resources, 'galaxy');
const selectable = manager.getSelectableObjects();
assert(selectable.length === 5, 'GalaxyManager 可选对象 5 个');
assert(selectable[0]?.userData.interactive === true, 'core interactive=true');
assert(selectable[0]?.userData.galaxyId === 'core', 'core galaxyId=core');
assert(selectable[0]?.userData.galaxyType === 'core', 'core galaxyType=core');
for (let index = 1; index <= 4; index += 1) {
  const arm = selectable[index];
  assert(arm?.userData.interactive === true, `arm-${index} interactive=true`);
  assert(arm?.userData.galaxyId === `arm-${index}`, `arm-${index} galaxyId 对齐`);
  assert(arm?.userData.galaxyType === 'spiral-arm', `arm-${index} galaxyType=spiral-arm`);
}
assert(manager.getSelectableObject('core') !== undefined, 'getSelectableObject(core) 命中');
assert(manager.getSelectableObject('arm-3') !== undefined, 'getSelectableObject(arm-3) 命中');
assert(manager.getSelectableObject('unknown') === undefined, '未知 galaxyId 返回 undefined');

// 3. GalaxyHighlightEffect：显示/隐藏/更新
const highlightResources = new ResourceManager();
const highlight = new GalaxyHighlightEffect(highlightResources, 'galaxy');
const anchor = new Object3D();
anchor.position.set(10, 5, 20);
assert(highlight.isVisible() === false, '高亮初始隐藏');
highlight.show(anchor, 60);
assert(highlight.isVisible() === true, 'show 后可见');
highlight.update(0.1);
assert(anchor.position.distanceTo(highlight.getSprite().position) < 0.001, 'update 跟随目标位置');
highlight.hide();
assert(highlight.isVisible() === false, 'hide 后隐藏');
highlight.show(anchor, 60);
highlight.destroy();
highlight.destroy();
assert(true, 'destroy 幂等');
highlightResources.releaseGroup('galaxy');
highlightResources.releaseGroup('galaxy');
assert(true, 'releaseGroup("galaxy") 重复调用无异常');

// 4. GalaxyScene / GalaxyInteractionManager 接口存在（静态）
const sceneSource = await import('../src/three/scenes/GalaxyScene.ts');
assert(
  typeof sceneSource.GalaxyScene.prototype.setGalaxySelectedHandler === 'function',
  'GalaxyScene.setGalaxySelectedHandler 存在',
);
assert(
  typeof sceneSource.GalaxyScene.prototype.setInteractionEnabled === 'function',
  'GalaxyScene.setInteractionEnabled 存在',
);
assert(
  typeof sceneSource.GalaxyScene.prototype.getSelectedObject === 'function',
  'GalaxyScene.getSelectedObject 存在',
);
assert(
  typeof sceneSource.GalaxyScene.prototype.showGalaxyHighlight === 'function',
  'GalaxyScene.showGalaxyHighlight 存在',
);
assert(
  typeof sceneSource.GalaxyScene.prototype.hideGalaxyHighlight === 'function',
  'GalaxyScene.hideGalaxyHighlight 存在',
);
assert(
  typeof sceneSource.GalaxyScene.prototype.focusGalaxyObject === 'function',
  'GalaxyScene.focusGalaxyObject 存在',
);
const interactionSource = await import('../src/three/galaxy/GalaxyInteractionManager.ts');
assert(
  typeof interactionSource.GalaxyInteractionManager.prototype.setSelectableObjects === 'function',
  'GalaxyInteractionManager.setSelectableObjects 存在',
);
assert(
  typeof interactionSource.GalaxyInteractionManager.prototype.setEnabled === 'function',
  'GalaxyInteractionManager.setEnabled 存在',
);
assert(
  typeof interactionSource.GalaxyInteractionManager.prototype.destroy === 'function',
  'GalaxyInteractionManager.destroy 存在（移除监听）',
);

// 5. Store 只保存字符串
setActivePinia(createPinia());
const { useUniverseStore } = await import('../src/stores/universe.store.ts');
const store = useUniverseStore();
store.selectGalaxyObject('core');
assert(store.galaxySelectedId === 'core', 'selectGalaxyObject("core") 保存字符串');
assert(store.galaxyPanelVisible === true, '面板打开');
assert(typeof store.galaxySelectedId === 'string', 'Store 只保存 string（无 Object3D）');
store.clearGalaxySelection();
assert(store.galaxySelectedId === null, 'clearGalaxySelection 清空');

// 6. Coordinator 链路（onGalaxySelected / focusGalaxyObject 存在）
const coordinatorSource = await import('../src/app/ApplicationCoordinator.ts');
assert(
  typeof coordinatorSource.ApplicationCoordinator.prototype.onGalaxySelected === 'function',
  'Coordinator.onGalaxySelected 存在',
);
assert(
  typeof coordinatorSource.ApplicationCoordinator.prototype.focusGalaxyObject === 'function',
  'Coordinator.focusGalaxyObject 存在',
);

console.log(failures === 0 ? 'ALL PASS' : `FAILURES: ${failures}`);
process.exitCode = failures === 0 ? 0 : 1;
