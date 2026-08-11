import { BufferGeometry, Color, Float32BufferAttribute, Line, LineBasicMaterial, Object3D } from 'three';
import type { ResourceManager } from '@/three/core/ResourceManager';
import type { TrajectoryPoint } from '@/types/mission.types';

/** 历史轨迹颜色（已飞过的部分）。 */
const PAST_COLOR = 0x7ee08a;
/** 未来轨迹颜色（未飞行的部分）。 */
const FUTURE_COLOR = 0x8fa3c8;

/**
 * 任务轨迹渲染器（Phase 2.22）。
 *
 * 职责：以 Line + LineBasicMaterial 显示探测器轨迹（历史/未来两段）。
 *
 * 约束：
 * - 禁止 Shader / 动态重建 Geometry：轨迹点在初始化时一次性写入 BufferGeometry，
 *   播放时只通过 Line.drawRange 调整可见段（历史 = 起点→当前点，未来 = 当前点→终点）。
 * - 历史/未来两条 Line 共享同一 Geometry（各自 drawRange），无逐帧顶点更新。
 */
export class TrajectoryRenderer {
  /** 轨迹线根节点（挂 scene 使用）。 */
  readonly root = new Object3D();

  /** 历史轨迹线（已飞过：起点 → 当前点）。 */
  readonly pastLine: Line;
  /** 未来轨迹线（未飞过：当前点 → 终点）。 */
  readonly futureLine: Line;

  private readonly geometry: BufferGeometry;
  private readonly resources: ResourceManager;
  private readonly resourceGroup: string;
  private totalPoints = 0;
  private destroyed = false;

  constructor(resources: ResourceManager, resourceGroup: string) {
    this.resources = resources;
    this.resourceGroup = resourceGroup;

    this.geometry = new BufferGeometry();
    this.resources.registerDisposable(this.resourceGroup, this.geometry);

    const pastMaterial = new LineBasicMaterial({ color: new Color(PAST_COLOR) });
    const futureMaterial = new LineBasicMaterial({
      color: new Color(FUTURE_COLOR),
      transparent: true,
      opacity: 0.45,
    });
    this.resources.registerDisposable(this.resourceGroup, pastMaterial);
    this.resources.registerDisposable(this.resourceGroup, futureMaterial);

    this.pastLine = new Line(this.geometry, pastMaterial);
    this.pastLine.name = 'trajectory-past';
    this.futureLine = new Line(this.geometry, futureMaterial);
    this.futureLine.name = 'trajectory-future';

    this.pastLine.frustumCulled = false;
    this.futureLine.frustumCulled = false;

    this.root.name = 'trajectory';
    this.root.userData.interactive = false;
    this.root.add(this.pastLine, this.futureLine);
  }

  /**
   * 设置轨迹（初始化一次：全部点写入 Geometry；重复设置会重建——仅在 loadMission 时调用）。
   * 返回 true 表示轨迹有效；空轨迹返回 false。
   */
  setTrajectory(points: readonly TrajectoryPoint[]): boolean {
    if (this.destroyed) {
      return false;
    }
    if (points.length < 2) {
      return false;
    }

    const vertices = new Float32Array(points.length * 3);
    points.forEach((point, index) => {
      vertices[index * 3] = point.position.x;
      vertices[index * 3 + 1] = point.position.y;
      vertices[index * 3 + 2] = point.position.z;
    });
    // 初始化一次（loadMission 时才调用；播放期间不重建）。
    this.geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    this.totalPoints = points.length;
    this.updateProgress(0);
    return true;
  }

  /**
   * 更新轨迹显示进度（播放驱动）：past = [0, currentIndex]，future = [currentIndex, total]。
   * 只修改 drawRange，不重建 Geometry / 不修改顶点。
   */
  updateProgress(currentIndex: number): void {
    if (this.destroyed || this.totalPoints < 2) {
      return;
    }
    const clamped = Math.min(Math.max(currentIndex, 0), this.totalPoints - 1);
    this.pastLine.geometry.setDrawRange(0, clamped + 1);
    this.futureLine.geometry.setDrawRange(clamped, this.totalPoints - clamped);
  }

  /** 每帧更新：轨迹为静态（drawRange 事件级更新），接口保留。 */
  update(_deltaTime: number): void {
    return;
  }

  /** 幂等销毁：移除节点并清空引用（几何/材质由 releaseGroup 统一释放）。 */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.root.removeFromParent();
    this.totalPoints = 0;
    this.destroyed = true;
  }
}
