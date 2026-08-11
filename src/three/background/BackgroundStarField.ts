import {
  BufferAttribute,
  BufferGeometry,
  Points,
  PointsMaterial,
} from 'three';
import type { ResourceManager } from '@/three/core/ResourceManager';

/** 星空点数（性能与密度平衡）。 */
export const STAR_COUNT = 3000;
/** 星空内层半径（相对单位，远大于最远轨道 32，保证稳定背景）。 */
const STAR_RADIUS_MIN = 260;
/** 星空外层半径。 */
const STAR_RADIUS_MAX = 480;
/** 慢速自转角速度（弧度/秒）：仅为视觉动感，不影响天体。 */
const STAR_ROTATION_SPEED = 0.005;
/** 固定随机种子：保证每次初始化星空分布一致（禁止运行期 Math.random）。 */
const STAR_SEED = 0x20260213;

/**
 * 固定种子伪随机数生成器（mulberry32）。
 * 确定性：同一 seed 产生完全相同的序列，星空每次加载一致。
 */
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 随机星空背景（Phase 2.13.3 起；Phase 2.17 拆分语义：随机背景层与真实恒星目录层分离）。
 *
 * 职责：创建固定分布的球壳星点（Points + BufferGeometry + PointsMaterial），
 * 作为太阳系场景的深空背景。
 *
 * 设计约束：
 * - 禁止 ShaderMaterial / EffectComposer；使用 Points + PointsMaterial。
 * - 3000 颗星，球形壳层分布（[260, 480] 半径），固定随机种子（mulberry32），
 *   每次初始化分布一致，禁止运行期 Math.random。
 * - 挂载到 scene（与 SolarSystemRoot 同级），不挂太阳系节点；
 *   星空随相机旋转呈现稳定背景（Points 挂 scene 原点，相机平移时相对转动）。
 * - 慢速自转（deltaTime 驱动，可选）：仅视觉动感，不影响天体运动。
 * - 交互隔离：userData.interactive = false，且不注册进
 *   PlanetManager.getSelectableObjects()。
 *
 * 资源所有权：BufferGeometry / PointsMaterial 登记到 ResourceManager 指定资源组，
 * 由 releaseGroup 统一释放；destroy 只移除节点并清空引用。
 */
export class BackgroundStarField {
  /** 星空点集（挂载到 scene 使用 points）。 */
  readonly points: Points;
  /** 星点几何（持有者：本类，释放权：ResourceManager）。 */
  readonly geometry: BufferGeometry;
  /** 星点材质（持有者：本类，释放权：ResourceManager）。 */
  readonly material: PointsMaterial;

  private readonly resources: ResourceManager;
  private readonly resourceGroup: string;
  private rotationAngle = 0;
  private destroyed = false;

  constructor(resources: ResourceManager, resourceGroup: string) {
    this.resources = resources;
    this.resourceGroup = resourceGroup;

    const positions = new Float32Array(STAR_COUNT * 3);
    const random = createSeededRandom(STAR_SEED);
    for (let index = 0; index < STAR_COUNT; index += 1) {
      // 球面均匀方向：theta ∈ [0, 2π)、cosPhi ∈ [-1, 1]（避免极点聚集）。
      const theta = random() * Math.PI * 2;
      const cosPhi = random() * 2 - 1;
      const sinPhi = Math.sqrt(1 - cosPhi * cosPhi);
      const radius = STAR_RADIUS_MIN + random() * (STAR_RADIUS_MAX - STAR_RADIUS_MIN);

      positions[index * 3] = radius * sinPhi * Math.cos(theta);
      positions[index * 3 + 1] = radius * cosPhi;
      positions[index * 3 + 2] = radius * sinPhi * Math.sin(theta);
    }

    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new BufferAttribute(positions, 3));

    this.material = new PointsMaterial({
      // Phase 2.20.2：背景星空更克制（更小、更暗、微蓝），不抢夺太阳系主体视觉。
      color: 0xd8e2ff,
      size: 1.0,
      // 恒定屏幕大小：星空点不随距离缩小，保持稳定观感。
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });

    this.points = new Points(this.geometry, this.material);
    this.points.name = 'star-field';
    // 交互隔离：星空不参与天体拾取（双保险：不注册 selectableObjects + 标记防误用）。
    this.points.userData.interactive = false;
    // 星空最先渲染，避免半透明星点覆盖天体。
    this.points.renderOrder = -1;

    this.resources.registerDisposable(this.resourceGroup, this.geometry);
    this.resources.registerDisposable(this.resourceGroup, this.material);
  }

  /** 慢速自转（deltaTime 驱动，可选）：仅为视觉动感，不影响天体。 */
  update(deltaTime: number): void {
    if (this.destroyed) {
      return;
    }
    if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
      return;
    }

    this.rotationAngle += deltaTime * STAR_ROTATION_SPEED;
    this.points.rotation.y = this.rotationAngle;
  }

  /** 幂等销毁：移除点集并清空引用（资源由 releaseGroup 统一释放）。 */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.points.removeFromParent();
    this.destroyed = true;
  }
}
