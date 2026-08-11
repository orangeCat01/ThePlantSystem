/**
 * 银河系管理器（Phase 2.17 / 2.20.2）。
 *
 * 职责：组装银河系视觉对象（中心亮核 + 核心粒子层 + 4 条旋臂粒子 + 星盘恒星场），
 * 统一旋转动画与生命周期。
 *
 * 层级（GalaxyRoot 独立，不挂 SolarSystemRoot）：
 *   Scene
 *    └── GalaxyRoot
 *         ├── GalaxyCore（Sprite 暖黄亮核）
 *         ├── CoreParticles（Points：金色密集核心粒子层，Phase 2.20.2）
 *         ├── SpiralArm_1..4（每臂一个 Points，对数螺旋分布，可选中提亮）
 *         └── GalaxyStars（Points 星盘恒星场，背景盘层）
 *
 * 视觉分层（Phase 2.20.2）：核心亮暖密集 → 旋臂清晰蓝白 → 背景盘稀疏暗淡；
 * 每粒子 attributes（aSize/aColor/aAlpha）实现大小/颜色/透明度层次。
 * 选中银河臂时该臂 uSizeScale/uBrightness 提亮（事件级更新，非每帧）。
 *
 * 资源：全部 Geometry/Material/Texture 登记 ResourceManager 指定资源组（'galaxy'），
 * 由 releaseGroup 统一释放；destroy 只移除节点并清空引用（幂等）。
 *
 * 性能：全部数据在 createGalaxy 时一次性生成；update 只旋转 GalaxyRoot
 * 与透传子模块（无每帧分配，无 new Vector3 / Array / Object）。
 */
import {
  BufferGeometry,
  Float32BufferAttribute,
  Object3D,
  Points,
  type ShaderMaterial,
} from 'three';
import type { ResourceManager } from '@/three/core/ResourceManager';
import { GalaxyCore } from './GalaxyCore';
import { GalaxyStarField } from './GalaxyStarField';
import {
  generateSpiralArms,
  type SpiralArmData,
  type SpiralArmOptions,
} from './SpiralArmGenerator';
import {
  createGalaxyParticleMaterial,
  createParticleAlphaAttribute,
  createParticleColorAttribute,
  createParticleSizeAttribute,
} from './galaxyParticleMaterial';

/** 旋臂粒子数（每臂）。 */
const ARM_PARTICLE_COUNT = 6000;
/** 核心粒子层数量（Phase 2.20.2：密集暖核）。 */
const CORE_PARTICLE_COUNT = 15000;
/** 核心粒子层半径（场景单位）。 */
const CORE_PARTICLE_RADIUS = 17;
/** 核心粒子层厚度（扁核）。 */
const CORE_PARTICLE_THICKNESS = 0.9;
/** 银河整体自转速度（弧度/秒，慢转演示）。 */
const GALAXY_ROTATION_SPEED = 0.02;
/** 旋臂粒子颜色（蓝白色调，略偏冷以区分星盘）。 */
const ARM_COLOR = 0x9fc8ff;
/** 旋臂粒子颜色抖动。 */
const ARM_COLOR_JITTER = 0.1;
/** 旋臂粒子尺寸区间。 */
const ARM_SIZE_MIN = 0.8;
const ARM_SIZE_MAX = 1.8;
/** 旋臂粒子透明度区间。 */
const ARM_ALPHA_MIN = 0.7;
const ARM_ALPHA_MAX = 1;
/** 核心粒子颜色（暖金黄）。 */
const CORE_PARTICLE_COLOR = 0xffd9a0;
/** 核心粒子颜色抖动。 */
const CORE_PARTICLE_COLOR_JITTER = 0.08;
/** 核心粒子尺寸区间。 */
const CORE_SIZE_MIN = 0.6;
const CORE_SIZE_MAX = 1.6;
/** 核心粒子透明度区间。 */
const CORE_ALPHA_MIN = 0.6;
const CORE_ALPHA_MAX = 1;
/** 选中旋臂的提亮参数（事件级更新）。 */
const ARM_HIGHLIGHT_SIZE_SCALE = 1.9;
const ARM_HIGHLIGHT_BRIGHTNESS = 1.35;

export interface GalaxyCreateOptions {
  /** 旋臂生成参数（默认 4 臂 / 半径 100）。 */
  readonly arms?: SpiralArmOptions;
}

export class GalaxyManager {
  /** 银河根节点（挂 scene 使用；独立层级）。 */
  readonly root: Object3D;
  /** 中心亮核（createGalaxy 后可用）。 */
  galaxyCore: GalaxyCore | null = null;
  /** 核心粒子层（createGalaxy 后可用）。 */
  coreParticles: Points<BufferGeometry, ShaderMaterial> | null = null;
  /** 星盘恒星场（createGalaxy 后可用）。 */
  galaxyStarField: GalaxyStarField | null = null;
  /** 旋臂粒子系统（SpiralArm_1..4；仅用于生命周期与调试）。 */
  readonly armPoints: { readonly name: string; readonly points: Points }[] = [];

  private readonly resources: ResourceManager;
  private readonly resourceGroup: string;
  private readonly rotationSpeed: number;
  private destroyed = false;

  constructor(
    resources: ResourceManager,
    resourceGroup: string,
    options: GalaxyCreateOptions = {},
  ) {
    this.resources = resources;
    this.resourceGroup = resourceGroup;
    this.rotationSpeed = GALAXY_ROTATION_SPEED;

    this.root = new Object3D();
    this.root.name = 'galaxy-root';
    this.root.userData.interactive = false;

    this.createGalaxy(options);
  }

  /** 组装银河视觉对象（一次性初始化；重复调用抛错防重复创建）。 */
  createGalaxy(options: GalaxyCreateOptions = {}): void {
    if (this.destroyed) {
      throw new Error('GalaxyManager 已销毁，无法创建银河。');
    }
    if (this.root.children.length > 0) {
      throw new Error('GalaxyManager 已创建银河，禁止重复创建。');
    }

    // 中心亮核（暖黄；Phase 2.19 可交互：统一 userData 约定）。
    this.galaxyCore = new GalaxyCore(this.resources, this.resourceGroup);
    this.galaxyCore.sprite.userData.interactive = true;
    this.galaxyCore.sprite.userData.galaxyId = 'core';
    this.galaxyCore.sprite.userData.galaxyType = 'core';
    this.root.add(this.galaxyCore.sprite);

    // 核心粒子层（Phase 2.20.2：金色密集暖核；不可交互）。
    this.coreParticles = this.createCoreParticles();
    this.root.add(this.coreParticles);

    // 旋臂（4 条，对数螺旋 + 粒子化；Phase 2.19 可交互：统一 userData 约定）。
    const armData = generateSpiralArms(options.arms);
    armData.forEach((arm, armIndex) => {
      const points = this.createArmPoints(arm, armIndex);
      points.userData.interactive = true;
      points.userData.galaxyId = `arm-${armIndex + 1}`;
      points.userData.galaxyType = 'spiral-arm';
      this.root.add(points);
      this.armPoints.push({ name: `SpiralArm_${armIndex + 1}`, points });
    });

    // 星盘恒星场（蓝白星点，背景盘层）。
    this.galaxyStarField = new GalaxyStarField(this.resources, this.resourceGroup);
    this.root.add(this.galaxyStarField.points);
  }

  /** 每帧更新（AnimationManager 驱动）：银河整体慢转 + 子模块透传。 */
  update(deltaTime: number): void {
    if (this.destroyed) {
      return;
    }
    if (Number.isFinite(deltaTime) && deltaTime > 0) {
      this.root.rotation.y += this.rotationSpeed * Math.min(deltaTime, 1);
    }
    this.galaxyCore?.update(deltaTime);
    this.galaxyStarField?.update(deltaTime);
  }

  /**
   * 选中/取消选中银河臂（Phase 2.20.2 区域差异化）：
   * 选中臂粒子尺寸放大 + 亮度提高（事件级 uniform 更新，非每帧），
   * 使被选区域在画面中明显区别于未选区域。
   */
  setArmHighlighted(galaxyId: string, highlighted: boolean): void {
    const arm = this.armPoints[Number(galaxyId.replace('arm-', '')) - 1];
    if (!arm) {
      return;
    }
    const material = arm.points.material as ShaderMaterial | null;
    const sizeUniform = material?.uniforms.uSizeScale;
    const brightnessUniform = material?.uniforms.uBrightness;
    if (!material || !sizeUniform || !brightnessUniform) {
      return;
    }
    sizeUniform.value = highlighted ? ARM_HIGHLIGHT_SIZE_SCALE : 1;
    brightnessUniform.value = highlighted ? ARM_HIGHLIGHT_BRIGHTNESS : 1;
  }

  /** 清除全部旋臂高亮（Phase 2.20.2；取消选择时调用）。 */
  clearArmHighlight(): void {
    for (const arm of this.armPoints) {
      const material = arm.points.material as ShaderMaterial | null;
      const sizeUniform = material?.uniforms.uSizeScale;
      const brightnessUniform = material?.uniforms.uBrightness;
      if (!material || !sizeUniform || !brightnessUniform) {
        continue;
      }
      sizeUniform.value = 1;
      brightnessUniform.value = 1;
    }
  }

  /** 可拾取对象列表（Phase 2.19：GalaxyCore + 4 条 SpiralArm；供 GalaxyInteractionManager 注册）。 */
  getSelectableObjects(): Object3D[] {
    const objects: Object3D[] = [];
    if (this.galaxyCore) {
      objects.push(this.galaxyCore.sprite);
    }
    this.armPoints.forEach((arm) => objects.push(arm.points));
    return objects;
  }

  /** 按 galaxyId 查询可选对象（'core' / 'arm-1'..'arm-4'）；未知 ID 返回 undefined。 */
  getSelectableObject(galaxyId: string): Object3D | undefined {
    if (galaxyId === 'core') {
      return this.galaxyCore?.sprite ?? undefined;
    }
    const arm = this.armPoints[Number(galaxyId.replace('arm-', '')) - 1];
    return arm?.points ?? undefined;
  }

  /** 幂等销毁：移除根节点并清空引用（Geometry/Material/Texture 由 releaseGroup 统一释放）。 */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.root.removeFromParent();
    this.armPoints.length = 0;
    this.galaxyCore = null;
    this.coreParticles = null;
    this.galaxyStarField = null;
    this.destroyed = true;
  }

  /** 创建核心粒子层（Phase 2.20.2：暖金黄、密集、扁核；一次性生成）。 */
  private createCoreParticles(): Points<BufferGeometry, ShaderMaterial> {
    const count = CORE_PARTICLE_COUNT;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      // 内密外疏：平方根分布 + 高斯扁核。
      const r = Math.sqrt(Math.random()) * CORE_PARTICLE_RADIUS;
      const theta = Math.random() * Math.PI * 2;
      const y = gaussian() * CORE_PARTICLE_THICKNESS;
      positions[index * 3] = Math.cos(theta) * r;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = Math.sin(theta) * r;
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute(
      'aSize',
      new Float32BufferAttribute(
        createParticleSizeAttribute(count, CORE_SIZE_MIN, CORE_SIZE_MAX),
        1,
      ),
    );
    geometry.setAttribute(
      'aColor',
      new Float32BufferAttribute(
        createParticleColorAttribute(count, CORE_PARTICLE_COLOR, CORE_PARTICLE_COLOR_JITTER),
        3,
      ),
    );
    geometry.setAttribute(
      'aAlpha',
      new Float32BufferAttribute(
        createParticleAlphaAttribute(count, CORE_ALPHA_MIN, CORE_ALPHA_MAX),
        1,
      ),
    );
    this.resources.registerDisposable(this.resourceGroup, geometry);

    const material = createGalaxyParticleMaterial({ opacity: 1 });
    this.resources.registerDisposable(this.resourceGroup, material);

    const points = new Points(geometry, material);
    points.name = 'galaxy-core-particles';
    points.frustumCulled = false;
    return points;
  }

  /** 创建单条旋臂粒子系统：沿对数螺旋曲线采样 + 高斯扰动（一次性生成）。 */
  private createArmPoints(arm: SpiralArmData, armIndex: number): Points {
    const count = ARM_PARTICLE_COUNT;
    const positions = new Float32Array(count * 3);
    const curve = arm.points;
    const curveCount = curve.length;

    for (let index = 0; index < count; index += 1) {
      // 随机采样曲线参数 t，沿曲线聚集。
      const t = Math.random();
      const curveIndex = Math.min(Math.floor(t * curveCount), curveCount - 1);
      const point = curve[curveIndex];
      if (!point) {
        continue;
      }
      // 沿曲线附近的径向扰动（保持旋臂聚集感）。
      const radial = gaussian() * 1.8;
      const vertical = gaussian() * 0.9;
      const r = Math.hypot(point.x, point.z) + radial;
      const theta = Math.atan2(point.z, point.x);
      positions[index * 3] = Math.cos(theta) * Math.max(r, 0.1);
      positions[index * 3 + 1] = point.y + vertical;
      positions[index * 3 + 2] = Math.sin(theta) * Math.max(r, 0.1);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    // Phase 2.20.2：每粒子 attributes（大小随机、蓝白微变、亮度层次）。
    geometry.setAttribute(
      'aSize',
      new Float32BufferAttribute(
        createParticleSizeAttribute(count, ARM_SIZE_MIN, ARM_SIZE_MAX),
        1,
      ),
    );
    geometry.setAttribute(
      'aColor',
      new Float32BufferAttribute(
        createParticleColorAttribute(count, ARM_COLOR, ARM_COLOR_JITTER),
        3,
      ),
    );
    geometry.setAttribute(
      'aAlpha',
      new Float32BufferAttribute(
        createParticleAlphaAttribute(count, ARM_ALPHA_MIN, ARM_ALPHA_MAX),
        1,
      ),
    );
    this.resources.registerDisposable(this.resourceGroup, geometry);

    // Phase 2.20.3：圆形粒子（片元着色器距离场）；Phase 2.20.2：选中臂提亮 uniform。
    const material = createGalaxyParticleMaterial({ opacity: 1 });
    this.resources.registerDisposable(this.resourceGroup, material);

    const points = new Points(geometry, material);
    points.name = `SpiralArm_${armIndex + 1}`;
    points.frustumCulled = false;
    return points;
  }
}

/** 标准正态分布近似（Box-Muller；仅初始化期调用）。 */
function gaussian(): number {
  const u = Math.max(Math.random(), Number.EPSILON);
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
