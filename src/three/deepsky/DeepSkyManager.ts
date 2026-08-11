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
import type { DeepSkyObject, DeepSkyType } from '@/types/deepSky.types';
import { equatorialToCartesian, type CartesianPosition } from '@/astronomy/coordinates/EquatorialCoordinate';

/** 深空天体视觉半径（固定于深空球壳，介于恒星层之间）。 */
const DEEP_SKY_VISUAL_RADIUS = 600;
/** 深空天体纹理尺寸。 */
const SPRITE_TEXTURE_SIZE = 256;
/** 视大小 → Sprite 缩放系数（角分 × 系数）。 */
const SIZE_SCALE_FACTOR = 0.35;
/** 最小/最大 Sprite 缩放。 */
const SPRITE_SCALE_MIN = 6;
const SPRITE_SCALE_MAX = 40;
/** 深空天体类型颜色（无 Shader，材质着色）。 */
const TYPE_COLORS: Record<DeepSkyType, number> = {
  nebula: 0xff8a6a,
  galaxy: 0xaaccff,
  cluster: 0xffe0a0,
};

/** 生成柔和圆斑纹理（中心亮、边缘透明）。 */
function createDeepSkyTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_TEXTURE_SIZE;
  canvas.height = SPRITE_TEXTURE_SIZE;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('无法创建 2D 上下文，深空天体纹理生成失败。');
  }
  const center = SPRITE_TEXTURE_SIZE / 2;
  const gradient = context.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.55)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, SPRITE_TEXTURE_SIZE, SPRITE_TEXTURE_SIZE);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * 深空天体管理器（Phase 2.21）。
 *
 * 职责：创建深空天体视觉对象（M31 / M42 / M45 / M13 等）。
 * - 不是模型：禁止 GLTF；使用 Sprite + CanvasTexture。
 * - 位置：真实赤经/赤纬方向 + 固定视觉半径。
 * - 尺寸：按视大小（角分）映射 Sprite 缩放。
 * - 颜色：按类型着色（nebula / galaxy / cluster）。
 * - 统一拾取约定：userData { interactive: true, targetType: 'deepSky', targetId: id }。
 *
 * 资源所有权：SpriteMaterial / CanvasTexture 登记到 ResourceManager 指定资源组，
 * 由 releaseGroup 统一释放；destroy 只移除节点并清空引用。
 */
export class DeepSkyManager {
  /** 深空天体根节点（挂 scene 使用）。 */
  readonly root: Object3D;
  /** 深空天体 ID → Sprite。 */
  readonly objects = new Map<string, Sprite>();
  /** 深空天体 ID → 世界坐标（定位用）。 */
  readonly positions = new Map<string, CartesianPosition>();
  /** 共享纹理（所有权：本类，释放权：ResourceManager）。 */
  readonly texture: CanvasTexture;

  private readonly resources: ResourceManager;
  private readonly resourceGroup: string;
  private readonly tempPosition: CartesianPosition = { x: 0, y: 0, z: 0 };
  private destroyed = false;

  constructor(
    catalog: readonly DeepSkyObject[],
    resources: ResourceManager,
    resourceGroup: string,
  ) {
    this.resources = resources;
    this.resourceGroup = resourceGroup;

    this.root = new Object3D();
    this.root.name = 'deep-sky';
    this.root.userData.interactive = false;

    this.texture = createDeepSkyTexture();
    this.resources.registerDisposable(this.resourceGroup, this.texture);

    for (const object of catalog) {
      this.create(object);
    }
  }

  /** 创建深空天体 Sprite（幂等：重复 ID 抛错）。 */
  create(object: DeepSkyObject): Sprite {
    if (this.destroyed) {
      throw new Error('DeepSkyManager 已销毁，无法创建深空天体。');
    }
    if (this.objects.has(object.id)) {
      throw new Error(`深空天体 ${object.id} 已存在，禁止重复创建。`);
    }
    if (
      !equatorialToCartesian(
        { rightAscension: object.position.rightAscension, declination: object.position.declination },
        DEEP_SKY_VISUAL_RADIUS,
        this.tempPosition,
      )
    ) {
      throw new Error(`深空天体 ${object.id} 坐标非法，无法创建。`);
    }

    const scale = Math.min(
      SPRITE_SCALE_MAX,
      Math.max(SPRITE_SCALE_MIN, object.sizeArcMin * SIZE_SCALE_FACTOR),
    );
    const material = new SpriteMaterial({
      map: this.texture,
      color: new Color(TYPE_COLORS[object.type] ?? 0xffffff),
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    this.resources.registerDisposable(this.resourceGroup, material);

    const sprite = new Sprite(material);
    sprite.name = `deep-sky-${object.id}`;
    sprite.position.set(this.tempPosition.x, this.tempPosition.y, this.tempPosition.z);
    sprite.scale.setScalar(scale);
    // 统一拾取约定（Phase 2.21）。
    sprite.userData.interactive = true;
    sprite.userData.targetType = 'deepSky';
    sprite.userData.targetId = object.id;
    sprite.renderOrder = 1;

    this.root.add(sprite);
    this.objects.set(object.id, sprite);
    this.positions.set(object.id, {
      x: this.tempPosition.x,
      y: this.tempPosition.y,
      z: this.tempPosition.z,
    });
    return sprite;
  }

  /** 深空天体 ID → 世界坐标；未知 ID 返回 null。 */
  getPosition(objectId: string): CartesianPosition | null {
    return this.positions.get(objectId) ?? null;
  }

  /** 每帧更新：深空天体为静态（位置固定），接口保留。 */
  update(_deltaTime: number, _camera: Camera): void {
    return;
  }

  /** 幂等销毁：移除全部 Sprite 并清空引用（资源由 releaseGroup 统一释放）。 */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.root.removeFromParent();
    this.objects.clear();
    this.positions.clear();
    this.destroyed = true;
  }
}
