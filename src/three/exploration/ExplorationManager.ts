import { Object3D } from 'three';
import type { CameraController } from '@/three/controllers/CameraController';
import type { ObservationController } from '@/three/controllers/ObservationController';
import type { ExplorationTargetType } from '@/types/exploration.types';

/** 恒星聚焦距离（场景单位：恒星位于 500+ 球壳，近距观察取 300）。 */
const STAR_FOCUS_DISTANCE = 300;

/**
 * 宇宙探索定位管理器（Phase 2.18）。
 *
 * 职责：统一目标定位（恒星 / 行星 / 卫星的相机聚焦与观察模式切换）。
 * - 恒星：按世界坐标聚焦（CameraController.focusPosition）+ 切换 FREE_EXPLORATION。
 * - 行星/卫星：由既有 SolarScene.focusPlanet（cameraAnchor）处理，本模块不重复。
 *
 * 设计约束：
 * - 组合 CameraController / ObservationController（不替换、不拥有）。
 * - 事件级操作（用户点击/搜索触发），无每帧逻辑；无新增 RAF / Timer。
 * - 锚点为纯 Object3D（无 GPU 资源）；destroy 幂等。
 */
export class ExplorationManager {
  /** 恒星聚焦锚点（挂 scene 供 CameraController 使用；位置在定位时更新）。 */
  readonly starFocusAnchor: Object3D;

  private readonly cameraController: CameraController;
  private readonly observationController: ObservationController;
  private destroyed = false;

  constructor(
    cameraController: CameraController,
    observationController: ObservationController,
  ) {
    this.cameraController = cameraController;
    this.observationController = observationController;

    this.starFocusAnchor = new Object3D();
    this.starFocusAnchor.name = 'exploration-star-focus-anchor';
    this.starFocusAnchor.position.set(0, 0, 0);
  }

  /**
   * 聚焦目标：恒星 / 深空天体按世界坐标定位并切换自由探索模式；
   * 行星/卫星返回 false（由调用方走 cameraAnchor 聚焦路径）。
   */
  focusTarget(
    type: ExplorationTargetType,
    worldPosition: { x: number; y: number; z: number } | null,
  ): Promise<void> | false {
    if (this.destroyed) {
      return false;
    }
    if (type !== 'star' && type !== 'deepSky') {
      return false;
    }
    if (!worldPosition) {
      return false;
    }

    // 自由探索模式：搜索定位后允许用户自由拖动。
    this.observationController.setMode('FREE_EXPLORATION');
    return this.cameraController.focusPosition(
      this.starFocusAnchor.position.set(worldPosition.x, worldPosition.y, worldPosition.z),
      { distance: STAR_FOCUS_DISTANCE },
    );
  }

  /** 幂等销毁：移除锚点并清引用（纯 Object3D，无 GPU 资源）。 */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.starFocusAnchor.removeFromParent();
    this.destroyed = true;
  }
}
