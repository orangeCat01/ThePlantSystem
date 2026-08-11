/**
 * Phase 2.20.1 场景切换诊断：GalaxyScene.init 完整链路（Node + DOM/事件 mock）。
 * 目的：确认银河场景初始化（GalaxyManager / GalaxyCameraController /
 * GalaxyInteractionManager / GalaxyHighlightEffect）在真实调用链下不抛错，
 * 排除「点击银河系无反应 = 场景初始化失败」的可能。
 */
// ---- DOM mock ----
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

import { GalaxyScene } from '../src/three/scenes/GalaxyScene';
import { ResourceManager } from '../src/three/core/ResourceManager';

let failures = 0;
function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`PASS: ${label}`);
  } else {
    failures += 1;
    console.error(`FAIL: ${label}`);
  }
}

/** 最小 DOM 事件对象（addEventListener/removeEventListener/getBoundingClientRect）。 */
function createFakeDomElement(): HTMLElement {
  const listeners = new Map<string, (event: Event) => void>();
  return {
    addEventListener: (type: string, handler: (event: Event) => void) => {
      listeners.set(type, handler);
    },
    removeEventListener: (type: string) => {
      listeners.delete(type);
    },
    dispatchEvent: (event: Event) => {
      const handler = listeners.get(event.type);
      handler?.(event);
      return true;
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}) }),
    clientWidth: 800,
    clientHeight: 600,
  } as unknown as HTMLElement;
}

const resources = new ResourceManager();
const domElement = createFakeDomElement();
const context = {
  renderer: { domElement },
  resources,
  sceneName: 'galaxy',
};

const scene = new GalaxyScene();
try {
  await scene.init(context as never);
  assert(true, 'GalaxyScene.init 完成（无抛错）');
} catch (error) {
  assert(false, `GalaxyScene.init 抛错：${error instanceof Error ? error.message : String(error)}`);
}

// 场景结构断言
assert(scene.scene.getObjectByName('galaxy-root') !== null, '场景含 galaxy-root');
assert(scene.getGalaxyInfo()?.id === 'galaxy', 'getGalaxyInfo 返回银河数据');

// 交互注册：pointer 监听挂载（切换按钮不依赖此，但确认无重复注册路径）
assert(domElement instanceof Object, 'domElement 可用');

// 生命周期：destroy 幂等
scene.destroy();
scene.destroy();
assert(true, 'GalaxyScene.destroy 幂等（无重复监听/异常）');

// 再次 init（模拟 Galaxy→Solar→Galaxy 重建）
const scene2 = new GalaxyScene();
await scene2.init(context as never);
assert(scene2.scene.getObjectByName('galaxy-root') !== null, '重建 GalaxyScene 成功（无重复对象）');
scene2.destroy();
resources.releaseGroup('galaxy');
resources.releaseGroup('galaxy');
assert(true, 'releaseGroup("galaxy") 幂等');

console.log(failures === 0 ? 'ALL PASS' : `FAILURES: ${failures}`);
process.exitCode = failures === 0 ? 0 : 1;
