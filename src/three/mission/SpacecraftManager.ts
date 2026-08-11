import { CanvasTexture, Color, Object3D, Sprite, SpriteMaterial, SRGBColorSpace } from 'three';
import type { ResourceManager } from '@/three/core/ResourceManager';
import type { Spacecraft, SpacecraftType } from '@/types/mission.types';

/** 探测器纹理尺寸。 */
const SPRITE_TEXTURE_SIZE = 128;
/** 探测器 Sprite 缩放（场景单位）。 */
const SPACECRAFT_SCALE = 2.4;
/** 探测器类型颜色（无 Shader，材质着色）。 */
const TYPE_COLORS: Record<SpacecraftType, number> = {
  orbiter: 0x66aaff,
  lander: 0x7ee08a,
  rover: 0xffb366,
  flyby: 0xc88aff,
};

/** 生成带星形十字的探测器纹理（中心亮斑 + 十字线，便于识别朝向）。 */
function createSpacecraftTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_TEXTURE_SIZE;
  canvas.height = SPRITE_TEXTURE_SIZE;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('无法创建 2D 上下文，探测器纹理生成失败。');
  }
  const center = SPRITE_TEXTURE_SIZE / 2;
  const gradient = context.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.45, 'rgba(255, 255, 255, 0.85)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, SPRITE_TEXTURE_SIZE, SPRITE_TEXTURE_SIZE);
  // 十字标记（星形方向指示）。
  context.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(center, 6);
  context.lineTo(center, SPRITE_TEXTURE_SIZE - 6);
  context.moveTo(6, center);
  context.lineTo(SPRITE_TEXTURE_SIZE - 6, center);
  context.stroke();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * 探测器视觉管理器（Phase 2.22）。
 *
 * 职责：创建探测器视觉对象（当前：Sprite + CanvasTexture；未来支持 GLTF 模型）。
 * - 统一拾取约定：userData { interactive: true, targetType: 'spacecraft', targetId: id }。
 * - 位置由 MissionController 播放时更新（轨迹插值）。
 * - 资源所有权：SpriteMaterial / CanvasTexture 登记到 ResourceManager 指定资源组，
 *   由 releaseGroup 统一释放；destroy 只移除节点并清空引用。
 */
export class SpacecraftManager {
  /** 探测器根节点（挂 scene 使用）。 */
  readonly root: Object3D;
  /** 探测器 ID → Sprite。 */
  readonly spacecraft = new Map<string, Sprite>();
  /** 共享纹理（所有权：本类，释放权：ResourceManager）。 */
  readonly texture: CanvasTexture;

  private readonly resources: ResourceManager;
  private readonly resourceGroup: string;
  private destroyed = false;

  constructor(resources: ResourceManager, resourceGroup: string) {
    this.resources = resources;
    this.resourceGroup = resourceGroup;

    this.root = new Object3D();
    this.root.name = 'spacecraft';
    this.root.userData.interactive = false;

    this.texture = createSpacecraftTexture();
    this.resources.registerDisposable(this.resourceGroup, this.texture);
  }

  /** 创建探测器 Sprite（幂等：重复 ID 抛错）。 */
  create(spacecraft: Spacecraft): Sprite {
    if (this.destroyed) {
      throw new Error('SpacecraftManager 已销毁，无法创建探测器。');
    }
    if (this.spacecraft.has(spacecraft.id)) {
      throw new Error(`探测器 ${spacecraft.id} 已存在，禁止重复创建。`);
    }

    const material = new SpriteMaterial({
      map: this.texture,
      color: new Color(TYPE_COLORS[spacecraft.type] ?? 0xffffff),
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
    this.resources.registerDisposable(this.resourceGroup, material);

    const sprite = new Sprite(material);
    sprite.name = `spacecraft-${spacecraft.id}`;
    sprite.scale.setScalar(SPACECRAFT_SCALE);
    // 统一拾取约定（Phase 2.22）。
    sprite.userData.interactive = true;
    sprite.userData.targetType = 'spacecraft';
    sprite.userData.targetId = spacecraft.id;
    sprite.renderOrder = 2;

    this.root.add(sprite);
    this.spacecraft.set(spacecraft.id, sprite);
    return sprite;
  }

  /** 获取探测器视觉对象；未知 ID 返回 undefined。 */
  getObject(spacecraftId: string): Sprite | undefined {
    return this.spacecraft.get(spacecraftId);
  }

  /** 卸载全部探测器（loadMission 切换任务时调用；共享纹理/材质保留到资源组释放）。 */
  clear(): void {
    this.spacecraft.forEach((sprite) => {
      this.root.remove(sprite);
    });
    this.spacecraft.clear();
  }

  /** 更新探测器位置（播放驱动；未知 ID 安全忽略）。 */
  setPosition(spacecraftId: string, position: { x: number; y: number; z: number }): void {
    const sprite = this.spacecraft.get(spacecraftId);
    if (!sprite) {
      return;
    }
    sprite.position.set(position.x, position.y, position.z);
  }

  /** 每帧更新：位置由 MissionController 播放驱动，接口保留。 */
  update(_deltaTime: number): void {
    return;
  }

  /** 幂等销毁：移除全部 Sprite 并清空引用（资源由 releaseGroup 统一释放）。 */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.root.removeFromParent();
    this.spacecraft.clear();
    this.destroyed = true;
  }
}
