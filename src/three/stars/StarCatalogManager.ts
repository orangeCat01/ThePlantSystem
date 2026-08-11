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
import type { StarConfig } from '@/types/star.types';
import {
  equatorialToCartesian,
  type CartesianPosition,
} from '@/astronomy/coordinates/EquatorialCoordinate';

/** 恒星视觉半径下限（场景单位，远大于最远轨道 32，保证深空背景稳定）。 */
const VISUAL_RADIUS_MIN = 500;
/** 恒星视觉半径上限。 */
const VISUAL_RADIUS_MAX = 820;
/** 距离映射参考上限（光年）。 */
const DISTANCE_REFERENCE_LIGHT_YEARS = 1000;
/** 星点纹理尺寸。 */
const SPRITE_TEXTURE_SIZE = 128;
/** 星点基准缩放（场景单位；随亮度缩放）。 */
const SPRITE_BASE_SCALE = 14;
/** 星点缩放范围（亮度映射）。 */
const SPRITE_SCALE_MIN = 6;
const SPRITE_SCALE_MAX = 26;
/** 星点不透明度范围（亮度映射）。 */
const SPRITE_OPACITY_MIN = 0.5;
const SPRITE_OPACITY_MAX = 1;
/** 星等→亮度公式常量（brightness = 1 / (magnitude + constant)）。 */
const MAGNITUDE_CONSTANT = 4;

/**
 * 光年距离 → 场景视觉半径（对数压缩，与星座线共享同一映射）。
 */
export function starVisualRadius(distanceLightYears: number): number {
  if (!Number.isFinite(distanceLightYears) || distanceLightYears <= 0) {
    return VISUAL_RADIUS_MIN;
  }
  const clamped = Math.min(distanceLightYears, DISTANCE_REFERENCE_LIGHT_YEARS);
  const ratio = Math.log10(1 + clamped) / Math.log10(1 + DISTANCE_REFERENCE_LIGHT_YEARS);
  return VISUAL_RADIUS_MIN + ratio * (VISUAL_RADIUS_MAX - VISUAL_RADIUS_MIN);
}

/** 星等 → 亮度（0~1）：magnitude 越小越亮；钳制避免极端值。 */
export function starBrightness(magnitude: number): number {
  if (!Number.isFinite(magnitude)) {
    return 0.1;
  }
  const brightness = 1 / (magnitude + MAGNITUDE_CONSTANT);
  if (brightness < 0) {
    // magnitude < -constant：超出公式有效区间（物理上极亮），钳制到上限。
    return 0.4;
  }
  return Math.min(Math.max(brightness, 0.05), 0.4);
}

/** 生成圆形星点纹理（中心亮、边缘柔和，白色；透明度由材质控制）。 */
function createStarSpriteTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_TEXTURE_SIZE;
  canvas.height = SPRITE_TEXTURE_SIZE;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('无法创建 2D 上下文，恒星纹理生成失败。');
  }
  const center = SPRITE_TEXTURE_SIZE / 2;
  const gradient = context.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, SPRITE_TEXTURE_SIZE, SPRITE_TEXTURE_SIZE);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * 恒星目录管理器（Phase 2.19）。
 *
 * 职责：加载恒星目录并创建恒星视觉对象（Sprite 每星）。
 * - 不是模型：禁止 GLTF；使用 Sprite + CanvasTexture。
 * - 星等视觉系统：亮度 brightness = 1/(magnitude + 4) 钳制到 [0.05, 0.4]，
 *   映射 Sprite 缩放与不透明度（禁止 Shader）。
 * - 每颗恒星 userData：{ interactive: true, targetType: 'star', targetId: id }
 *   （统一拾取约定：Raycaster 可直接检测；行星优先级高于恒星由 InteractionManager 保证）。
 * - 位置：真实赤经/赤纬方向 + 视觉距离（与星座线共享 starVisualRadius）。
 * - 与 PlanetManager 同等级管理：SolarScene 持有并在场景切换时销毁。
 *
 * 资源所有权：SpriteMaterial / CanvasTexture 登记到 ResourceManager 指定资源组，
 * 由 releaseGroup 统一释放；destroy 只移除节点并清空引用。
 */
export class StarCatalogManager {
  /** 恒星 Sprite 根节点（挂 scene 使用；子节点为各恒星 Sprite）。 */
  readonly root: Object3D;
  /** 恒星 ID → Sprite（查询与销毁用）。 */
  readonly stars = new Map<string, Sprite>();
  /** 恒星 ID → 世界坐标（定位/拾取用）。 */
  readonly positions = new Map<string, CartesianPosition>();
  /** 恒星 ID → 视星等（构造时缓存，星等过滤用）。 */
  private readonly magnitudes = new Map<string, number>();
  /** 可见性覆盖（Phase 2.20 观测引擎；null 表示不过滤）。 */
  private visibilityOverride: ReadonlyMap<string, boolean> | null = null;
  /** 极限星等过滤（Phase 2.21；null 表示不限）。 */
  private limitingMagnitude: number | null = null;
  /** 共享星点纹理（所有权：本类，释放权：ResourceManager）。 */
  readonly texture: CanvasTexture;

  private readonly resources: ResourceManager;
  private readonly resourceGroup: string;
  private readonly tempPosition: CartesianPosition = { x: 0, y: 0, z: 0 };
  private destroyed = false;

  constructor(
    stars: readonly StarConfig[],
    resources: ResourceManager,
    resourceGroup: string,
  ) {
    this.resources = resources;
    this.resourceGroup = resourceGroup;

    this.root = new Object3D();
    this.root.name = 'star-catalog';
    this.root.userData.interactive = false;

    this.texture = createStarSpriteTexture();
    this.resources.registerDisposable(this.resourceGroup, this.texture);

    for (const star of stars) {
      this.createStar(star);
    }
  }

  /** 为单颗恒星创建 Sprite（幂等：重复 ID 抛错）。 */
  createStar(star: StarConfig): Sprite {
    if (this.destroyed) {
      throw new Error('StarCatalogManager 已销毁，无法创建恒星。');
    }
    if (this.stars.has(star.id)) {
      throw new Error(`恒星 ${star.id} 已存在，禁止重复创建。`);
    }

    const radius = starVisualRadius(star.distanceLightYears);
    if (
      !equatorialToCartesian(
        { rightAscension: star.position.rightAscension, declination: star.position.declination },
        radius,
        this.tempPosition,
      )
    ) {
      throw new Error(`恒星 ${star.id} 坐标非法，无法创建。`);
    }

    // 星等 → 亮度 → 视觉缩放/不透明度（钳制避免极端值）。
    const brightness = starBrightness(star.magnitude);
    const scale =
      SPRITE_SCALE_MIN + (brightness / 0.4) * (SPRITE_SCALE_MAX - SPRITE_SCALE_MIN);
    const opacity =
      SPRITE_OPACITY_MIN + (brightness / 0.4) * (SPRITE_OPACITY_MAX - SPRITE_OPACITY_MIN);

    const material = new SpriteMaterial({
      map: this.texture,
      color: new Color(0xffffff),
      transparent: true,
      opacity,
      depthWrite: false,
    });
    this.resources.registerDisposable(this.resourceGroup, material);

    const sprite = new Sprite(material);
    sprite.name = `star-${star.id}`;
    sprite.position.set(this.tempPosition.x, this.tempPosition.y, this.tempPosition.z);
    sprite.scale.setScalar(scale * SPRITE_BASE_SCALE);
    // 统一拾取约定（Phase 2.19）：可交互恒星 + 目标类型/ID。
    sprite.userData.interactive = true;
    sprite.userData.targetType = 'star';
    sprite.userData.targetId = star.id;
    sprite.renderOrder = 1;

    this.root.add(sprite);
    this.stars.set(star.id, sprite);
    this.positions.set(star.id, {
      x: this.tempPosition.x,
      y: this.tempPosition.y,
      z: this.tempPosition.z,
    });
    this.magnitudes.set(star.id, star.magnitude);
    return sprite;
  }

  /** 恒星 ID → Sprite；未知 ID 返回 undefined。 */
  getStar(starId: string): Sprite | undefined {
    return this.stars.get(starId);
  }

  /**
   * 设置极限星等过滤（Phase 2.21）：隐藏 magnitude > limit 的恒星（只改 visible，不删除）。
   * null 表示不限（显示全部）。
   */
  setLimitingMagnitude(limit: number | null): void {
    this.limitingMagnitude = Number.isFinite(limit) ? (limit as number) : null;
    this.applyFilters();
  }

  /**
   * 设置可见性覆盖（Phase 2.20 观测引擎；null 表示不过滤）。
   * 组合规则：sprite.visible = 可见性覆盖（若存在）&& 星等过滤（若存在）。
   */
  applyVisibilityMap(visibility: ReadonlyMap<string, boolean> | null): void {
    this.visibilityOverride = visibility;
    this.applyFilters();
  }

  /** 按当前过滤条件刷新全部恒星 visible（组合可见性覆盖与星等过滤）。 */
  private applyFilters(): void {
    this.stars.forEach((sprite, starId) => {
      const visibilityOk = this.visibilityOverride?.get(starId) ?? true;
      const magnitude = this.magnitudes.get(starId);
      const magnitudeOk =
        this.limitingMagnitude === null ||
        magnitude === undefined ||
        magnitude <= this.limitingMagnitude;
      sprite.visible = visibilityOk && magnitudeOk;
    });
  }

  /** 恒星 ID → 世界坐标；未知 ID 返回 null。 */
  getPosition(starId: string): CartesianPosition | null {
    return this.positions.get(starId) ?? null;
  }

  /** 每帧更新：本阶段恒星为静态（位置固定），接口保留。 */
  update(_deltaTime: number, _camera: Camera): void {
    return;
  }

  /** 幂等销毁：移除全部恒星 Sprite 并清空引用（资源由 releaseGroup 统一释放）。 */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.root.removeFromParent();
    this.stars.clear();
    this.positions.clear();
    this.destroyed = true;
  }
}
