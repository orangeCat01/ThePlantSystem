import type { CameraController } from '@/three/controllers/CameraController';
import type { SpacecraftManager } from '@/three/mission/SpacecraftManager';
import type { TrajectoryRenderer } from '@/three/mission/TrajectoryRenderer';
import type { SpaceMission, TrajectoryPoint } from '@/types/mission.types';
import type { Sprite } from 'three';
import { MissionClock } from '@/mission/MissionClock';

/** 探测器聚焦观察距离（场景单位）。 */
const SPACECRAFT_FOCUS_DISTANCE = 8;

/** 日期比较（YYYY-MM-DD 字符串按字典序即可比较）。 */
function compareDates(a: string, b: string): number {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

/** 日期毫秒（UTC；非法返回 NaN）。 */
function dateToMillis(date: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    return Number.NaN;
  }
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/**
 * 任务控制器（Phase 2.22）。
 *
 * 职责：管理探测器视觉对象（SpacecraftManager）、轨迹线（TrajectoryRenderer）
 * 与任务播放状态（MissionClock）。
 *
 * 时间流：AnimationManager → MissionController.update(deltaTime) → MissionClock
 * → 轨迹进度 / 探测器位置更新。
 *
 * 约束：
 * - 不创建 RAF / setInterval / setTimeout / Tween（播放由场景 update 驱动）。
 * - 轨迹 Geometry 初始化一次（loadMission 时），播放只改 drawRange 与探测器位置。
 * - 每帧复用临时对象，禁止 new Vector3 / Array / Geometry。
 */
export class MissionController {
  private readonly cameraController: CameraController;
  private readonly spacecraftManager: SpacecraftManager;
  private readonly trajectoryRenderer: TrajectoryRenderer;
  private readonly clock = new MissionClock('1970-01-01');
  private currentMission: SpaceMission | null = null;
  private trajectory: readonly TrajectoryPoint[] = [];
  /** 插值复用对象（禁止每帧 new）。 */
  private readonly tempPosition = { x: 0, y: 0, z: 0 };
  /** 任务日期上报回调（UI 状态同步；节流触发，Phase 2.22）。 */
  private readonly onDateChanged: ((date: string) => void) | null;
  /** 上报节流累积器（秒）。 */
  private dateReportAccumulator = 0;
  private destroyed = false;

  constructor(
    cameraController: CameraController,
    spacecraftManager: SpacecraftManager,
    trajectoryRenderer: TrajectoryRenderer,
    onDateChanged?: (date: string) => void,
  ) {
    this.cameraController = cameraController;
    this.spacecraftManager = spacecraftManager;
    this.trajectoryRenderer = trajectoryRenderer;
    this.onDateChanged = onDateChanged ?? null;
  }

  /** 加载任务（幂等安全：重复加载先卸载旧任务；未知任务返回 false）。 */
  loadMission(mission: SpaceMission | null): boolean {
    if (this.destroyed) {
      return false;
    }
    if (!mission) {
      return false;
    }
    if (this.currentMission?.id === mission.id) {
      // 同一任务重复加载：不重建（避免重复创建探测器）。
      return true;
    }

    this.unloadCurrentMission();

    const ok = this.trajectoryRenderer.setTrajectory(mission.trajectory);
    if (!ok) {
      return false;
    }
    this.currentMission = mission;
    this.trajectory = mission.trajectory;
    // 任务时钟：从发射日期开始（默认播放；暂停由 play/pause 控制）。
    this.clock.reset(mission.launchDate);
    for (const spacecraft of mission.spacecraft) {
      this.spacecraftManager.create(spacecraft);
    }
    // 初始位置：轨迹起点。
    const start = mission.trajectory[0];
    if (start) {
      for (const spacecraft of mission.spacecraft) {
        this.spacecraftManager.setPosition(spacecraft.id, start.position);
      }
    }
    return true;
  }

  /** 当前任务（null 表示未加载）。 */
  getCurrentMission(): SpaceMission | null {
    return this.currentMission;
  }

  /** 播放（恢复时间推进）。 */
  play(): void {
    this.clock.setPaused(false);
  }

  /** 暂停（时间停止推进）。 */
  pause(): void {
    this.clock.setPaused(true);
  }

  /** 重置：回到任务发射日期与轨迹起点。 */
  reset(): void {
    const mission = this.currentMission;
    if (!mission) {
      return;
    }
    this.clock.reset(mission.launchDate);
    this.trajectoryRenderer.updateProgress(0);
    const start = mission.trajectory[0];
    if (start) {
      for (const spacecraft of mission.spacecraft) {
        this.spacecraftManager.setPosition(spacecraft.id, start.position);
      }
    }
  }

  /** 设置播放速度（[1, 10000] 钳制）。 */
  setSpeed(speed: number): void {
    this.clock.setSpeed(speed);
  }

  /** 当前任务日期（YYYY-MM-DD）。 */
  getMissionDate(): string {
    return this.clock.getMissionDate();
  }

  /** 当前速度倍率。 */
  getSpeed(): number {
    return this.clock.getSpeed();
  }

  /** 是否暂停。 */
  isPaused(): boolean {
    return this.clock.isPaused();
  }

  /** 获取探测器视觉对象；未知 ID 返回 undefined（供 CameraController 聚焦/跟随）。 */
  getSpacecraftObject(spacecraftId: string): ReturnType<SpacecraftManager['getObject']> {
    return this.spacecraftManager.getObject(spacecraftId);
  }

  /** 全部探测器视觉对象（供 InteractionManager 注册拾取）。 */
  getSpacecraftObjects(): Iterable<Sprite> {
    return this.spacecraftManager.spacecraft.values();
  }

  /** 聚焦探测器（相机过渡到探测器附近并跟随）。 */
  focusSpacecraft(spacecraftId: string): Promise<void> {
    const target = this.getSpacecraftObject(spacecraftId);
    if (!target) {
      return Promise.resolve();
    }
    return this.cameraController.focusSpacecraft(target, SPACECRAFT_FOCUS_DISTANCE);
  }

  /** 跟随探测器（不聚焦过渡，立即进入 MISSION_FOLLOW）。 */
  followSpacecraft(spacecraftId: string): void {
    const target = this.getSpacecraftObject(spacecraftId);
    if (!target) {
      return;
    }
    this.cameraController.followSpacecraft(target);
  }

  /** 卸载当前任务：移除探测器与轨迹（幂等；资源由 releaseGroup 统一释放）。 */
  unloadCurrentMission(): void {
    this.spacecraftManager.clear();
    this.trajectoryRenderer.setTrajectory([]);
    this.currentMission = null;
    this.trajectory = [];
  }

  /** 每帧更新（AnimationManager 驱动）：任务时钟推进 → 轨迹进度 / 探测器位置。 */
  update(deltaTime: number): void {
    if (this.destroyed || !this.currentMission) {
      return;
    }
    this.clock.update(deltaTime);
    const date = this.clock.getMissionDate();
    const index = this.findTrajectoryIndex(date);
    this.trajectoryRenderer.updateProgress(index);

    // 日期上报节流（0.25s 一次，避免高频 Store 更新；仅播放时上报）。
    if (this.onDateChanged && !this.clock.isPaused()) {
      this.dateReportAccumulator += deltaTime;
      if (this.dateReportAccumulator >= 0.25) {
        this.dateReportAccumulator = 0;
        this.onDateChanged(date);
      }
    }

    const position = this.interpolatePosition(index, date);
    for (const spacecraft of this.currentMission.spacecraft) {
      this.spacecraftManager.setPosition(spacecraft.id, position);
    }
  }

  /** 幂等销毁：卸载任务并清空引用（几何/材质由 releaseGroup 统一释放）。 */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.unloadCurrentMission();
    this.destroyed = true;
  }

  /** 二分查找：最后一个 date <= 目标日期的轨迹点索引（无则 0）。 */
  private findTrajectoryIndex(date: string): number {
    const points = this.trajectory;
    if (points.length === 0) {
      return 0;
    }
    let low = 0;
    let high = points.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      const midPoint = points[mid];
      if (midPoint && compareDates(midPoint.date, date) <= 0) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }
    return low;
  }

  /** 按日期在相邻轨迹点间线性插值（复用 tempPosition，禁止每帧 new）。 */
  private interpolatePosition(index: number, date: string): { x: number; y: number; z: number } {
    const points = this.trajectory;
    const current = points[index];
    if (!current) {
      return this.tempPosition;
    }
    const next = points[Math.min(index + 1, points.length - 1)];
    if (!next || next === current) {
      this.tempPosition.x = current.position.x;
      this.tempPosition.y = current.position.y;
      this.tempPosition.z = current.position.z;
      return this.tempPosition;
    }

    const currentMillis = dateToMillis(current.date);
    const nextMillis = dateToMillis(next.date);
    const targetMillis = dateToMillis(date);
    let t = 0;
    if (Number.isFinite(currentMillis) && Number.isFinite(nextMillis) && nextMillis > currentMillis) {
      t = Math.min(Math.max((targetMillis - currentMillis) / (nextMillis - currentMillis), 0), 1);
    }

    this.tempPosition.x = current.position.x + (next.position.x - current.position.x) * t;
    this.tempPosition.y = current.position.y + (next.position.y - current.position.y) * t;
    this.tempPosition.z = current.position.z + (next.position.z - current.position.z) * t;
    return this.tempPosition;
  }
}

