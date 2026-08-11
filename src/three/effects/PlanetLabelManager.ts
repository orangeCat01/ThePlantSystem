import {
  CanvasTexture,
  Object3D,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
  type Camera,
} from 'three';
import type { ResourceManager } from '@/three/core/ResourceManager';
import type { PlanetRuntime } from '@/three/solar/solar.types';

/** 标签纹理宽高（512×128 足够容纳天体名）。 */
const LABEL_TEXTURE_WIDTH = 512;
const LABEL_TEXTURE_HEIGHT = 128;
/** 标签文字字号。 */
const LABEL_FONT_SIZE = 72;
/** 标签在中心上方的世界偏移系数（相对标签与相机距离，保持恒定屏幕偏移）。 */
const LABEL_SCREEN_OFFSET = 0.06;
/** 标签屏幕占比系数：scale = 相机距离 × 该系数（恒定屏幕大小观感）。 */
const LABEL_SCREEN_SCALE = 0.055;
/** 标签可读性最小缩放（近距离时避免过大）。 */
const LABEL_SCALE_MIN = 2.2;
/** 标签可读性最大缩放（远距离时保持可见）。 */
const LABEL_SCALE_MAX = 7;

/**
 * 生成天体名称标签纹理（白字黑描边，透明背景）。
 * 仅创建时调用一次；CanvasTexture 登记到 ResourceManager 统一释放。
 */
function createLabelTexture(text: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = LABEL_TEXTURE_WIDTH;
  canvas.height = LABEL_TEXTURE_HEIGHT;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('无法创建 2D 上下文，天体标签纹理生成失败。');
  }

  context.clearRect(0, 0, LABEL_TEXTURE_WIDTH, LABEL_TEXTURE_HEIGHT);
  context.font = `bold ${LABEL_FONT_SIZE}px "Segoe UI", "Microsoft YaHei", sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  // 描边增强对比度（深空背景下可读）。
  context.lineWidth = 8;
  context.strokeStyle = 'rgba(0, 0, 0, 0.85)';
  context.strokeText(text, LABEL_TEXTURE_WIDTH / 2, LABEL_TEXTURE_HEIGHT / 2);
  context.fillStyle = 'rgba(255, 255, 255, 0.95)';
  context.fillText(text, LABEL_TEXTURE_WIDTH / 2, LABEL_TEXTURE_HEIGHT / 2);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * 天体名称标签管理器（Phase 2.14.4）。
 *
 * 职责：为全部天体创建 Sprite 名称标签，并在每帧跟随天体位置。
 *
 * 设计约束：
 * - 技术：Sprite + CanvasTexture（禁止 HTML overlay / Shader）。
 * - 标签文字读取 PlanetConfig.displayName（缺省回退 englishName），禁止硬编码。
 * - 挂载到 scene（与 SolarSystemRoot 同级），不挂 PlanetBodyRoot——避免跟随自转。
 * - 每帧位置：读取 cameraAnchor 世界坐标 + 屏幕上方的固定偏移（复用向量，禁止 new）。
 * - 缩放：按相机距离保持近似恒定屏幕大小（复用向量计算距离）。
 * - 交互隔离：userData.interactive = false，不进入 Raycaster / selectableObjects。
 * - 可见性：show() / hide() 全局开关；setVisible 同步。
 *
 * 资源所有权：CanvasTexture / SpriteMaterial 登记到 ResourceManager 指定资源组，
 * 由 releaseGroup 统一释放；destroy 只移除节点并清空引用。
 */
export class PlanetLabelManager {
  private readonly parent: Object3D;
  private readonly resources: ResourceManager;
  private readonly resourceGroup: string;
  private readonly labels = new Map<string, Sprite>();
  private readonly anchorMap = new Map<string, Object3D>();
  // 临时向量（每帧复用，禁止新建）。
  private readonly worldPosition = new Vector3();
  private readonly cameraToLabel = new Vector3();
  private visible = false;
  private destroyed = false;

  constructor(parent: Object3D, resources: ResourceManager, resourceGroup: string) {
    this.parent = parent;
    this.resources = resources;
    this.resourceGroup = resourceGroup;
  }

  /**
   * 为天体创建标签（幂等：重复 ID 抛错）。名称来自配置 displayName ?? englishName。
   * 标签挂载到注入的父节点（scene），不挂天体节点。
   */
  createLabel(runtime: PlanetRuntime): Sprite {
    if (this.destroyed) {
      throw new Error('PlanetLabelManager 已销毁，无法创建标签。');
    }
    if (this.labels.has(runtime.id)) {
      throw new Error(`天体 ${runtime.id} 的标签已存在，禁止重复创建。`);
    }

    const text = runtime.config.displayName ?? runtime.config.englishName;
    if (!text || text.length === 0) {
      throw new Error(`天体 ${runtime.id} 没有可用的标签名称（displayName / englishName 均为空）。`);
    }

    const texture = createLabelTexture(text);
    const material = new SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    const sprite = new Sprite(material);
    sprite.name = `${runtime.id}-label`;
    // 交互隔离：标签不参与天体拾取（双保险：不注册 selectableObjects + 标记防误用）。
    sprite.userData.interactive = false;
    // 标签渲染在轨道线（renderOrder 0）之后，保持可读。
    sprite.renderOrder = 10;

    this.resources.registerDisposable(this.resourceGroup, texture);
    this.resources.registerDisposable(this.resourceGroup, material);

    // 初始位置：天体中心（第一帧 update 前不闪烁）。
    sprite.position.copy(runtime.cameraAnchor.getWorldPosition(this.worldPosition));
    sprite.visible = this.visible;

    this.parent.add(sprite);
    this.labels.set(runtime.id, sprite);
    this.anchorMap.set(runtime.id, runtime.cameraAnchor);
    return sprite;
  }

  /** 全局显示全部标签。 */
  show(): void {
    if (this.destroyed) {
      return;
    }
    this.visible = true;
    this.labels.forEach((sprite) => {
      sprite.visible = true;
    });
  }

  /** 全局隐藏全部标签。 */
  hide(): void {
    if (this.destroyed) {
      return;
    }
    this.visible = false;
    this.labels.forEach((sprite) => {
      sprite.visible = false;
    });
  }

  /** 设置全局可见性（等价 show/hide，供命令接口使用）。 */
  setVisible(visible: boolean): void {
    if (visible) {
      this.show();
    } else {
      this.hide();
    }
  }

  /**
   * 每帧更新标签位置与缩放：
   * - 读取 cameraAnchor 世界坐标（天体中心）。
   * - 标签位置 = 天体中心 + 屏幕上方偏移（世界 y，随相机距离缩放保持恒定屏幕偏移）。
   * - 缩放 = 相机距离 × 系数（近似恒定屏幕大小），钳制到可读区间。
   * - 全程复用模块级临时向量，禁止每帧新建对象。
   */
  update(_deltaTime: number, camera: Camera): void {
    if (this.destroyed || !this.visible) {
      return;
    }

    this.anchorMap.forEach((anchor, id) => {
      const sprite = this.labels.get(id);
      if (!sprite) {
        return;
      }

      // 天体中心世界坐标（允许每帧 getWorldPosition，复用临时向量）。
      anchor.getWorldPosition(this.worldPosition);

      // 相机到标签的距离（用于偏移与缩放；复用临时向量）。
      this.cameraToLabel.copy(this.worldPosition).sub(camera.position);
      const distance = this.cameraToLabel.length();

      // 标签位于天体中心上方：世界 y 偏移随距离增大，保持屏幕空间恒定。
      sprite.position.copy(this.worldPosition);
      sprite.position.y += LABEL_SCREEN_OFFSET * distance;

      // 恒定屏幕大小观感：scale 与距离成正比，钳制可读区间。
      const scale = Math.min(
        LABEL_SCALE_MAX,
        Math.max(LABEL_SCALE_MIN, distance * LABEL_SCREEN_SCALE),
      );
      sprite.scale.set(scale * 4, scale, 1);
    });
  }

  /** 获取标签 Sprite；未知 ID 返回 undefined。 */
  getLabel(id: string): Sprite | undefined {
    return this.labels.get(id);
  }

  /**
   * 按可见性设置标签显示（Phase 2.20）：只改 visible 标志，不删除对象。
   * 未知 ID 安全忽略。
   */
  setLabelVisible(id: string, visible: boolean): void {
    const sprite = this.labels.get(id);
    if (sprite) {
      sprite.visible = visible;
    }
  }

  /** 标签数量（诊断/测试用）。 */
  get count(): number {
    return this.labels.size;
  }

  /** 幂等销毁：移除全部标签并清空引用（资源由 releaseGroup 统一释放）。 */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.labels.forEach((sprite) => {
      sprite.removeFromParent();
    });
    this.labels.clear();
    this.anchorMap.clear();
    this.destroyed = true;
  }
}
