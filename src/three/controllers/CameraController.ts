import { Object3D, PerspectiveCamera, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CameraMode } from '@/types/common.types';

/** 聚焦过渡默认时长（秒）。 */
const FOCUS_DURATION = 1.2;
/** 复位过渡默认时长（秒）。 */
const RESET_DURATION = 1.0;
/** 跟随平滑系数（越大跟随越快）。 */
const FOLLOW_SPEED = 10;
/** 安全观察距离下限：目标视觉半径的倍数（防止相机进入天体内部）。 */
const MIN_SAFE_DISTANCE_MULTIPLIER = 2.5;
/** 观察方向向量长度下限平方（小于视为退化方向，改用安全方向）。 */
const MIN_DIRECTION_LENGTH_SQUARED = 1e-8;
/** 聚焦开始位置与目标重合时的安全观察方向。 */
const SAFE_VIEW_DIRECTION = new Vector3(1, 0.4, 1);

/** CameraController 构造依赖。 */
export interface CameraControllerOptions {
  readonly camera: PerspectiveCamera;
  readonly domElement: HTMLCanvasElement;
  readonly defaultPosition: Vector3;
  readonly defaultTarget: Vector3;
  readonly onModeChanged?: (mode: CameraMode) => void;
}

/** 聚焦选项。 */
export interface CameraFocusOptions {
  /** 观察距离（目标视觉半径的安全倍数由调用方或本模块保证）。 */
  readonly distance: number;
  /** 过渡时长（秒），可选，默认 FOCUS_DURATION。 */
  readonly duration?: number;
  /** 聚焦完成后的跟随模式（Phase 2.22）：默认 FOLLOWING；探测器跟随用 MISSION_FOLLOW。 */
  readonly followMode?: 'FOLLOWING' | 'MISSION_FOLLOW';
}

/** 有限时长相机过渡状态。 */
interface CameraTransition {
  readonly type: 'focus' | 'reset';
  readonly duration: number;
  elapsed: number;
  readonly startCameraPosition: Vector3;
  readonly startTarget: Vector3;
  readonly targetObject?: Object3D;
  /** 世界坐标聚焦目标（Phase 2.18；与 targetObject 互斥，优先使用）。 */
  readonly targetPosition?: Vector3;
  readonly focusDistance?: number;
  /** 聚焦完成后的跟随模式（Phase 2.22）。 */
  readonly followMode?: 'FOLLOWING' | 'MISSION_FOLLOW';
  readonly resolve: () => void;
}

/** easeInOutCubic 缓动。 */
function easeInOutCubic(value: number): number {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

/**
 * 相机控制器（Phase 2.7）。
 *
 * 职责：
 * - 创建并持有唯一 OrbitControls（所有权唯一，destroy 时 dispose）。
 * - 管理四种相机模式：FREE / FOCUSING / FOLLOWING / RESETTING（CameraMode 复用
 *   src/types/common.types.ts 中的既有类型，本阶段只保存在内部，不写入 Pinia）。
 * - 点击目标后的平滑聚焦与持续跟随，以及全局视角复位。
 * - 所有过渡由 update(deltaTime) 推进，不创建 RAF / Timer / Tween。
 *
 * 依赖边界：只依赖 Three.js、OrbitControls 与类型定义；
 * 不导入 Pinia / Vue / ApplicationCoordinator / PlanetRepository / PlanetManager /
 * SolarScene / InteractionManager 等模块；不访问 PlanetRepository，不通过
 * planetId 查找对象，只接收 Object3D 目标与普通配置。
 */
export class CameraController {
  private readonly camera: PerspectiveCamera;
  private readonly domElement: HTMLCanvasElement;
  private readonly controls: OrbitControls;
  private readonly defaultPosition: Vector3;
  private readonly defaultTarget: Vector3;
  private readonly onModeChanged?: (mode: CameraMode) => void;

  private mode: CameraMode = 'FREE';
  /** 进入望远镜模式前的相机模式（Phase 2.21；退出时恢复）。 */
  private telescopePreviousMode: CameraMode | null = null;
  private followTarget: Object3D | null = null;
  private transition: CameraTransition | null = null;
  private enabled = true;
  private destroyed = false;

  // 实例级复用临时对象，update 中禁止分配。
  private readonly tempTargetWorld = new Vector3();
  private readonly tempViewDirection = new Vector3();
  private readonly desiredCameraPosition = new Vector3();
  private readonly followDelta = new Vector3();
  private readonly transitionCamera = new Vector3();
  private readonly transitionTarget = new Vector3();

  constructor(options: CameraControllerOptions) {
    this.camera = options.camera;
    this.domElement = options.domElement;
    // 保存副本，不持有外部可变 Vector3 引用。
    this.defaultPosition = options.defaultPosition.clone();
    this.defaultTarget = options.defaultTarget.clone();
    this.onModeChanged = options.onModeChanged;

    this.controls = new OrbitControls(this.camera, this.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 80;
    this.controls.target.copy(this.defaultTarget);
    this.controls.update();
  }

  /**
   * 聚焦目标：相机从当前位置平滑移动到目标锚点的安全观察位置。
   * 新过渡开始前取消旧过渡；返回的 Promise 在过渡完成或取消时安全结束（resolve）。
   */
  focus(target: Object3D, options: CameraFocusOptions): Promise<void> {
    if (this.destroyed) {
      return Promise.reject(new Error('CameraController 已销毁，无法聚焦。'));
    }

    if (!Number.isFinite(options.distance) || options.distance <= 0) {
      return Promise.reject(new Error(`聚焦距离非法（distance=${options.distance}）。`));
    }

    if (target.parent === null) {
      return Promise.reject(new Error('聚焦目标已从场景移除，无法聚焦。'));
    }

    const duration = options.duration ?? FOCUS_DURATION;
    const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : FOCUS_DURATION;

    this.beginTransition('focus');
    return new Promise<void>((resolve) => {
      this.transition = {
        type: 'focus',
        duration: safeDuration,
        elapsed: 0,
        startCameraPosition: this.camera.position.clone(),
        startTarget: this.controls.target.clone(),
        targetObject: target,
        focusDistance: options.distance,
        followMode: options.followMode,
        resolve,
      };
    });
  }

  /**
   * 聚焦探测器（Phase 2.22）：过渡到探测器安全观察位置并进入 MISSION_FOLLOW 跟随。
   * 目标必须已挂入场景（MissionController 挂载后调用）。
   */
  focusSpacecraft(target: Object3D, distance: number): Promise<void> {
    return this.focus(target, { distance, followMode: 'MISSION_FOLLOW' });
  }

  /**
   * 跟随探测器（Phase 2.22）：不聚焦过渡，立即进入 MISSION_FOLLOW 跟随
   * （平滑平移 camera.position 与 controls.target，保留用户旋转与缩放）。
   */
  followSpacecraft(target: Object3D): void {
    if (this.destroyed) {
      return;
    }
    if (target.parent === null) {
      return;
    }
    this.beginTransition('reset');
    this.followTarget = target;
    this.setMode('MISSION_FOLLOW');
    this.controls.enabled = this.enabled;
  }

  /**
   * 按世界坐标聚焦（Phase 2.18）：适用于无 Object3D 锚点的目标（如恒星目录点）。
   * 与 focus() 语义一致：平滑过渡到目标的安全观察位置；目标位置在过渡期间固定。
   */
  focusPosition(position: Vector3, options: CameraFocusOptions): Promise<void> {
    if (this.destroyed) {
      return Promise.reject(new Error('CameraController 已销毁，无法聚焦。'));
    }

    if (!Number.isFinite(options.distance) || options.distance <= 0) {
      return Promise.reject(new Error(`聚焦距离非法（distance=${options.distance}）。`));
    }

    if (!Number.isFinite(position.x) || !Number.isFinite(position.y) || !Number.isFinite(position.z)) {
      return Promise.reject(new Error('聚焦位置非法（包含 NaN / Infinity）。'));
    }

    const duration = options.duration ?? FOCUS_DURATION;
    const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : FOCUS_DURATION;

    this.beginTransition('focus');
    return new Promise<void>((resolve) => {
      this.transition = {
        type: 'focus',
        duration: safeDuration,
        elapsed: 0,
        startCameraPosition: this.camera.position.clone(),
        startTarget: this.controls.target.clone(),
        targetPosition: position.clone(),
        focusDistance: options.distance,
        resolve,
      };
    });
  }

  /**
   * 聚焦恒星（Phase 2.19 便捷别名）：按世界坐标聚焦。
   * 与 focusPosition 等价；保留既有状态机（FREE / FOCUSING / FOLLOWING / RESETTING）。
   */
  focusStar(position: Vector3, options: CameraFocusOptions): Promise<void> {
    return this.focusPosition(position, options);
  }

  /** 复位到默认全局视角。可在任意模式调用，取消当前过渡与跟随。 */
  reset(duration?: number): Promise<void> {
    if (this.destroyed) {
      return Promise.resolve();
    }

    const target = duration ?? RESET_DURATION;
    const safeDuration = Number.isFinite(target) && target > 0 ? target : RESET_DURATION;

    this.beginTransition('reset');
    return new Promise<void>((resolve) => {
      this.transition = {
        type: 'reset',
        duration: safeDuration,
        elapsed: 0,
        startCameraPosition: this.camera.position.clone(),
        startTarget: this.controls.target.clone(),
        resolve,
      };
    });
  }

  /** 取消当前过渡与跟随（不触发新的过渡），模式回到 FREE 并重新启用 Controls。 */
  cancelTransition(): void {
    if (this.destroyed) {
      return;
    }

    this.cancelCurrentTransition();
    this.followTarget = null;
    if (this.mode !== 'FREE') {
      this.setMode('FREE');
    }
    this.controls.enabled = this.enabled;
  }

  /** 启用/禁用相机控制。禁用时取消过渡与跟随，并停止 Controls 用户输入。 */
  setEnabled(enabled: boolean): void {
    if (this.destroyed) {
      return;
    }

    this.enabled = enabled;
    if (!enabled) {
      this.cancelCurrentTransition();
      this.followTarget = null;
      if (this.mode !== 'FREE') {
        this.setMode('FREE');
      }
      this.controls.enabled = false;
    } else if (this.mode === 'FREE') {
      this.controls.enabled = true;
    }
  }

  getMode(): CameraMode {
    return this.mode;
  }

  /** 由唯一主 RAF（经 SolarScene.update）驱动；内部推进过渡/跟随并更新 Controls。 */
  update(deltaTime: number): void {
    if (this.destroyed) {
      return;
    }

    const safeDelta = Number.isFinite(deltaTime) && deltaTime > 0 ? deltaTime : 0;

    if (this.enabled) {
      if (this.transition) {
        this.updateTransition(this.transition, safeDelta);
      } else if (
        (this.mode === 'FOLLOWING' || this.mode === 'MISSION_FOLLOW') &&
        this.followTarget
      ) {
        this.updateFollow(safeDelta);
      }
    }

    // OrbitControls 的 damping 需要每帧 update；FREE 模式同样调用。
    this.controls.update();
  }

  /** 幂等销毁：取消过渡（Promise 安全结束）、释放跟随目标、dispose OrbitControls。 */
  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.cancelCurrentTransition();
    this.followTarget = null;
    this.controls.dispose();
  }

  /** 新操作开始前的公共处理：取消旧过渡、清空跟随、进入目标模式、临时禁用 Controls。 */
  private beginTransition(type: 'focus' | 'reset'): void {
    this.cancelCurrentTransition();
    this.followTarget = null;
    this.setMode(type === 'focus' ? 'FOCUSING' : 'RESETTING');
    this.controls.enabled = false;
  }

  /** 取消旧过渡：旧 Promise 以 resolve 结束（不产生未捕获 rejection）。 */
  private cancelCurrentTransition(): void {
    if (this.transition) {
      const previous = this.transition;
      this.transition = null;
      previous.resolve();
    }
  }

  private updateTransition(transition: CameraTransition, deltaTime: number): void {
    transition.elapsed += deltaTime;
    const rawProgress = transition.duration > 0 ? transition.elapsed / transition.duration : 1;
    const progress = Math.min(Math.max(rawProgress, 0), 1);
    const eased = easeInOutCubic(progress);

    if (transition.type === 'focus') {
      // 目标可能正在公转：每帧重新采样世界坐标，目标相机位置动态计算。
      if (transition.targetPosition) {
        // 位置模式（Phase 2.18）：目标位置固定（如恒星）。
        this.tempTargetWorld.copy(transition.targetPosition);
      } else if (transition.targetObject) {
        transition.targetObject.getWorldPosition(this.tempTargetWorld);
      } else {
        this.tempTargetWorld.set(0, 0, 0);
      }
      const targetWorld = this.tempTargetWorld;

      this.tempViewDirection.copy(transition.startCameraPosition).sub(transition.startTarget);
      if (this.tempViewDirection.lengthSq() < MIN_DIRECTION_LENGTH_SQUARED) {
        this.tempViewDirection.copy(SAFE_VIEW_DIRECTION);
      }
      this.tempViewDirection.normalize();
      this.desiredCameraPosition
        .copy(targetWorld)
        .addScaledVector(this.tempViewDirection, transition.focusDistance ?? 0);

      this.transitionCamera.lerpVectors(transition.startCameraPosition, this.desiredCameraPosition, eased);
      this.transitionTarget.lerpVectors(transition.startTarget, targetWorld, eased);
      this.camera.position.copy(this.transitionCamera);
      this.controls.target.copy(this.transitionTarget);
    } else {
      this.transitionCamera.lerpVectors(transition.startCameraPosition, this.defaultPosition, eased);
      this.transitionTarget.lerpVectors(transition.startTarget, this.defaultTarget, eased);
      this.camera.position.copy(this.transitionCamera);
      this.controls.target.copy(this.transitionTarget);
    }

    if (progress >= 1) {
      this.finishTransition(transition);
    }
  }

  private finishTransition(transition: CameraTransition): void {
    // 仅当前过渡仍持有控制权时才能完成（防旧过渡覆盖新模式）。
    if (this.transition !== transition || this.destroyed) {
      return;
    }

    this.transition = null;
    if (transition.type === 'focus') {
      this.followTarget = transition.targetObject ?? null;
      this.setMode(transition.followMode ?? 'FOLLOWING');
    } else {
      this.followTarget = null;
      this.setMode('FREE');
    }
    this.controls.enabled = this.enabled;
    transition.resolve();
  }

  /** 帧率无关的平滑跟随：同时平移 camera.position 与 controls.target，保留用户旋转与缩放。 */
  private updateFollow(deltaTime: number): void {
    const target = this.followTarget;
    if (!target) {
      return;
    }

    // 目标已从场景移除：安全退出 FOLLOWING。
    if (target.parent === null) {
      this.followTarget = null;
      this.setMode('FREE');
      return;
    }

    if (deltaTime <= 0) {
      return;
    }

    target.getWorldPosition(this.tempTargetWorld);
    this.followDelta.copy(this.tempTargetWorld).sub(this.controls.target);
    const factor = 1 - Math.exp(-FOLLOW_SPEED * deltaTime);
    this.followDelta.multiplyScalar(factor);
    this.controls.target.add(this.followDelta);
    this.camera.position.add(this.followDelta);
  }

  /**
   * 进入望远镜模式（Phase 2.21）：保持相机位置，仅标记模式状态
   * （FOV 由 TelescopeViewController 管理；不创建第二 Camera）。
   */
  enterTelescope(): void {
    if (this.mode === 'TELESCOPE') {
      return;
    }
    this.telescopePreviousMode = this.mode;
    this.setMode('TELESCOPE');
  }

  /** 退出望远镜模式（Phase 2.21）：恢复进入前的相机模式。 */
  exitTelescope(): void {
    if (this.mode !== 'TELESCOPE') {
      return;
    }
    const previous = this.telescopePreviousMode ?? 'FREE';
    this.telescopePreviousMode = null;
    this.setMode(previous);
  }

  private setMode(mode: CameraMode): void {
    if (this.mode === mode) {
      return;
    }
    this.mode = mode;
    this.onModeChanged?.(mode);
  }
}

/** 根据目标视觉半径计算安全观察距离（供 SolarScene 调用）。 */
export function computeSafeCameraDistance(distance: number, targetRadius: number): number {
  return Math.max(distance, targetRadius * MIN_SAFE_DISTANCE_MULTIPLIER);
}
