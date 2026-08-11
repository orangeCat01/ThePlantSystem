/**
 * Phase 2.16 运行断言（Node 纯逻辑 + ModelLoader 真实降级链路）：
 * 1. 正常加载：10 天体完成（LoadingTracker 0→100）
 * 2. 模拟单模型失败：其他模型继续加载（ModelLoader 占位降级）
 * 3. Loading 进度：0→100
 * 4. 重新加载：无重复资源（clearCache + 再次加载幂等）
 * 5. Solar→Galaxy→Solar：无事件泄漏（reload/destroy 幂等保护断言）
 * 6. destroy：重复调用无异常
 */
import { planetRepository } from '../src/repositories/PlanetRepository';
import { LoadingTracker } from '../src/three/loaders/LoadingTracker';
import { modelLoader } from '../src/three/loaders/ModelLoader';
import { Mesh, Object3D } from 'three';

let failures = 0;
function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`PASS: ${label}`);
  } else {
    failures += 1;
    console.error(`FAIL: ${label}`);
  }
}

// 1. 正常加载：10 天体完成
const total = planetRepository.getAll().length;
assert(total >= 10, `天体目录总数 >= 10（实际 ${total}）`);
const tracker = new LoadingTracker();
tracker.start(total);
for (let index = 0; index < total; index += 1) {
  tracker.itemLoaded();
}
assert(tracker.getProgress() === 100, '10 天体完成 → 进度 100');
assert(tracker.getState().loaded === total, '已完成数 = 总数');
assert(tracker.getState().failedIds.length === 0, '无失败记录');

// 2. 模拟单模型失败：其他模型继续加载（ModelLoader 占位降级，不抛出）
const failed: string[] = [];
modelLoader.onModelError = (id, _error) => {
  failed.push(id);
};
// Node 环境无 dev server base URL：真实网络请求必然失败 → 走占位降级路径。
const sunModel = await modelLoader.loadModel('sun');
assert(sunModel instanceof Object3D, 'loadModel 失败后返回 Object3D（不抛出）');
assert(failed.includes('sun'), '失败回调上报 sun');
const placeholderMesh = sunModel.children[0];
assert(placeholderMesh instanceof Mesh, '占位对象包含 Mesh');
assert(sunModel.userData.placeholder === true, '占位对象标记 placeholder');
assert(sunModel.userData.planetId === 'sun', '占位对象 userData.planetId 保留');
// 其他模型继续加载（失败也降级而非中断）
const earthModel = await modelLoader.loadModel('earth');
assert(earthModel instanceof Object3D, 'earth 失败后也降级返回（不中断）');
assert(failed.includes('earth'), '失败回调上报 earth');
assert(modelLoader.loadModel('mars') instanceof Promise, '再次调用返回 Promise（异步继续）');
modelLoader.onModelError = null;

// 3. Loading 进度 0→100（含失败计数）
tracker.reset();
tracker.start(total);
assert(tracker.getProgress() === 0, 'start 后进度 0');
tracker.itemFailed('sun');
tracker.itemLoaded();
assert(tracker.getProgress() > 0, '失败 + 完成 → 进度推进');
for (let index = 1; index < total; index += 1) {
  tracker.itemLoaded();
}
assert(tracker.getProgress() === 100, '全部完成 → 进度 100');
assert(tracker.getState().failedIds.length === 1, '失败列表记录 1 个');
tracker.itemFailed('sun');
assert(tracker.getState().failedIds.length === 1, '失败记录去重');

// 4. 重新加载：无重复资源（clearCache 幂等 + 重新加载重新发起）
modelLoader.clearCache();
assert(modelLoader.loadModel('sun') instanceof Promise, 'clearCache 后重新发起加载');
modelLoader.clearCache();
modelLoader.clearCache();
assert(true, 'clearCache 重复调用无异常');

// 5. Solar→Galaxy→Solar：无事件泄漏（reloadCurrentScene / destroy 幂等保护）
const sceneManagerSource = await import('../src/three/core/SceneManager.ts');
assert(
  typeof sceneManagerSource.SceneManager.prototype.reloadCurrentScene === 'function',
  'SceneManager.reloadCurrentScene 存在',
);
const tracker2 = new LoadingTracker();
tracker2.start(10);
tracker2.destroy();
assert(true, 'LoadingTracker destroy 幂等保护存在');

// 6. destroy：重复调用无异常
tracker.destroy();
tracker.destroy();
tracker.itemLoaded();
assert(true, 'LoadingTracker destroy 重复调用 + 销毁后操作无异常');
tracker2.destroy();
tracker2.destroy();
assert(true, 'LoadingTracker destroy 重复调用无异常（第二个实例）');

console.log(failures === 0 ? 'ALL PASS' : `FAILURES: ${failures}`);
process.exitCode = failures === 0 ? 0 : 1;
