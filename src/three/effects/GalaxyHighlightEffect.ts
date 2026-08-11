import { CanvasTexture, Object3D, Sprite, SpriteMaterial, SRGBColorSpace } from 'three';
import type { ResourceManager } from '@/three/core/ResourceManager';

/** 高亮纹理尺寸。 */
const HIGHLIGHT_TEXTURE_SIZE = 128;
/** 高亮 Sprite 基础缩放（场景单位；按目标尺寸传入）。 */
const HIGHLIGHT_SCALE_BASE = 24;
/** 呼吸脉动幅度（0-1 比例）。 */
const PULSE_AMPLITUDE = 0.12;
/** 呼吸脉动速度（弧度/秒）。 */
const PULSE_SPEED = 2.2;

/** 生成圆环高亮纹理（外缘清晰环带 + 内侧淡光，用于指示选中对象）。 */
function createHighlightTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = HIGHLIGHT_TEXTURE_SIZE;
  canvas.height = HIGHLIGHT_TEXTURE_SIZE;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('无法创建 2D 上下文，银河高亮纹理生成失败。');
  }
  const center = HIGHLIGHT_TEXTURE_SIZE / 2;
  const radius = center * 0.42;

  // 外缘环带。
  const ring = context.createRadialGradient(center, center, radius * 0.75, center, center, radius);
  ring.addColorStop(0, 'rgba(255, 220, 150, 0)');
  ring.addColorStop(0.85, 'rgba(255, 220, 150, 0.85)');
  ring.addColorStop(1, 'rgba(255, 220, 150, 0)');
  context.fillStyle = ring;
  context.fillRect(0, 0, HIGHLIGHT_TEXTURE_SIZE, HIGHLIGHT_TEXTURE_SIZE);

  // 内侧淡光（中心透明，仅环带附近）。
  const glow = context.createRadialGradient(center, center, 0, center, center, radius * 0.8);
  glow.addColorStop(0, 'rgba(255, 200, 120, 0)');
  glow.addColorStop(0.7, 'rgba(255, 200, 120, 0.12)');
  glow.addColorStop(1, 'rgba(255, 200, 120, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, HIGHLIGHT_TEXTURE_SIZE, HIGHLIGHT_TEXTURE_SIZE);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * 银河高亮效果（Phase 2.19）。
 *
 * 简单视觉反馈：Sprite 圆环（程序生成纹理 + 呼吸脉动）。
 * - 禁止 ShaderMaterial / Bloom / EffectComposer。
 * - 资源所有权：SpriteMaterial / CanvasTexture 登记 ResourceManager 指定资源组（'galaxy'）。
 * - 接口：show(object3D, scale) / hide() / update(deltaTime) / destroy()（幂等）。
 */
export class GalaxyHighlightEffect {
  private readonly sprite: Sprite;
  private readonly resources: ResourceManager;
  private readonly resourceGroup: string;
  private target: Object3D | null = null;
  private scale = HIGHLIGHT_SCALE_BASE;
  private pulsePhase = 0;
  private destroyed = false;

  constructor(resources: ResourceManager, resourceGroup: string) {
    this.resources = resources;
    this.resourceGroup = resourceGroup;

    const texture = createHighlightTexture();
    this.resources.registerDisposable(this.resourceGroup, texture);

    const material = new SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.resources.registerDisposable(this.resourceGroup, material);

    this.sprite = new Sprite(material);
    this.sprite.name = 'galaxy-highlight';
    this.sprite.visible = false;
    this.sprite.renderOrder = 10;
  }

  /** 显示高亮（跟随目标 Object3D；scale 为高亮直径）。 */
  show(target: Object3D, scale: number): void {
    if (this.destroyed) {
      return;
    }
    this.target = target;
    this.scale = Number.isFinite(scale) && scale > 0 ? scale : HIGHLIGHT_SCALE_BASE;
    this.sprite.visible = true;
  }

  /** 隐藏高亮（幂等）。 */
  hide(): void {
    this.sprite.visible = false;
    this.target = null;
  }

  /** 当前是否显示中。 */
  isVisible(): boolean {
    return this.sprite.visible;
  }

  /** 每帧更新：跟随目标位置 + 呼吸脉动（deltaTime 驱动，无 Tween/RAF）。 */
  update(deltaTime: number): void {
    if (this.destroyed || !this.sprite.visible) {
      return;
    }
    if (this.target) {
      this.sprite.position.copy(this.target.position);
    }
    if (Number.isFinite(deltaTime) && deltaTime > 0) {
      this.pulsePhase += PULSE_SPEED * Math.min(deltaTime, 1);
      const pulse = 1 + Math.sin(this.pulsePhase) * PULSE_AMPLITUDE;
      this.sprite.scale.setScalar(this.scale * pulse);
    }
  }

  /** 高亮 Sprite（挂 scene 使用）。 */
  getSprite(): Sprite {
    return this.sprite;
  }

  /** 幂等销毁：移除节点并清引用（纹理/材质由 releaseGroup 统一释放）。 */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.sprite.removeFromParent();
    this.target = null;
    this.destroyed = true;
  }
}
