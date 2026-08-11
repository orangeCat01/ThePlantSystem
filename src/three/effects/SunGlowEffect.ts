import {
  CanvasTexture,
  Color,
  Object3D,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  type Camera,
} from 'three';
import type { ResourceManager } from '@/three/core/ResourceManager';
import { planetRepository } from '@/repositories/PlanetRepository';

/** 外光晕尺寸：太阳视觉半径的倍数。 */
const OUTER_GLOW_SCALE = 6;
/** 内光晕尺寸：太阳视觉半径的倍数。 */
const INNER_GLOW_SCALE = 3.5;
/** 外光晕不透明度。 */
const OUTER_GLOW_OPACITY = 0.15;
/** 内光晕不透明度。 */
const INNER_GLOW_OPACITY = 0.25;
/** 光晕颜色（暖黄，与太阳点光源一致）。 */
const GLOW_COLOR = 0xffcc66;
/** 呼吸幅度：基准缩放的比例。 */
const PULSE_AMPLITUDE = 0.03;
/** 呼吸角速度（弧度/秒）。 */
const PULSE_SPEED = 1.2;
/** 光晕纹理尺寸（512 已足够平滑，避免大纹理占用显存）。 */
const GLOW_TEXTURE_SIZE = 512;

/**
 * 生成径向渐变光晕纹理（中心亮、边缘透明的暖黄圆斑）。
 * 仅初始化时调用一次；CanvasTexture 登记到 ResourceManager 统一释放。
 */
function createGlowTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = GLOW_TEXTURE_SIZE;
  canvas.height = GLOW_TEXTURE_SIZE;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('无法创建 2D 上下文，太阳光晕纹理生成失败。');
  }

  const center = GLOW_TEXTURE_SIZE / 2;
  const gradient = context.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, 'rgba(255, 215, 140, 1)');
  gradient.addColorStop(0.25, 'rgba(255, 190, 100, 0.85)');
  gradient.addColorStop(0.6, 'rgba(255, 165, 70, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 160, 60, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, GLOW_TEXTURE_SIZE, GLOW_TEXTURE_SIZE);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * 太阳视觉增强（Phase 2.12.1）。
 *
 * 职责：管理太阳双层光晕（Outer + Inner Sprite）与呼吸动画。
 *
 * 设计约束：
 * - 禁止 ShaderMaterial / EffectComposer / Bloom，使用 Sprite + CanvasTexture。
 * - Sprite 由渲染器自动 Billboard（始终面向相机），无需手动复制相机四元数。
 * - 挂载到 SolarSystemRoot（与 SunBodyRoot 同级），禁止挂 SunRotationNode，
 *   避免太阳自转影响光晕；光晕位置固定于太阳系原点。
 * - 呼吸动画 deltaTime 驱动（pulseTime 累加），禁止 Date.now / performance.now。
 * - 不参与天体拾取：Sprite 不注册进 selectableObjects，并写入 interactive 标记防误用。
 *
 * 资源所有权：CanvasTexture / SpriteMaterial 登记到 ResourceManager('solar')，
 * 由 releaseGroup 统一释放；destroy 只移除节点并清空引用。
 */
export class SunGlowEffect {
  private readonly parent: Object3D;
  private readonly resources: ResourceManager;
  private readonly resourceGroup: string;
  private outer: Sprite | null = null;
  private inner: Sprite | null = null;
  private outerBaseScale = 0;
  private innerBaseScale = 0;
  private pulseTime = 0;
  private destroyed = false;

  constructor(parent: Object3D, resources: ResourceManager, resourceGroup: string) {
    this.parent = parent;
    this.resources = resources;
    this.resourceGroup = resourceGroup;
  }

  /** 创建双层光晕并显示（幂等；太阳半径从配置读取，不硬编码）。 */
  show(): void {
    if (this.destroyed || this.outer || this.inner) {
      return;
    }

    const sun = planetRepository.getById('sun');
    if (!sun) {
      throw new Error('PlanetRepository 中找不到 sun 配置，无法创建太阳光晕。');
    }
    const sunRadius = sun.visual.radius * sun.visual.scale;
    if (!Number.isFinite(sunRadius) || sunRadius <= 0) {
      throw new Error(`太阳视觉半径非法（${sunRadius}），无法创建光晕。`);
    }

    const texture = createGlowTexture();
    this.resources.registerDisposable(this.resourceGroup, texture);

    this.outer = this.createGlowSprite(
      'sun-glow-outer',
      texture,
      sunRadius * OUTER_GLOW_SCALE,
      OUTER_GLOW_OPACITY,
    );
    this.inner = this.createGlowSprite(
      'sun-glow-inner',
      texture,
      sunRadius * INNER_GLOW_SCALE,
      INNER_GLOW_OPACITY,
    );
    this.outerBaseScale = sunRadius * OUTER_GLOW_SCALE;
    this.innerBaseScale = sunRadius * INNER_GLOW_SCALE;

    this.parent.add(this.outer, this.inner);
  }

  /** 隐藏光晕（不销毁节点，可再次 show）。 */
  hide(): void {
    if (this.outer) {
      this.outer.visible = false;
    }
    if (this.inner) {
      this.inner.visible = false;
    }
  }

  /**
   * 每帧更新：呼吸动画（deltaTime 驱动）与 Billboard 说明。
   * Sprite 的面向相机由渲染器每帧处理，此处不复制相机四元数（会与渲染器冲突）。
   */
  update(deltaTime: number, _camera: Camera): void {
    if (this.destroyed || !this.outer || !this.inner) {
      return;
    }
    if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
      return;
    }

    this.pulseTime += deltaTime;
    const pulse = 1 + Math.sin(this.pulseTime * PULSE_SPEED) * PULSE_AMPLITUDE;
    // 内外层按同一呼吸相位缩放，保持相对比例（直接 setScalar，不新建向量）。
    this.inner.scale.setScalar(this.innerBaseScale * pulse);
    this.outer.scale.setScalar(this.outerBaseScale * pulse);
  }

  /** 幂等销毁：移除 Sprite 并清空引用（资源由 releaseGroup 统一释放）。 */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    if (this.outer) {
      this.parent.remove(this.outer);
      this.outer = null;
    }
    if (this.inner) {
      this.parent.remove(this.inner);
      this.inner = null;
    }
    this.destroyed = true;
  }

  private createGlowSprite(
    name: string,
    texture: CanvasTexture,
    scale: number,
    opacity: number,
  ): Sprite {
    const material = new SpriteMaterial({
      map: texture,
      color: new Color(GLOW_COLOR),
      transparent: true,
      opacity,
      depthWrite: false,
    });
    this.resources.registerDisposable(this.resourceGroup, material);

    const sprite = new Sprite(material);
    sprite.name = name;
    sprite.scale.setScalar(scale);
    // 双保险：光晕不参与天体拾取（Raycaster 只检测 selectableObjects 注册对象）。
    sprite.userData.interactive = false;
    return sprite;
  }
}
