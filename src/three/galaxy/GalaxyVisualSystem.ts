/**
 * 银河视觉系统（Phase 2.20 视觉迁移）。
 *
 * 职责：组装参考博客算法生成的银河视觉（核心亮核 + 4 条旋臂粒子 +
 * 背景盘粒子 + 星云尘埃层），统一旋转动画、区域高亮与生命周期。
 *
 * 架构约束：
 * - 不创建 Scene / Camera / Renderer / OrbitControls / RAF（由 GalaxyScene /
 *   AnimationManager / ResourceManager 负责）。
 * - 不使用 ShaderMaterial / EffectComposer；保留 PointsMaterial（圆形贴图 map +
 *   vertexColors + AdditiveBlending），Phase 2.21 通过 GalaxyStarMaterial 的
 *   onBeforeCompile 注入微型闪烁/核心活性效果（非 ShaderMaterial 管线）。
 * - 资源统一 registerDisposable('galaxy')，由 releaseGroup 统一释放。
 * - 区域高亮：选中旋臂时对该臂顶点色提亮（事件级 attribute 更新，非每帧）。
 * - 动态效果：uTime 每帧一次浮点累加（AnimationManager 驱动），零 CPU 粒子循环。
 *
 * 层级：
 *   GalaxyRoot
 *    ├── GalaxyCore（Sprite 暖黄亮核，中心高亮）
 *    ├── SpiralArm_1..4（Points，博客螺旋臂算法，橙→蓝渐变，可交互可提亮）
 *    ├── GalaxyDisk（Points，背景盘：大扰动暗色渐变，外围稀疏）
 *    └── GalaxyDust（Points，星云尘埃：大尺寸暗色弥散层）
 */
import {
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  Object3D,
  Points,
  type PointsMaterial,
  SRGBColorSpace,
} from 'three';
import type { ResourceManager } from '@/three/core/ResourceManager';
import { GalaxyCore } from './GalaxyCore';
import { generateGalaxyParticles } from './GalaxyParticleGenerator';
import { generateGalaxyDust } from './GalaxyDustGenerator';
import { createGalaxyStarMaterial, type GalaxyTwinkleRuntime } from './GalaxyStarMaterial';

/** 银河盘半径（场景单位）。 */
const GALAXY_RADIUS = 100;
/** 旋臂数量（任务要求 4 条以上）。 */
const ARM_COUNT = 4;
/** 每臂粒子数。 */
const ARM_PARTICLE_COUNT = 6000;
/** 背景盘粒子数。 */
const DISK_PARTICLE_COUNT = 30000;
/** 星云尘埃粒子数。 */
const DUST_PARTICLE_COUNT = 8000;
/** 银河整体自转速度（弧度/秒，慢转演示）。 */
const GALAXY_ROTATION_SPEED = 0.02;

/** 博客颜色：核心橙红 / 外围深蓝。 */
const ARM_INSIDE_COLOR = 0xff6030;
const ARM_OUTSIDE_COLOR = 0x1b3984;
/** 背景盘颜色（更暗：暗橙 → 暗蓝）。 */
const DISK_INSIDE_COLOR = 0x77432a;
const DISK_OUTSIDE_COLOR = 0x141b4a;
/** 尘埃颜色（暗蓝紫）。 */
const DUST_COLOR = 0x141b3c;

/** 选中旋臂提亮倍率（顶点色 × 倍率，钳制到 1）。 */
const ARM_HIGHLIGHT_FACTOR = 1.6;

/** Phase 2.21 各层闪烁/核心活性参数（星星非同步闪烁；核心区域更活跃）。 */
interface LayerTwinkleOptions {
  readonly twinkleSpeed: number;
  readonly twinkleAmplitude: number;
  readonly coreRadius: number;
  readonly coreBoost: number;
}
/** 旋臂：活跃闪烁（速度 1.5、幅度 0.18、核心加成 0.12）。 */
const ARM_TWINKLE: LayerTwinkleOptions = { twinkleSpeed: 1.5, twinkleAmplitude: 0.18, coreRadius: 30, coreBoost: 0.12 };
/** 背景盘：微弱闪烁（速度 1.0、幅度 0.08、核心加成 0.06）。 */
const DISK_TWINKLE: LayerTwinkleOptions = { twinkleSpeed: 1.0, twinkleAmplitude: 0.08, coreRadius: 30, coreBoost: 0.06 };
/** 尘埃：静态（星云不闪；零注入开销）。 */
const DUST_TWINKLE: LayerTwinkleOptions = { twinkleSpeed: 0, twinkleAmplitude: 0, coreRadius: 0, coreBoost: 0 };

/** 粒子贴图尺寸。 */
const PARTICLE_TEXTURE_SIZE = 64;

/** 生成圆形粒子贴图（径向白圆渐变；PointsMaterial map 使用，无需 ShaderMaterial）。 */
function createParticleTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = PARTICLE_TEXTURE_SIZE;
  canvas.height = PARTICLE_TEXTURE_SIZE;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('无法创建 2D 上下文，银河粒子贴图生成失败。');
  }
  const center = PARTICLE_TEXTURE_SIZE / 2;
  const gradient = context.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, PARTICLE_TEXTURE_SIZE, PARTICLE_TEXTURE_SIZE);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** 旋臂粒子层记录（区域高亮 + uTime 驱动）。 */
interface ArmLayer {
  readonly galaxyId: string;
  readonly points: Points;
  readonly originalColors: Float32Array;
  readonly material: PointsMaterial;
}

export interface GalaxyVisualOptions {
  /** 旋臂数量（默认 4）。 */
  readonly armCount?: number;
  /** 盘半径（默认 100）。 */
  readonly radius?: number;
}

export class GalaxyVisualSystem {
  /** 银河根节点（挂 scene 使用；独立层级）。 */
  readonly root: Object3D;
  /** 中心亮核（GalaxyCore Sprite）。 */
  galaxyCore: GalaxyCore | null = null;
  /** 旋臂粒子层（SpiralArm_1..4；供交互与区域高亮）。 */
  private readonly armLayers: ArmLayer[] = [];
  /** 背景盘 / 尘埃材质（uTime 推进用；尘埃静态层为 null 安全忽略）。 */
  private diskMaterial: PointsMaterial | null = null;
  private dustMaterial: PointsMaterial | null = null;
  /** 共享圆形粒子贴图。 */
  readonly particleTexture: CanvasTexture;

  private readonly resources: ResourceManager;
  private readonly resourceGroup: string;
  private readonly rotationSpeed: number;
  private destroyed = false;

  constructor(
    resources: ResourceManager,
    resourceGroup: string,
    options: GalaxyVisualOptions = {},
  ) {
    this.resources = resources;
    this.resourceGroup = resourceGroup;
    this.rotationSpeed = GALAXY_ROTATION_SPEED;
    const radius = options.radius ?? GALAXY_RADIUS;
    const armCount = options.armCount ?? ARM_COUNT;

    this.root = new Object3D();
    this.root.name = 'galaxy-root';
    this.root.userData.interactive = false;

    // 共享圆形粒子贴图（所有粒子层共用；所有权归本系统，释放权归资源组）。
    this.particleTexture = createParticleTexture();
    this.resources.registerDisposable(this.resourceGroup, this.particleTexture);

    // 中心亮核（暖黄 Sprite；中心高亮）。
    this.galaxyCore = new GalaxyCore(this.resources, this.resourceGroup);
    this.galaxyCore.sprite.userData.interactive = true;
    this.galaxyCore.sprite.userData.galaxyId = 'core';
    this.galaxyCore.sprite.userData.galaxyType = 'core';
    this.root.add(this.galaxyCore.sprite);

    // 旋臂（博客算法；每臂独立 Points → 可交互 + 可单独提亮）。
    for (let armIndex = 0; armIndex < armCount; armIndex += 1) {
      this.createArmLayer(armIndex, armCount, radius);
    }

    // 背景盘（同源算法，大扰动 → 无清晰臂感；更暗；外围稀疏）。
    this.createDiskLayer(radius);

    // 星云尘埃（暗色弥散层）。
    this.createDustLayer(radius);
  }

  /** 可拾取对象列表（Phase 2.19 约定：GalaxyCore + SpiralArm_1..4）。 */
  getSelectableObjects(): Object3D[] {
    const objects: Object3D[] = [];
    if (this.galaxyCore) {
      objects.push(this.galaxyCore.sprite);
    }
    this.armLayers.forEach((arm) => objects.push(arm.points));
    return objects;
  }

  /** 按 galaxyId 查询可选对象（'core' / 'arm-1'..'arm-4'）；未知返回 undefined。 */
  getSelectableObject(galaxyId: string): Object3D | undefined {
    if (galaxyId === 'core') {
      return this.galaxyCore?.sprite ?? undefined;
    }
    const arm = this.armLayers[Number(galaxyId.replace('arm-', '')) - 1];
    return arm?.points ?? undefined;
  }

  /**
   * 选中/取消选中银河臂（区域差异化）：对该臂顶点色提亮（×1.6 钳制 1）并写回
   * color attribute（事件级 needsUpdate，非每帧），使被选区域明显区别于未选区域。
   */
  setArmHighlighted(galaxyId: string, highlighted: boolean): void {
    const arm = this.armLayers[Number(galaxyId.replace('arm-', '')) - 1];
    if (!arm) {
      return;
    }
    const attribute = arm.points.geometry.getAttribute('color');
    if (!attribute) {
      return;
    }
    const colors = attribute.array as Float32Array;
    for (let index = 0; index < colors.length; index += 1) {
      const base = arm.originalColors[index] ?? 0;
      colors[index] = highlighted
        ? Math.min(base * ARM_HIGHLIGHT_FACTOR, 1)
        : base;
    }
    attribute.needsUpdate = true;
  }

  /** 清除全部旋臂高亮（取消选择/场景销毁时调用）。 */
  clearArmHighlight(): void {
    for (const arm of this.armLayers) {
      const attribute = arm.points.geometry.getAttribute('color');
      if (!attribute) {
        continue;
      }
      const colors = attribute.array as Float32Array;
      for (let index = 0; index < colors.length; index += 1) {
        colors[index] = arm.originalColors[index] ?? 0;
      }
      attribute.needsUpdate = true;
    }
  }

  /** 每帧更新（AnimationManager 驱动）：银河慢转 + 闪烁时钟推进 + 核心呼吸。 */
  update(deltaTime: number): void {
    if (this.destroyed) {
      return;
    }
    if (Number.isFinite(deltaTime) && deltaTime > 0) {
      const safeDelta = Math.min(deltaTime, 1);
      this.root.rotation.y += this.rotationSpeed * safeDelta;
      // Phase 2.21：每帧一次浮点累加驱动 shader 闪烁（零 CPU 粒子循环）。
      this.advanceTime(safeDelta);
      this.galaxyCore?.update(safeDelta);
    }
  }

  /** 推进各层 uTime（闭包共享 uniform 对象；静态层无 runtime 时安全忽略）。 */
  private advanceTime(deltaTime: number): void {
    for (const arm of this.armLayers) {
      const runtime = arm.material.userData.galaxyTime as GalaxyTwinkleRuntime | undefined;
      if (runtime) {
        runtime.time.value += deltaTime;
      }
    }
    const diskRuntime = this.diskMaterial?.userData.galaxyTime as GalaxyTwinkleRuntime | undefined;
    if (diskRuntime) {
      diskRuntime.time.value += deltaTime;
    }
    const dustRuntime = this.dustMaterial?.userData.galaxyTime as GalaxyTwinkleRuntime | undefined;
    if (dustRuntime) {
      dustRuntime.time.value += deltaTime;
    }
  }

  /** 幂等销毁：移除根节点并清引用（Geometry/Material/Texture 由 releaseGroup 统一释放）。 */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.root.removeFromParent();
    this.armLayers.length = 0;
    this.galaxyCore = null;
    this.diskMaterial = null;
    this.dustMaterial = null;
    this.destroyed = true;
  }

  /** 创建单条旋臂粒子层（博客螺旋臂算法；PointsMaterial + 圆形贴图 + vertexColors）。 */
  private createArmLayer(armIndex: number, armCount: number, radius: number): void {
    const data = generateGalaxyParticles({
      count: ARM_PARTICLE_COUNT,
      radius,
      branches: armCount,
      spin: 0.1,
      randomness: 7,
      randomPower: 2,
      insideColor: ARM_INSIDE_COLOR,
      outsideColor: ARM_OUTSIDE_COLOR,
      verticalFactor: 0.6,
    });

    const { points, material } = this.createParticlePoints(data.positions, data.colors, {
      size: 1.6,
      opacity: 0.85,
      twinkle: ARM_TWINKLE,
    });
    points.name = `SpiralArm_${armIndex + 1}`;
    points.userData.interactive = true;
    points.userData.galaxyId = `arm-${armIndex + 1}`;
    points.userData.galaxyType = 'spiral-arm';
    this.root.add(points);
    this.armLayers.push({
      galaxyId: `arm-${armIndex + 1}`,
      points,
      originalColors: data.colors,
      material,
    });
  }

  /** 创建背景盘粒子层（同源算法 + 大扰动；更暗、稀疏、扁平）。 */
  private createDiskLayer(radius: number): void {
    const data = generateGalaxyParticles({
      count: DISK_PARTICLE_COUNT,
      radius,
      branches: ARM_COUNT,
      spin: 0.08,
      randomness: 20,
      randomPower: 3,
      insideColor: DISK_INSIDE_COLOR,
      outsideColor: DISK_OUTSIDE_COLOR,
      verticalFactor: 0.5,
    });
    const { points, material } = this.createParticlePoints(data.positions, data.colors, {
      size: 0.7,
      opacity: 0.5,
      twinkle: DISK_TWINKLE,
    });
    points.name = 'galaxy-disk';
    this.root.add(points);
    this.diskMaterial = material;
  }

  /** 创建星云尘埃层（博客螺旋思想 + 弥散参数；暗色大颗粒）。 */
  private createDustLayer(radius: number): void {
    const data = generateGalaxyDust({
      count: DUST_PARTICLE_COUNT,
      radius,
      branches: ARM_COUNT,
      spin: 0.08,
      randomness: 26,
      randomPower: 3.5,
      color: DUST_COLOR,
      verticalFactor: 0.8,
    });
    const { points, material } = this.createParticlePoints(data.positions, data.colors, {
      size: 2.4,
      opacity: 0.35,
      twinkle: DUST_TWINKLE,
    });
    points.name = 'galaxy-dust';
    this.root.add(points);
    this.dustMaterial = material;
  }

  /** 构造粒子 Points（BufferGeometry + GalaxyStarMaterial，资源登记资源组）。 */
  private createParticlePoints(
    positions: Float32Array,
    colors: Float32Array,
    options: { size: number; opacity: number; twinkle: LayerTwinkleOptions },
  ): { points: Points; material: PointsMaterial } {
    const count = positions.length / 3;
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    // Phase 2.21：每粒子随机相位（非同步闪烁）与盘面半径（核心活性）。
    const randoms = new Float32Array(count);
    const radii = new Float32Array(count);
    for (let index = 0; index < count; index += 1) {
      randoms[index] = Math.random();
      const px = positions[index * 3] ?? 0;
      const py = positions[index * 3 + 1] ?? 0;
      radii[index] = Math.sqrt(px * px + py * py);
    }
    geometry.setAttribute('aRandom', new Float32BufferAttribute(randoms, 1));
    geometry.setAttribute('aRadius', new Float32BufferAttribute(radii, 1));
    this.resources.registerDisposable(this.resourceGroup, geometry);

    const material = createGalaxyStarMaterial({
      size: options.size,
      map: this.particleTexture,
      opacity: options.opacity,
      vertexColors: true,
      twinkleSpeed: options.twinkle.twinkleSpeed,
      twinkleAmplitude: options.twinkle.twinkleAmplitude,
      coreRadius: options.twinkle.coreRadius,
      coreBoost: options.twinkle.coreBoost,
    });
    this.resources.registerDisposable(this.resourceGroup, material);

    const points = new Points(geometry, material);
    points.frustumCulled = false;
    return { points, material };
  }
}
