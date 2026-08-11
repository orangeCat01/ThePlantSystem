/**
 * 银河中心亮核（Phase 2.17）。
 *
 * 职责：以 Sprite + 程序生成暖黄色径向渐变纹理表现银河中心亮核。
 * - 禁止 ShaderMaterial / Bloom / EffectComposer。
 * - 资源所有权：SpriteMaterial / CanvasTexture 登记 ResourceManager 指定资源组，
 *   由 releaseGroup 统一释放；destroy 只移除节点并清空引用。
 */
import { CanvasTexture, Color, Sprite, SpriteMaterial, SRGBColorSpace } from 'three';
import type { ResourceManager } from '@/three/core/ResourceManager';

/** 核心纹理尺寸。 */
const CORE_TEXTURE_SIZE = 256;
/** 核心 Sprite 缩放（场景单位；相对星盘半径 100）。 */
const CORE_SCALE = 22;

/** 生成暖黄色亮核纹理（中心亮白 → 暖黄 → 透明边缘）。 */
export function createGalaxyCoreTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = CORE_TEXTURE_SIZE;
  canvas.height = CORE_TEXTURE_SIZE;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('无法创建 2D 上下文，银河核心纹理生成失败。');
  }
  const center = CORE_TEXTURE_SIZE / 2;
  const gradient = context.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, 'rgba(255, 250, 230, 1)');
  gradient.addColorStop(0.25, 'rgba(255, 224, 160, 0.85)');
  gradient.addColorStop(0.6, 'rgba(255, 180, 110, 0.35)');
  gradient.addColorStop(1, 'rgba(255, 160, 90, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, CORE_TEXTURE_SIZE, CORE_TEXTURE_SIZE);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export class GalaxyCore {
  /** 亮核 Sprite（挂 GalaxyRoot 使用）。 */
  readonly sprite: Sprite;
  readonly texture: CanvasTexture;

  private readonly resources: ResourceManager;
  private readonly resourceGroup: string;
  /** Phase 2.21 核心呼吸：基准缩放（场景单位；相对星盘半径 100）。 */
  private readonly baseScale = CORE_SCALE;
  /** 呼吸时钟累计（AnimationManager deltaTime 驱动）。 */
  private elapsedTime = 0;
  private destroyed = false;

  constructor(resources: ResourceManager, resourceGroup: string) {
    this.resources = resources;
    this.resourceGroup = resourceGroup;

    this.texture = createGalaxyCoreTexture();
    this.resources.registerDisposable(this.resourceGroup, this.texture);

    const material = new SpriteMaterial({
      map: this.texture,
      color: new Color(0xffd9a0),
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    this.resources.registerDisposable(this.resourceGroup, material);

    this.sprite = new Sprite(material);
    this.sprite.name = 'galaxy-core';
    this.sprite.scale.setScalar(CORE_SCALE);
  }

  /** 每帧更新（Phase 2.21）：核心缓慢呼吸（幅度 5%，周期 ~12.6s），非闪烁。 */
  update(deltaTime: number): void {
    if (this.destroyed || !Number.isFinite(deltaTime) || deltaTime <= 0) {
      return;
    }
    this.elapsedTime += Math.min(deltaTime, 1);
    const breath = 1 + Math.sin(this.elapsedTime * 0.5) * 0.05;
    this.sprite.scale.setScalar(this.baseScale * breath);
  }

  /** 幂等销毁：移除节点并清空引用（纹理/材质由 releaseGroup 统一释放）。 */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.sprite.removeFromParent();
    this.destroyed = true;
  }
}
