import { Object3D, Raycaster, Vector2, Vector3 } from 'three';
import type { Camera } from 'three';

/** 点击判定阈值（像素）：拖动距离小于该值视为点击。 */
const CLICK_THRESHOLD_PIXELS = 5;
/** 点击判定时长（毫秒）。 */
const CLICK_MAX_DURATION_MS = 500;

/**
 * 银河系交互管理器（Phase 2.19）。
 *
 * 职责：管理银河可选择对象（核心 / 旋臂）的点击拾取。
 * - 复用 THREE.Raycaster 逻辑（不复制 Solar InteractionManager 的代码结构）。
 * - 只在 pointer 事件时执行 Raycast（禁止每帧 Raycast）。
 * - 命中规则：object.userData.interactive === true 且存在 galaxyId
 *   （GalaxyCore / SpiralArm Points 由 GalaxyManager 标记）。
 * - 回调：onSelected(galaxyId, worldPosition)——worldPosition 为命中点
 *   （Scene 用于高亮定位 / 相机聚焦）。
 *
 * 生命周期：destroy 幂等（移除 pointer 监听）。
 */
export interface GalaxyInteractionOptions {
  readonly camera: Camera;
  readonly domElement: HTMLElement;
  readonly onSelected?: (galaxyId: string, worldPosition: Vector3) => void;
}

export class GalaxyInteractionManager {
  private readonly camera: Camera;
  private readonly domElement: HTMLElement;
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly tempWorldPosition = new Vector3();
  private selectableObjects: Object3D[] = [];
  private enabled = true;
  private destroyed = false;
  private readonly onSelected: ((galaxyId: string, worldPosition: Vector3) => void) | null;

  private pointerDownClient = { x: 0, y: 0 };
  private pointerDownTime = 0;

  constructor(options: GalaxyInteractionOptions) {
    this.camera = options.camera;
    this.domElement = options.domElement;
    this.onSelected = options.onSelected ?? null;
    this.bindEvents();
  }

  /** 设置可拾取对象（GalaxyCore + SpiralArm Points；覆盖式注册）。 */
  setSelectableObjects(objects: readonly Object3D[]): void {
    this.selectableObjects = [...objects];
  }

  /** 启用 / 禁用交互（禁用后点击安全忽略）。 */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private bindEvents(): void {
    this.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.domElement.addEventListener('pointerup', this.handlePointerUp);
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!this.enabled || this.destroyed) {
      return;
    }
    this.pointerDownClient = { x: event.clientX, y: event.clientY };
    this.pointerDownTime = performance.now();
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (!this.enabled || this.destroyed) {
      return;
    }
    const dx = event.clientX - this.pointerDownClient.x;
    const dy = event.clientY - this.pointerDownClient.y;
    const duration = performance.now() - this.pointerDownTime;
    // 拖动（旋转/缩放）结束不触发点击；仅短按判定为点击。
    if (Math.hypot(dx, dy) > CLICK_THRESHOLD_PIXELS || duration > CLICK_MAX_DURATION_MS) {
      return;
    }

    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersections = this.raycaster.intersectObjects(this.selectableObjects, false);
    // Phase 2.20.1：核心优先——点击中心区域时旋臂粒子常先命中，
    // 但射线若穿过核心（用户意图选中银河中心），优先上报 core。
    let best: { object: Object3D; point: Vector3 } | null = null;
    for (const intersection of intersections) {
      const galaxyId = intersection.object.userData.galaxyId;
      if (typeof galaxyId === 'string' && galaxyId.length > 0) {
        if (galaxyId === 'core') {
          best = { object: intersection.object, point: intersection.point };
          break;
        }
        best ??= { object: intersection.object, point: intersection.point };
      }
    }
    if (best) {
      const galaxyId = best.object.userData.galaxyId;
      // 上报命中点（复用临时向量后 clone：点击频率低，允许一次分配）。
      this.tempWorldPosition.copy(best.point);
      this.onSelected?.(galaxyId, this.tempWorldPosition.clone());
    }
  };

  /** 幂等销毁：移除 pointer 监听并清引用。 */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.selectableObjects = [];
    this.destroyed = true;
  }
}
