import {
  Camera,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  RingGeometry,
  Vector3,
} from 'three';
import type { ResourceManager } from '@/three/core/ResourceManager';

/** 呼吸动画角速度（弧度/秒）。 */
const PULSE_SPEED = 2.8;
/** 呼吸动画幅度（基础尺寸的 ±6%），保持轻微不喧宾夺主。 */
const PULSE_AMOUNT = 0.06;

/** HighlightEffect 构造依赖。 */
export interface HighlightEffectOptions {
  readonly parent: Object3D;
  readonly resources: ResourceManager;
  readonly resourceGroup: string;
}

/**
 * 天体选中高亮效果（Phase 2.8）。
 *
 * 职责：
 * - 构造时创建一次 RingGeometry / MeshBasicMaterial / Mesh（单位尺寸，实际大小由 scale 控制）。
 * - 保存当前跟随目标，显示/隐藏，每帧同步世界位置、朝向 Camera 并执行轻微呼吸缩放。
 * - 销毁自身节点与引用。
 *
 * 边界：
 * - 不根据 planetId 查找天体、不调用 PlanetManager / CameraController。
 * - 不读取 PlanetConfig / Pinia，不依赖 Vue。
 * - 不创建 Scene / Camera / Renderer / 独立动画循环 / RAF / Timer / Tween。
 *
 * 所有权：Geometry 与 Material 构造时登记到 ResourceManager 指定资源组，
 * 由 releaseGroup 统一 dispose；destroy 只移除 Mesh 并清空引用，不重复释放。
 */
export class HighlightEffect {
  private readonly parent: Object3D;
  private readonly resources: ResourceManager;
  private readonly resourceGroup: string;
  private readonly mesh: Mesh;
  private readonly targetWorldPosition = new Vector3();
  private readonly cameraWorldQuaternion = new Quaternion();

  private target: Object3D | null = null;
  private baseScale = 1;
  private pulseTime = 0;
  private destroyed = false;

  constructor(options: HighlightEffectOptions) {
    this.parent = options.parent;
    this.resources = options.resources;
    this.resourceGroup = options.resourceGroup;

    // 资源只创建一次；RingGeometry 使用单位尺寸（0.95 ~ 1.12），
    // 实际大小通过 mesh.scale 控制，避免为不同天体重建几何。
    const geometry = new RingGeometry(0.95, 1.12, 64);
    const material = new MeshBasicMaterial({
      // Phase 2.20.1：NASA 探索风格柔和光环（低透明度、冰蓝）。
      color: 0x6ddcff,
      transparent: true,
      opacity: 0.25,
      side: DoubleSide,
      depthWrite: false,
      depthTest: true,
    });

    const mesh = new Mesh(geometry, material);
    mesh.name = 'planet-highlight';
    mesh.visible = false;
    // 高亮不参与天体选择：InteractionManager 只检测 PlanetManager 注册对象，
    // 此处写入标记防止误用（Phase 2.6 约定）。
    mesh.userData.interactive = false;
    mesh.userData.effectType = 'planet-highlight';
    this.mesh = mesh;

    // 所有权：本模块创建并登记，由 ResourceManager.releaseGroup 统一释放。
    this.resources.registerDisposable(this.resourceGroup, geometry);
    this.resources.registerDisposable(this.resourceGroup, material);

    // 高亮直接挂到注入的父节点（SolarScene.scene 根），
    // 世界坐标与世界四元数可直接使用，不继承天体局部旋转。
    this.parent.add(mesh);
  }

  /**
   * 显示高亮并跟随目标。
   * 重复 show：只更新 target 与 baseScale，不创建资源、不重置 pulseTime（视觉连续）。
   */
  show(target: Object3D, baseScale: number): void {
    if (this.destroyed) {
      throw new Error('HighlightEffect 已销毁，无法显示高亮。');
    }

    if (target.parent === null) {
      throw new Error('高亮目标已从场景移除，无法显示。');
    }

    if (!Number.isFinite(baseScale) || baseScale <= 0) {
      throw new Error(`高亮 baseScale 非法（baseScale=${baseScale}）。`);
    }

    this.target = target;
    // Phase 2.20.1：缩放降低约 15%（柔和光环，不喧宾夺主）。
    this.baseScale = baseScale * 0.85;

    // 首次显示立即同步位置，不等待下一帧。
    target.getWorldPosition(this.targetWorldPosition);
    this.mesh.position.copy(this.targetWorldPosition);
    this.mesh.visible = true;
  }

  /** 隐藏高亮。不释放 Geometry / Material、不移除 Mesh、不重置资源登记；重复调用安全。 */
  hide(): void {
    this.mesh.visible = false;
    this.target = null;
  }

  isVisible(): boolean {
    return this.mesh.visible;
  }

  /** 每帧跟随目标、朝向 Camera 并执行呼吸缩放。由唯一主 RAF（经 SolarScene.update）驱动。 */
  update(deltaTime: number, camera: Camera): void {
    if (this.destroyed) {
      return;
    }

    if (!this.mesh.visible) {
      return;
    }

    if (!this.target) {
      this.hide();
      return;
    }

    // 目标已从场景移除：自动隐藏并安全返回（逐帧不抛错）。
    if (this.target.parent === null) {
      this.hide();
      return;
    }

    if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
      return;
    }

    this.pulseTime += deltaTime;
    const pulse = 1 + Math.sin(this.pulseTime * PULSE_SPEED) * PULSE_AMOUNT;

    // 世界位置跟随（EarthBodyRoot 随公转移动，不受自转影响）。
    this.target.getWorldPosition(this.targetWorldPosition);
    this.mesh.position.copy(this.targetWorldPosition);

    // 始终朝向 Camera：直接复制相机世界旋转（Mesh 挂于 Scene 根，无局部变换）。
    camera.getWorldQuaternion(this.cameraWorldQuaternion);
    this.mesh.quaternion.copy(this.cameraWorldQuaternion);

    this.mesh.scale.setScalar(this.baseScale * pulse);
  }

  /** 幂等销毁：隐藏、从父节点移除 Mesh、清空引用。GPU 资源由 ResourceManager 释放。 */
  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.hide();
    this.parent.remove(this.mesh);
    this.target = null;
  }
}
