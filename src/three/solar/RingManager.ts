import { DoubleSide, Mesh, MeshBasicMaterial, RingGeometry } from 'three';
import type { ResourceManager } from '@/three/core/ResourceManager';
import type { PlanetRingConfig } from '@/types/planet.types';
import type { PlanetRuntime } from './solar.types';

/** 环圆周分段数（内/外径最大约 4.6 单位，128 已足够平滑）。 */
const RING_SEGMENT_COUNT = 128;

/**
 * 程序化天体环管理器（Phase 2.12.2，当前用于土星）。
 *
 * 职责：管理天体环系统（RingGeometry + MeshBasicMaterial，禁止 Shader / 后处理）。
 *
 * 层级与运动：
 * - 环 Mesh 挂到天体 bodyRoot（与模型同级）：
 *
 * ```text
 * SaturnBodyRoot
 * ├── SaturnRotationNode → ... → SaturnModel
 * └── SaturnRing
 * ```
 *
 * - 跟随公转（orbitNode 承载）与自转轴倾角（bodyRoot.rotation.z = axisTiltRadians）——
 *   环平面与自转轴保持一致；环不挂 rotationNode，不随天体自转。
 * - RingGeometry 默认在 XY 平面，创建时 rotateX(-π/2) 平铺到 XZ 赤道面（与模型一致）。
 *
 * Raycaster 隔离：环 Mesh 标记 userData.interactive = false，
 * 且不注册进 PlanetManager.getSelectableObjects()——点击天体只选中模型本体。
 *
 * 资源所有权：RingGeometry / MeshBasicMaterial 登记到 ResourceManager 指定资源组，
 * 由 releaseGroup 统一释放；destroy 只移除节点并清空引用。
 */
export class RingManager {
  private readonly resources: ResourceManager;
  private readonly resourceGroup: string;
  private readonly rings = new Map<string, Mesh>();
  private destroyed = false;

  constructor(resources: ResourceManager, resourceGroup: string) {
    this.resources = resources;
    this.resourceGroup = resourceGroup;
  }

  /**
   * 为天体创建程序化环。config 可选：显式覆盖天体配置的 ring（缺省读取 runtime.config.ring）。
   * 无 ring 配置、重复创建或已销毁状态抛出明确错误。
   */
  createRing(planetRuntime: PlanetRuntime, config?: PlanetRingConfig): Mesh {
    if (this.destroyed) {
      throw new Error('RingManager 已销毁，无法创建环。');
    }

    const ringConfig = config ?? planetRuntime.config.ring;
    if (!ringConfig) {
      throw new Error(`天体 ${planetRuntime.id} 没有 ring 配置，无法创建环。`);
    }

    if (this.rings.has(planetRuntime.id)) {
      throw new Error(`天体 ${planetRuntime.id} 的环已存在，禁止重复创建。`);
    }

    // 环尺寸由视觉半径 × 配置倍数计算，禁止硬编码（配置驱动）。
    const bodyRadius = planetRuntime.config.visual.radius * planetRuntime.config.visual.scale;
    const innerRadius = bodyRadius * ringConfig.innerRadiusScale;
    const outerRadius = bodyRadius * ringConfig.outerRadiusScale;
    if (!Number.isFinite(innerRadius) || !Number.isFinite(outerRadius) || outerRadius <= innerRadius) {
      throw new Error(
        `天体 ${planetRuntime.id} 的环半径非法（inner=${innerRadius}, outer=${outerRadius}）。`,
      );
    }

    // 先完整构建，成功后统一注册，避免半成品进入 Map。
    const geometry = new RingGeometry(innerRadius, outerRadius, RING_SEGMENT_COUNT);
    // RingGeometry 默认在 XY 平面，旋转到 XZ 赤道面（与行星模型自转轴 y 对齐）。
    geometry.rotateX(-Math.PI / 2);

    const material = new MeshBasicMaterial({
      color: ringConfig.color,
      transparent: true,
      opacity: ringConfig.opacity,
      side: DoubleSide,
      depthWrite: false,
    });

    const mesh = new Mesh(geometry, material);
    mesh.name = `${planetRuntime.id}-ring`;
    // Raycaster 隔离：环不可拾取（双保险：不注册进 selectableObjects + 标记防误用）。
    mesh.userData.interactive = false;

    // 挂 bodyRoot：继承公转位置与轴倾角，不受自转影响。
    planetRuntime.bodyRoot.add(mesh);

    this.resources.registerDisposable(this.resourceGroup, geometry);
    this.resources.registerDisposable(this.resourceGroup, material);
    this.rings.set(planetRuntime.id, mesh);
    return mesh;
  }

  /** 获取天体环 Mesh；未知 ID 返回 undefined。 */
  getRing(id: string): Mesh | undefined {
    return this.rings.get(id);
  }

  /** 环为静态几何（跟随天体运动），无独立动画；接口保留供未来环动画使用。 */
  update(_deltaTime: number): void {
    return;
  }

  /** 幂等销毁：移除全部环 Mesh 并清空 Map（资源由 releaseGroup 统一释放）。 */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.rings.forEach((mesh) => {
      mesh.parent?.remove(mesh);
    });
    this.rings.clear();
    this.destroyed = true;
  }
}
