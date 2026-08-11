import { Object3D } from 'three';
import type { ObservationMode } from '@/types/common.types';
import type { CameraController } from './CameraController';
import { starRepository } from '@/repositories/StarRepository';
import { starDirection, type StarPosition3D } from '@/astronomy/stars/StarCoordinateConverter';

/** STELLAR_VIEW：相机与观察中心的距离（场景单位，足以俯瞰太阳系与深空）。 */
const STELLAR_VIEW_DISTANCE = 900;
/** CONSTELLATION_VIEW：相机与星座观察中心的距离。 */
const CONSTELLATION_VIEW_DISTANCE = 380;
/** CONSTELLATION_VIEW 观察中心距原点距离（星座区域方向）。 */
const CONSTELLATION_CENTER_DISTANCE = 300;

/**
 * 深空观察模式控制器（Phase 2.17）。
 *
 * 职责：控制相机距离、观察中心与模式切换：
 * - SOLAR_SYSTEM：默认太阳系视角（复位 CameraController）。
 * - STELLAR_VIEW：相机远移到深空俯瞰位置，看向太阳系原点（恒星球壳可见）。
 * - CONSTELLATION_VIEW：相机移向星座区域方向，看向星座观察中心（以猎户座为默认目标）。
 *
 * 设计约束：
 * - 组合 CameraController（不替换）：模式切换通过 CameraController.focus 过渡实现。
 * - 观察中心锚点对象在构造时创建一次（不每帧创建对象）。
 * - 无逐帧逻辑（update 空操作保留接口）；禁止新增 RAF / Timer。
 *
 * 生命周期：destroy 幂等，移除锚点并清引用（锚点为纯 Object3D，无 GPU 资源）。
 */
export class ObservationController {
  private readonly cameraController: CameraController;
  /** 恒星观测中心锚点（挂 scene 供 CameraController 聚焦）。 */
  readonly stellarAnchor: Object3D;
  /** 星座观测中心锚点（挂 scene 供 CameraController 聚焦）。 */
  readonly constellationAnchor: Object3D;
  private readonly tempDirection: StarPosition3D = { x: 0, y: 0, z: 0 };
  private mode: ObservationMode = 'SOLAR_SYSTEM';
  private destroyed = false;

  constructor(cameraController: CameraController) {
    this.cameraController = cameraController;

    // 恒星观测中心：太阳系原点（相机在远处俯瞰整个系统）。
    this.stellarAnchor = new Object3D();
    this.stellarAnchor.name = 'observation-stellar-anchor';

    // 星座观测中心：默认指向猎户座方向（星座数据驱动，不硬编码坐标）。
    this.constellationAnchor = new Object3D();
    this.constellationAnchor.name = 'observation-constellation-anchor';
    this.updateConstellationAnchor();
  }

  /** 当前观察模式。 */
  getMode(): ObservationMode {
    return this.mode;
  }

  /** 切换观察模式（相机过渡由 CameraController 驱动；destroy 后安全返回）。 */
  setMode(mode: ObservationMode): void {
    if (this.destroyed) {
      return;
    }
    this.mode = mode;

    switch (mode) {
      case 'SOLAR_SYSTEM':
        void this.cameraController.reset();
        break;
      case 'STELLAR_VIEW':
        void this.cameraController.focus(this.stellarAnchor, {
          distance: STELLAR_VIEW_DISTANCE,
        });
        break;
      case 'CONSTELLATION_VIEW':
        void this.cameraController.focus(this.constellationAnchor, {
          distance: CONSTELLATION_VIEW_DISTANCE,
        });
        break;
      case 'FREE_EXPLORATION':
        // 自由探索（Phase 2.18）：保持当前相机视角，不改变观察中心。
        break;
      case 'STAR_CATALOG':
        // 星表模式（Phase 2.19）：搜索/聚焦恒星后的状态；聚焦已由 focusStar 完成，
        // 此处保持当前相机视角（不改变观察中心）。
        break;
      case 'NIGHT_OBSERVATION':
        // 夜间观测模式（Phase 2.20）：设置观测地点后进入；保持当前相机视角，
        // 可见性由 ObservationEngine 驱动（标签隐藏/显示）。
        break;
      case 'TELESCOPE':
        // 望远镜模式（Phase 2.21）：保持相机位置与观察中心；
        // FOV 与星等过滤由 TelescopeViewController / StarCatalogManager 驱动。
        break;
    }
  }

  /** 每帧更新：本阶段无逐帧行为（模式切换为一次性过渡），接口保留。 */
  update(_deltaTime: number): void {
    return;
  }

  /** 幂等销毁：移除观察锚点并清引用（纯 Object3D，无 GPU 资源释放）。 */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.stellarAnchor.removeFromParent();
    this.constellationAnchor.removeFromParent();
    this.destroyed = true;
  }

  /**
   * 星座观察中心 = 猎户座主星（参宿四）方向 × 固定距离。
   * 方向由赤经/赤纬计算（数据驱动）；观测锚点挂 scene 由调用方添加。
   */
  private updateConstellationAnchor(): void {
    const betelgeuse = starRepository.getById('betelgeuse');
    if (!betelgeuse) {
      return;
    }
    if (
      !starDirection(
        betelgeuse.position.rightAscension,
        betelgeuse.position.declination,
        this.tempDirection,
      )
    ) {
      return;
    }
    this.constellationAnchor.position.set(
      this.tempDirection.x * CONSTELLATION_CENTER_DISTANCE,
      this.tempDirection.y * CONSTELLATION_CENTER_DISTANCE,
      this.tempDirection.z * CONSTELLATION_CENTER_DISTANCE,
    );
  }
}
