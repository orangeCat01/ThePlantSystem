import type { PerspectiveCamera } from 'three';
import { TelescopeEngine } from '@/astronomy/TelescopeEngine';

/** FOV 下限（度）：避免倍率过高时投影退化。 */
const FOV_MIN_DEGREES = 0.1;

/**
 * 望远镜视场控制器（Phase 2.21）。
 *
 * 职责：管理 PerspectiveCamera.fov（进入望远镜时改变 FOV、保持相机位置；
 * 不创建第二 Camera；退出时恢复原 FOV）。
 *
 * 视觉模型：fov = 相机基础 fov / 倍率（1× 保持原视野，倍率越高视野越窄）。
 * 望远镜参数（标称视场/极限星等）由 TelescopeEngine 计算（纯数学）。
 *
 * 设计约束：
 * - deltaTime 驱动（本阶段 FOV 为事件级切换，update 保留接口）。
 * - 无 Tween / RAF / Timer。
 */
export class TelescopeViewController {
  private readonly camera: PerspectiveCamera;
  private readonly engine: TelescopeEngine;
  private readonly baseFov: number;
  private enabled = false;
  private zoom = 1;

  constructor(camera: PerspectiveCamera, engine: TelescopeEngine) {
    this.camera = camera;
    this.engine = engine;
    this.baseFov = camera.fov;
  }

  /** 当前是否处于望远镜模式。 */
  isEnabled(): boolean {
    return this.enabled;
  }

  /** 进入 / 退出望远镜模式（改变 FOV；退出恢复基础 FOV）。 */
  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) {
      return;
    }
    this.enabled = enabled;
    this.applyFov();
  }

  /** 设置倍率（[1, 128]；非法忽略；同时同步引擎）。 */
  setZoom(zoom: number): void {
    if (!Number.isFinite(zoom)) {
      return;
    }
    const clamped = Math.min(Math.max(zoom, 1), 128);
    this.zoom = clamped;
    this.engine.setZoom(clamped);
    if (this.enabled) {
      this.applyFov();
    }
  }

  /** 当前倍率。 */
  getZoom(): number {
    return this.zoom;
  }

  /** 当前视场角（度）：基础 FOV / 倍率。 */
  getFieldOfView(): number {
    return this.enabled ? Math.max(this.baseFov / this.zoom, FOV_MIN_DEGREES) : this.baseFov;
  }

  /** 当前极限星等（引擎计算：配置 + 倍率增益）。 */
  getLimitingMagnitude(): number {
    return this.engine.getLimitingMagnitude();
  }

  /** 每帧更新：本阶段 FOV 为事件级切换，接口保留。 */
  update(_deltaTime: number): void {
    return;
  }

  /** 恢复基础 FOV（幂等；退出望远镜时调用）。 */
  reset(): void {
    this.enabled = false;
    this.zoom = 1;
    this.engine.setZoom(1);
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
  }

  /** 把当前 FOV 应用到相机（仅望远镜模式时修改）。 */
  private applyFov(): void {
    this.camera.fov = this.getFieldOfView();
    this.camera.updateProjectionMatrix();
  }
}
