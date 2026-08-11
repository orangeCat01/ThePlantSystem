/**
 * 银河恒星场（Phase 2.17 / 2.20.2）。
 *
 * 职责：生成银河星盘的恒星粒子系统（背景盘/外围恒星层）。
 * - 使用 THREE.Points + BufferGeometry + Float32Array（禁止大量 Mesh）。
 * - 数量 50000~100000 颗（默认 80000）。
 * - 分布：圆盘（disk）——半径方向中心密外缘疏（平方根分布），薄盘厚度随半径，
 *   颜色统一蓝白星点（中心亮核由 GalaxyCore 负责，暖黄色）。
 * - Phase 2.20.2 分层视觉：每粒子 aSize / aColor / aAlpha attributes
 *   （尺寸随机、蓝白微变、透明度体现疏密层次），盘更薄更暗更自然。
 *
 * 资源所有权：Geometry / Material 登记 ResourceManager 指定资源组（'galaxy'），
 * 由 releaseGroup 统一释放；destroy 只移除节点并清空引用。
 */
import {
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  type ShaderMaterial,
} from 'three';
import type { ResourceManager } from '@/three/core/ResourceManager';
import {
  createGalaxyParticleMaterial,
  createParticleAlphaAttribute,
  createParticleColorAttribute,
  createParticleSizeAttribute,
} from './galaxyParticleMaterial';

/** 恒星数量（50000~100000 区间内）。 */
const STAR_COUNT = 80000;
/** 星盘半径。 */
const DISK_RADIUS = 100;
/** 盘中心厚度（Phase 2.20.2：更薄更扁）。 */
const DISK_THICKNESS = 1.4;
/** 每粒子尺寸区间（背景盘：偏小、层次随机）。 */
const STAR_SIZE_MIN = 0.4;
const STAR_SIZE_MAX = 1.1;
/** 每粒子透明度区间（外围更暗：疏密层次）。 */
const STAR_ALPHA_MIN = 0.35;
const STAR_ALPHA_MAX = 0.8;
/** 粒子基色（蓝白）与抖动。 */
const STAR_COLOR = 0xa8c4ff;
const STAR_COLOR_JITTER = 0.12;

/**
 * 生成星盘恒星位置（纯数据：一次性初始化调用，返回 Float32Array(x,y,z 交错)）。
 * 导出便于独立验证（无 Three 依赖）。
 */
export function generateGalaxyStarPositions(
  count: number,
  radius: number,
  thickness: number,
): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    // 平方根分布：中心密、外缘疏。
    const r = Math.sqrt(Math.random()) * radius;
    const theta = Math.random() * Math.PI * 2;
    // 薄盘：垂直扰动随半径增大而略微增厚（保持盘面感）。
    const y = gaussian() * thickness * (0.5 + (r / radius) * 0.6);
    positions[index * 3] = Math.cos(theta) * r;
    positions[index * 3 + 1] = y;
    positions[index * 3 + 2] = Math.sin(theta) * r;
  }
  return positions;
}

/** 标准正态分布近似（Box-Muller；仅初始化期调用）。 */
function gaussian(): number {
  const u = Math.max(Math.random(), Number.EPSILON);
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export class GalaxyStarField {
  /** 恒星粒子系统（挂 GalaxyRoot 使用）。 */
  readonly points: Points<BufferGeometry, ShaderMaterial>;
  readonly geometry: BufferGeometry;

  private readonly resources: ResourceManager;
  private readonly resourceGroup: string;
  private destroyed = false;

  constructor(resources: ResourceManager, resourceGroup: string) {
    this.resources = resources;
    this.resourceGroup = resourceGroup;

    this.geometry = new BufferGeometry();
    const positions = generateGalaxyStarPositions(STAR_COUNT, DISK_RADIUS, DISK_THICKNESS);
    this.geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    // Phase 2.20.2：每粒子大小 / 颜色 / 透明度 attributes（分层视觉，一次性生成）。
    this.geometry.setAttribute(
      'aSize',
      new Float32BufferAttribute(
        createParticleSizeAttribute(STAR_COUNT, STAR_SIZE_MIN, STAR_SIZE_MAX),
        1,
      ),
    );
    this.geometry.setAttribute(
      'aColor',
      new Float32BufferAttribute(
        createParticleColorAttribute(STAR_COUNT, STAR_COLOR, STAR_COLOR_JITTER),
        3,
      ),
    );
    this.geometry.setAttribute(
      'aAlpha',
      new Float32BufferAttribute(
        createParticleAlphaAttribute(STAR_COUNT, STAR_ALPHA_MIN, STAR_ALPHA_MAX),
        1,
      ),
    );
    this.resources.registerDisposable(this.resourceGroup, this.geometry);

    // Phase 2.20.3：圆形粒子（片元着色器距离场），替代默认方形 PointsMaterial。
    const material = createGalaxyParticleMaterial({ opacity: 1 });
    this.resources.registerDisposable(this.resourceGroup, material);

    this.points = new Points(this.geometry, material);
    this.points.name = 'galaxy-star-field';
    this.points.frustumCulled = false;
  }

  /** 每帧更新：星场随 GalaxyRoot 整体旋转（无独立动画），接口保留。 */
  update(_deltaTime: number): void {
    return;
  }

  /** 幂等销毁：移除节点并清空引用（Geometry/Material 由 releaseGroup 统一释放）。 */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.points.removeFromParent();
    this.destroyed = true;
  }
}

/** 供断言/外部引用的默认参数（保持单一数据源）。 */
export const GALAXY_STAR_FIELD_DEFAULTS = {
  starCount: STAR_COUNT,
  diskRadius: DISK_RADIUS,
  diskThickness: DISK_THICKNESS,
} as const;
