import type { PerspectiveCamera } from 'three';
import { Object3D, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/** 聚焦过渡时长（秒）。 */
const FOCUS_DURATION = 1.4;
/** 默认聚焦距离（观察银河对象）。 */
const DEFAULT_FOCUS_DISTANCE = 80;

/** easeInOutCubic 缓动。 */
function easeInOutCubic(value: number): number {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

/** 有限时长聚焦过渡状态。 */
interface GalaxyFocusTransition {
  readonly duration: number;
  elapsed: number;
  readonly startPosition: Vector3;
  readonly endPosition: Vector3;
  readonly startTarget: Vector3;
  readonly endTarget: Vector3;
}

/**
 * 银河相机控制器（Phase 2.17）。
 *
 * 职责：银河系三维展示的观察相机（旋转 / 缩放），默认观察银河整体。
 * - 不是宇宙航行：不飞行、不自由穿越（限制距离与极角，禁止平移）。
 * - 结构类似 Solar CameraController（OrbitControls + damping），但无聚焦/跟随状态机。
 *
 * 生命周期：destroy 幂等（OrbitControls.dispose 释放事件监听与指针状态）。
 */
export class GalaxyCameraController {
  readonly camera: PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly defaultPosition: { x: number; y: number; z: number };
  private readonly defaultTarget: { x: number; y: number; z: number };
  private transition: GalaxyFocusTransition | null = null;
  private destroyed = false;

  constructor(
    camera: PerspectiveCamera,
    domElement: HTMLElement,
    options: {
      readonly defaultPosition?: { x: number; y: number; z: number };
      readonly defaultTarget?: { x: number; y: number; z: number };
      readonly minDistance?: number;
      readonly maxDistance?: number;
      /** 允许的极角范围（弧度，默认 [0.15, π/2.2]，保持俯视盘面）。 */
      readonly minPolarAngle?: number;
      readonly maxPolarAngle?: number;
    } = {},
  ) {
    this.camera = camera;
    this.defaultPosition = options.defaultPosition ?? { x: 0, y: 55, z: 130 };
    this.defaultTarget = options.defaultTarget ?? { x: 0, y: 0, z: 0 };

    this.controls = new OrbitControls(camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    // 禁止平移：观察模式不允许穿越飞行。
    this.controls.enablePan = false;
    this.controls.enableZoom = true;
    this.controls.minDistance = options.minDistance ?? 30;
    this.controls.maxDistance = options.maxDistance ?? 420;
    this.controls.minPolarAngle = options.minPolarAngle ?? 0.15;
    this.controls.maxPolarAngle = options.maxPolarAngle ?? Math.PI / 2.2;
    this.controls.target.set(
      this.defaultTarget.x,
      this.defaultTarget.y,
      this.defaultTarget.z,
    );
    camera.position.set(
      this.defaultPosition.x,
      this.defaultPosition.y,
      this.defaultPosition.z,
    );
    this.controls.update();
  }

  /** 每帧更新（AnimationManager 驱动）：聚焦过渡 + damping。 */
  update(deltaTime: number): void {
    if (this.destroyed) {
      return;
    }
    if (this.transition) {
      this.transition.elapsed += Math.min(deltaTime, 1);
      const progress = Math.min(this.transition.elapsed / this.transition.duration, 1);
      const eased = easeInOutCubic(progress);
      const t = this.transition;
      this.camera.position.lerpVectors(t.startPosition, t.endPosition, eased);
      this.controls.target.lerpVectors(t.startTarget, t.endTarget, eased);
      if (progress >= 1) {
        this.transition = null;
      }
    }
    this.controls.update();
  }

  /**
   * 平滑聚焦到目标对象（Phase 2.19；不飞行/不穿越——仅相机位置与观察中心的
   * 有限时长过渡，目标保持可旋转缩放）。返回的 Promise 在过渡完成或取消时安全结束。
   */
  focus(target: Object3D, distance?: number): Promise<void> {
    const targetPosition = new Vector3();
    target.getWorldPosition(targetPosition);
    const safeDistance = Number.isFinite(distance) && (distance as number) > 0
      ? (distance as number)
      : DEFAULT_FOCUS_DISTANCE;
    return this.startFocusTransition(targetPosition, safeDistance);
  }

  /**
   * 平滑聚焦到世界坐标（Phase 2.19；旋臂等无单点锚对象使用命中点）。
   */
  focusPosition(position: Vector3, distance?: number): Promise<void> {
    const safeDistance = Number.isFinite(distance) && (distance as number) > 0
      ? (distance as number)
      : DEFAULT_FOCUS_DISTANCE;
    return this.startFocusTransition(position, safeDistance);
  }

  /** 开始聚焦过渡：终点 = 目标点 + 沿当前视线方向的观察距离。 */
  private startFocusTransition(targetPosition: Vector3, distance: number): Promise<void> {
    if (this.destroyed) {
      return Promise.resolve();
    }
    // 终点位置：从目标点沿当前相机朝向（目标→相机方向）退 distance。
    const direction = new Vector3().subVectors(this.camera.position, this.controls.target);
    if (direction.lengthSq() < 1e-6) {
      direction.set(0, 1, 0);
    }
    direction.normalize();
    const endPosition = targetPosition.clone().addScaledVector(direction, distance);

    this.transition = {
      duration: FOCUS_DURATION,
      elapsed: 0,
      startPosition: this.camera.position.clone(),
      endPosition,
      startTarget: this.controls.target.clone(),
      endTarget: targetPosition.clone(),
    };
    return Promise.resolve();
  }

  /** 复位到默认观察位（观察银河整体；取消进行中的聚焦过渡）。 */
  reset(): void {
    if (this.destroyed) {
      return;
    }
    this.transition = null;
    this.controls.target.set(
      this.defaultTarget.x,
      this.defaultTarget.y,
      this.defaultTarget.z,
    );
    this.camera.position.set(
      this.defaultPosition.x,
      this.defaultPosition.y,
      this.defaultPosition.z,
    );
    this.controls.update();
  }

  /** 幂等销毁：释放 OrbitControls（事件监听 / 指针状态）。 */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.controls.dispose();
    this.destroyed = true;
  }
}
