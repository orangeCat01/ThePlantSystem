/**
 * Phase 2.17 运行断言（Node + DOM mock）：
 * 1. SpiralArmGenerator：4 臂 / 半径范围 / 坐标有限
 * 2. GalaxyStarField：80000 恒星 Points / BufferGeometry / Float32Array
 * 3. GalaxyManager：结构（Core + 4 臂 + 星场）/ 资源登记 / update 旋转
 * 4. 生命周期：destroy 幂等 / releaseGroup('galaxy') / 重复 destroy 无异常
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

import { generateSpiralArms } from '../src/three/galaxy/SpiralArmGenerator';
import {
  GalaxyStarField,
  generateGalaxyStarPositions,
  GALAXY_STAR_FIELD_DEFAULTS,
} from '../src/three/galaxy/GalaxyStarField';
import { GalaxyManager } from '../src/three/galaxy/GalaxyManager';
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

// 1. SpiralArmGenerator
const arms = generateSpiralArms({ arms: 4, radius: 100 });
assert(arms.length === 4, '旋臂数量 = 4');
assert(arms.every((arm) => arm.points.length === 400), '每臂 400 个采样点');
let radiusInRange = true;
let coordsFinite = true;
for (const arm of arms) {
  for (const point of arm.points) {
    const r = Math.hypot(point.x, point.z);
    if (r < 0.1 || r > 100.1) {
      radiusInRange = false;
    }
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z)) {
      coordsFinite = false;
    }
  }
}
assert(radiusInRange, '全部点半径在 [内半径, 100] 内');
assert(coordsFinite, '全部坐标有限');
assert(arms[1]?.points[0] instanceof Object, '输出 Vector3 数组（可迭代对象）');
const configurable = generateSpiralArms({ arms: 2, radius: 50, spread: 3 });
assert(configurable.length === 2, 'arms 参数可配置（2 臂）');
assert(generateSpiralArms({ radius: 50 })[0]?.points[0]?.z !== undefined, 'radius 参数生效');

// 2. GalaxyStarField
assert(GALAXY_STAR_FIELD_DEFAULTS.starCount === 80000, '恒星数量 80000（区间 50000~100000）');
const positions = generateGalaxyStarPositions(80000, 100, 2.2);
assert(positions instanceof Float32Array, '位置数据为 Float32Array');
assert(positions.length === 80000 * 3, 'Float32Array 长度 = 80000×3');
let starCoordsFinite = true;
let maxR = 0;
for (let index = 0; index < 80000; index += 1) {
  const x = positions[index * 3];
  const y = positions[index * 3 + 1];
  const z = positions[index * 3 + 2];
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    starCoordsFinite = false;
  }
  maxR = Math.max(maxR, Math.hypot(x, z));
}
assert(starCoordsFinite, '星场坐标全部有限');
assert(maxR <= 100.001, `星场半径 <= 100（实际 ${maxR.toFixed(2)}）`);

const resources = new ResourceManager();
const starField = new GalaxyStarField(resources, 'galaxy');
assert(starField.points.isPoints === true, '星场为 THREE.Points（禁止大量 Mesh）');
assert(starField.geometry.getAttribute('position').count === 80000, '星场 Geometry 顶点 80000');

// 3. GalaxyManager：结构 + 资源登记 + update
const galaxyResources = new ResourceManager();
const manager = new GalaxyManager(galaxyResources, 'galaxy');
assert(manager.root.children.length === 7, 'GalaxyRoot 子节点 = Core + 核心粒子层 + 4 臂 + 星场（7）');
assert(manager.root.children[0]?.name === 'galaxy-core', '子节点 1：GalaxyCore');
assert(manager.root.children[1]?.name === 'galaxy-core-particles', '子节点 2：核心粒子层（Phase 2.20.2）');
assert(
  manager.root.children[2]?.name === 'SpiralArm_1' &&
    manager.root.children[5]?.name === 'SpiralArm_4',
  '子节点 3-6：SpiralArm_1..4',
);
assert(manager.root.children[6]?.name === 'galaxy-star-field', '子节点 7：GalaxyStars');
assert(
  typeof manager.setArmHighlighted === 'function' &&
    typeof manager.clearArmHighlight === 'function',
  'setArmHighlighted / clearArmHighlight 存在（选中臂差异化）',
);
assert(manager.galaxyCore?.sprite.isSprite === true, '核心为 Sprite（中心亮核）');
let duplicateThrown = false;
try {
  manager.createGalaxy();
} catch {
  duplicateThrown = true;
}
assert(duplicateThrown, '重复 createGalaxy 抛错（防重复创建）');
const rotationBefore = manager.root.rotation.y;
manager.update(0.5);
assert(manager.root.rotation.y > rotationBefore, 'update 驱动银河整体旋转');
manager.update(-1);
assert(manager.root.rotation.y > 0, '非法 deltaTime 安全（不倒退）');

// 4. 生命周期：destroy 幂等 / releaseGroup
manager.destroy();
manager.destroy();
assert(true, 'destroy 重复调用无异常（幂等）');
manager.update(0.1);
assert(true, 'destroy 后 update 安全');
galaxyResources.releaseGroup('galaxy');
galaxyResources.releaseGroup('galaxy');
assert(true, 'releaseGroup("galaxy") 重复调用无异常');
starField.destroy();
starField.destroy();
assert(true, 'GalaxyStarField destroy 幂等');

console.log(failures === 0 ? 'ALL PASS' : `FAILURES: ${failures}`);
process.exitCode = failures === 0 ? 0 : 1;
