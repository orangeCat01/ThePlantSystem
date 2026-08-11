import { Camera, Object3D, Raycaster, Vector2 } from 'three';

/** 默认点击阈值（像素）：移动距离平方不超过该值视为点击。 */
const DEFAULT_CLICK_THRESHOLD_PIXELS = 6;

/** InteractionManager 构造依赖。 */
export interface InteractionManagerOptions {
  readonly camera: Camera;
  readonly domElement: HTMLCanvasElement;
  readonly onPlanetSelected: (planetId: string) => void;
  /** 小天体选择回调（Phase 2.23）：命中彗核等上报 objectId（solarObjectId），可选。 */
  readonly onSolarObjectSelected?: (objectId: string) => void;
  /** 恒星选择回调（Phase 2.17）：Raycaster 命中星点顶点时上报 starId，可选。 */
  readonly onStarSelected?: (starId: string) => void;
  /** 统一目标选择回调（Phase 2.18 / 2.21 / 2.22）：上报 { id, type }；旧回调保留兼容。 */
  readonly onTargetSelected?: (target: {
    id: string;
    type: 'planet' | 'moon' | 'star' | 'deepSky' | 'spacecraft';
  }) => void;
  /** 目标类型解析器（Phase 2.18，可选）：由场景层注入，把 planetId 映射为 planet/moon。 */
  readonly resolveTargetType?: (planetId: string) => 'planet' | 'moon' | 'star' | undefined;
  /** 空白点击回调（Phase 2.13.2）：点击未命中任何可选天体时调用一次，可选。 */
  readonly onEmptySelected?: () => void;
  readonly clickThresholdPixels?: number;
  /**
   * 是否使用 Pointer Capture（默认 true）。
   * 与 OrbitControls 共存时（Phase 2.7 起）应设为 false：
   * OrbitControls 负责拖动期间的 Pointer Capture，InteractionManager 只观察点击。
   */
  readonly usePointerCapture?: boolean;
}

/**
 * 将客户端坐标转换为 NDC（Normalized Device Coordinates），写入 target。
 *
 * 使用 Canvas 自身边界（getBoundingClientRect）计算，兼容 CSS 缩放与高 DPI；
 * 不使用 window.innerWidth / innerHeight 与 renderer 内部像素尺寸。
 * 返回 false 表示无法计算（Canvas 尺寸无效）或坐标位于 Canvas 边界外。
 */
export function toNormalizedDeviceCoordinates(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  target: Vector2,
): boolean {
  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }

  const normalizedX = ((clientX - rect.left) / rect.width) * 2 - 1;
  const normalizedY = -((clientY - rect.top) / rect.height) * 2 + 1;

  if (normalizedX < -1 || normalizedX > 1 || normalizedY < -1 || normalizedY > 1) {
    return false;
  }

  target.set(normalizedX, normalizedY);
  return true;
}

/**
 * Canvas Pointer 交互管理器（Phase 2.6）。
 *
 * 职责：
 * - 只在注入的 Canvas 上监听 pointerdown / pointermove / pointerup / pointercancel。
 * - 区分点击与拖动（移动距离平方阈值）。
 * - 仅在有效点击时通过 Raycaster 检测 PlanetManager 注册的可选对象。
 * - 命中后沿 parent 解析 userData.planetId，通过类型化回调上报一次。
 * - 点击未命中任何可选对象时（空白、太阳、轨道、高亮等不可拾取区域），
 *   通过 onEmptySelected 上报一次（Phase 2.13.2 用于取消选择）。
 * - 不创建 Camera / Renderer，不读取 Scene / Pinia，不依赖 Vue。
 * - 不存在逐帧逻辑，不创建 RAF / Timer。
 *
 * 生命周期：constructor 中完成依赖保存并注册事件；destroy 幂等，移除事件、
 * 释放指针捕获、清空活动指针与可选对象。
 */
export class InteractionManager {
  private readonly camera: Camera;
  private readonly domElement: HTMLCanvasElement;
  private readonly onPlanetSelected: (planetId: string) => void;
  private readonly onSolarObjectSelected: ((objectId: string) => void) | null;
  private readonly onStarSelected: ((starId: string) => void) | null;
  private readonly onTargetSelected:
    | ((target: {
        id: string;
        type: 'planet' | 'moon' | 'star' | 'deepSky' | 'spacecraft';
      }) => void)
    | null;
  private readonly resolveTargetType: ((planetId: string) => 'planet' | 'moon' | 'star' | undefined) | null;
  private readonly onEmptySelected: (() => void) | null;
  private readonly clickThresholdSquared: number;
  private readonly usePointerCapture: boolean;
  private readonly raycaster = new Raycaster();
  private readonly pointerNdc = new Vector2();

  private selectableObjects: Object3D[] = [];
  /** 小天体可拾取对象（Phase 2.23；哈雷彗星彗核 Mesh）。 */
  private solarObjectSelectableObjects: Object3D[] = [];
  /** 恒星可拾取对象（Phase 2.17；通常为 StarCatalogRenderer.points，顶点索引解析 starId）。 */
  /** 恒星可拾取对象（Phase 2.17；Sprite 每星 / 兼容 Points）。 */
  private starSelectableObjects: Object3D[] = [];
  /** 深空天体可拾取对象（Phase 2.21；Sprite 每深空天体）。 */
  private deepSkySelectableObjects: Object3D[] = [];
  /** 探测器可拾取对象（Phase 2.22；Sprite 每探测器）。 */
  private spacecraftSelectableObjects: Object3D[] = [];
  private activePointerId: number | null = null;
  private pointerDownX = 0;
  private pointerDownY = 0;
  private maxMovementSquared = 0;
  private enabled = true;
  private destroyed = false;
  private attached = false;

  constructor(options: InteractionManagerOptions) {
    this.camera = options.camera;
    this.domElement = options.domElement;
    this.onPlanetSelected = options.onPlanetSelected;
    this.onSolarObjectSelected = options.onSolarObjectSelected ?? null;
    this.onStarSelected = options.onStarSelected ?? null;
    this.onTargetSelected = options.onTargetSelected ?? null;
    this.resolveTargetType = options.resolveTargetType ?? null;
    this.onEmptySelected = options.onEmptySelected ?? null;
    const threshold = options.clickThresholdPixels ?? DEFAULT_CLICK_THRESHOLD_PIXELS;
    // 保存平方值，PointerMove 中避免平方根计算。
    this.clickThresholdSquared = threshold * threshold;
    this.usePointerCapture = options.usePointerCapture ?? true;
    this.attach();
  }

  /** 设置 Raycaster 检测目标（浅拷贝，通常来自 PlanetManager.getSelectableObjects）。 */
  setSelectableObjects(objects: readonly Object3D[]): void {
    if (this.destroyed) {
      return;
    }

    this.selectableObjects = [...objects];
  }

  /** 设置小天体可拾取对象（Phase 2.23；哈雷彗星彗核；小行星带不注册）。 */
  setSolarObjectSelectableObjects(objects: readonly Object3D[]): void {
    if (this.destroyed) {
      return;
    }
    this.solarObjectSelectableObjects = [...objects];
  }

  /** 设置恒星可拾取对象（Phase 2.17；独立于行星列表，通常为 StarCatalogManager 的 Sprite）。 */
  setStarSelectableObjects(objects: readonly Object3D[]): void {
    if (this.destroyed) {
      return;
    }

    this.starSelectableObjects = [...objects];
  }

  /** 设置深空天体可拾取对象（Phase 2.21；独立于行星/恒星列表）。 */
  setDeepSkySelectableObjects(objects: readonly Object3D[]): void {
    if (this.destroyed) {
      return;
    }

    this.deepSkySelectableObjects = [...objects];
  }

  /** 设置探测器可拾取对象（Phase 2.22；独立于其他列表；轨迹线保持不可点击）。 */
  setSpacecraftSelectableObjects(objects: readonly Object3D[]): void {
    if (this.destroyed) {
      return;
    }

    this.spacecraftSelectableObjects = [...objects];
  }

  setEnabled(enabled: boolean): void {
    if (this.destroyed) {
      return;
    }

    this.enabled = enabled;
    if (!enabled) {
      this.resetPointerState();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** 幂等销毁：移除事件监听、释放指针捕获、清空状态与可选对象。 */
  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.detach();
    this.resetPointerState();
    this.selectableObjects = [];
    this.solarObjectSelectableObjects = [];
    this.starSelectableObjects = [];
    this.deepSkySelectableObjects = [];
    this.spacecraftSelectableObjects = [];
    this.destroyed = true;
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (this.destroyed || !this.enabled) {
      return;
    }

    // 鼠标只接受主按键；触摸/笔不检查 button。
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    // 只处理主要指针：已有活动指针时忽略新指针。
    if (this.activePointerId !== null) {
      return;
    }

    this.activePointerId = event.pointerId;
    this.pointerDownX = event.clientX;
    this.pointerDownY = event.clientY;
    this.maxMovementSquared = 0;
    this.setPointerCapture(event.pointerId);
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (this.activePointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - this.pointerDownX;
    const deltaY = event.clientY - this.pointerDownY;
    const movementSquared = deltaX * deltaX + deltaY * deltaY;
    if (movementSquared > this.maxMovementSquared) {
      this.maxMovementSquared = movementSquared;
    }
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (this.activePointerId !== event.pointerId) {
      return;
    }

    const isClick = this.maxMovementSquared <= this.clickThresholdSquared;
    const clientX = event.clientX;
    const clientY = event.clientY;

    // 先完成指针状态清理（含捕获释放），再执行命中检测与回调，
    // 避免回调抛错破坏内部状态。
    this.releasePointerCapture(event.pointerId);
    this.resetPointerState();

    if (isClick) {
      this.performPick(clientX, clientY);
    }
  };

  private readonly handlePointerCancel = (event: PointerEvent): void => {
    if (this.activePointerId !== event.pointerId) {
      return;
    }

    this.releasePointerCapture(event.pointerId);
    this.resetPointerState();
  };

  private performPick(clientX: number, clientY: number): void {
    if (this.destroyed || !this.enabled) {
      return;
    }

    if (
      this.selectableObjects.length === 0 &&
      this.solarObjectSelectableObjects.length === 0 &&
      this.starSelectableObjects.length === 0 &&
      this.deepSkySelectableObjects.length === 0 &&
      this.spacecraftSelectableObjects.length === 0
    ) {
      // 没有可拾取对象时，任何点击都是空白：直接上报空选择。
      this.onEmptySelected?.();
      return;
    }

    const rect = this.domElement.getBoundingClientRect();
    if (!toNormalizedDeviceCoordinates(clientX, clientY, rect, this.pointerNdc)) {
      return;
    }

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);

    // recursive = true：为未来 GLB 多层子 Mesh 命中预留；恒星 Points 无子对象。
    const intersections = this.raycaster.intersectObjects(
      [
        ...this.selectableObjects,
        ...this.solarObjectSelectableObjects,
        ...this.starSelectableObjects,
        ...this.deepSkySelectableObjects,
        ...this.spacecraftSelectableObjects,
      ],
      true,
    );
    for (const intersection of intersections) {
      const planetId = this.resolvePlanetId(intersection.object);
      if (planetId !== undefined) {
        // 只调用一次回调：第一个（最近的）具有有效 planetId 的命中对象。
        this.onPlanetSelected(planetId);
        // 统一目标事件（Phase 2.18）：类型由注入的解析器提供（缺省 planet）。
        this.onTargetSelected?.({
          id: planetId,
          type: this.resolveTargetType?.(planetId) ?? 'planet',
        });
        return;
      }
      const solarObjectId = this.resolveSolarObjectId(intersection.object);
      if (solarObjectId !== undefined) {
        // 小天体选择（Phase 2.23）：彗核命中优先上报。
        this.onSolarObjectSelected?.(solarObjectId);
        return;
      }
      const starId = this.resolveStarId(intersection);
      if (starId !== undefined) {
        // 恒星选择（Phase 2.17）：行星优先级高于恒星（近处天体优先）。
        this.onStarSelected?.(starId);
        this.onTargetSelected?.({ id: starId, type: 'star' });
        return;
      }
      const deepSkyId = this.resolveDeepSkyId(intersection);
      if (deepSkyId !== undefined) {
        // 深空天体选择（Phase 2.21）：优先级低于恒星（深层球壳）。
        this.onTargetSelected?.({ id: deepSkyId, type: 'deepSky' });
        return;
      }
      const spacecraftId = this.resolveSpacecraftId(intersection);
      if (spacecraftId !== undefined) {
        // 探测器选择（Phase 2.22）：优先级最低（体积小且常位于行星附近）。
        this.onTargetSelected?.({ id: spacecraftId, type: 'spacecraft' });
        return;
      }
    }

    // 未命中任何可选天体（空白、太阳、轨道、高亮等）：上报空选择一次。
    this.onEmptySelected?.();
  }

  /**
   * 从命中解析恒星 ID（Phase 2.17 / 2.19）：
   * - 统一约定（Phase 2.19）：object.userData.targetType === 'star' + targetId（Sprite 每星）。
   * - 兼容通道：Points 顶点命中 intersection.index → userData.starIds[index]；
   *   单星对象 userData.starId。
   */
  private resolveStarId(intersection: { object: Object3D; index?: number }): string | undefined {
    const targetType = intersection.object.userData.targetType;
    if (targetType === 'star') {
      const targetId = intersection.object.userData.targetId;
      if (typeof targetId === 'string' && targetId.length > 0) {
        return targetId;
      }
    }
    const starIds = intersection.object.userData.starIds;
    if (
      Array.isArray(starIds) &&
      typeof intersection.index === 'number' &&
      intersection.index >= 0 &&
      intersection.index < starIds.length
    ) {
      const id = starIds[intersection.index];
      if (typeof id === 'string' && id.length > 0) {
        return id;
      }
    }
    const starId = intersection.object.userData.starId;
    return typeof starId === 'string' && starId.length > 0 ? starId : undefined;
  }

  /**
   * 从命中解析探测器 ID（Phase 2.22）：
   * - 统一约定：object.userData.targetType === 'spacecraft' + targetId（Sprite 每探测器）。
   */
  private resolveSpacecraftId(intersection: { object: Object3D }): string | undefined {
    const targetType = intersection.object.userData.targetType;
    if (targetType !== 'spacecraft') {
      return undefined;
    }
    const targetId = intersection.object.userData.targetId;
    return typeof targetId === 'string' && targetId.length > 0 ? targetId : undefined;
  }

  /**
   * 从命中解析深空天体 ID（Phase 2.21）：
   * - 统一约定：object.userData.targetType === 'deepSky' + targetId（Sprite 每深空天体）。
   */
  private resolveDeepSkyId(intersection: { object: Object3D }): string | undefined {
    const targetType = intersection.object.userData.targetType;
    if (targetType !== 'deepSky') {
      return undefined;
    }
    const targetId = intersection.object.userData.targetId;
    return typeof targetId === 'string' && targetId.length > 0 ? targetId : undefined;
  }

  /**
   * 从命中对象开始沿 parent 向上查找 userData.planetId。
   *
   * - 非字符串或空字符串视为无效（不做强制转换，不使用 any）。
   * - 不通过对象 name 猜测 planetId。
   * - 向上遍历到 Object3D 层级根为止；selectable 子树之外没有 planetId 标记，
   *   因此不会越界误报。
   */
  /**
   * 从命中对象沿 parent 向上查找 userData.solarObjectId（Phase 2.23）。
   * 规则与 resolvePlanetId 一致：字符串且非空才有效。
   */
  private resolveSolarObjectId(object: Object3D): string | undefined {
    let current: Object3D | null = object;
    while (current) {
      const objectId = current.userData.solarObjectId;
      if (typeof objectId === 'string' && objectId.length > 0) {
        return objectId;
      }
      current = current.parent;
    }
    return undefined;
  }

  private resolvePlanetId(object: Object3D): string | undefined {
    let current: Object3D | null = object;
    while (current) {
      const planetId = current.userData.planetId;
      if (typeof planetId === 'string' && planetId.length > 0) {
        return planetId;
      }
      current = current.parent;
    }
    return undefined;
  }

  private resetPointerState(): void {
    if (this.activePointerId !== null) {
      this.releasePointerCapture(this.activePointerId);
    }
    this.activePointerId = null;
    this.pointerDownX = 0;
    this.pointerDownY = 0;
    this.maxMovementSquared = 0;
  }

  private setPointerCapture(pointerId: number): void {
    if (!this.usePointerCapture) {
      return;
    }
    if (typeof this.domElement.setPointerCapture !== 'function') {
      return;
    }
    try {
      this.domElement.setPointerCapture(pointerId);
    } catch {
      // 浏览器不支持或指针状态异常时忽略，不导致页面崩溃。
    }
  }

  private releasePointerCapture(pointerId: number): void {
    if (!this.usePointerCapture) {
      return;
    }
    if (typeof this.domElement.hasPointerCapture !== 'function') {
      return;
    }
    try {
      if (this.domElement.hasPointerCapture(pointerId)) {
        this.domElement.releasePointerCapture(pointerId);
      }
    } catch {
      // 释放失败忽略。
    }
  }

  private attach(): void {
    if (this.attached) {
      return;
    }

    this.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.domElement.addEventListener('pointerup', this.handlePointerUp);
    this.domElement.addEventListener('pointercancel', this.handlePointerCancel);
    this.attached = true;
  }

  private detach(): void {
    if (!this.attached) {
      return;
    }

    this.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.domElement.removeEventListener('pointercancel', this.handlePointerCancel);
    this.attached = false;
  }
}
