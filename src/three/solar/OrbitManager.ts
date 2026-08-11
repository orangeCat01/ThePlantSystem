import {
  BufferAttribute,
  BufferGeometry,
  LineBasicMaterial,
  LineLoop,
  Object3D,
} from 'three';
import type { ResourceManager } from '@/three/core/ResourceManager';
import type { PlanetConfig } from '@/types/planet.types';
import type { OrbitRuntime } from './solar.types';

/** 轨道圆分段数（当前单条轨道，128 已足够平滑）。 */
const ORBIT_SEGMENT_COUNT = 128;

/**
 * 生成圆形轨道顶点（XZ 平面，y = 0）。
 *
 * 与公转坐标约定一致：EarthBodyRoot.position.x = orbit.radius、
 * EarthOrbitNode.rotation.y = orbitAngle，实际路径位于 XZ 平面。
 * 一次性分配 Float32Array，仅初始化调用，动画循环中不重建。
 */
export function createCircularOrbitPositions(radius: number, segmentCount: number): Float32Array {
  const positions = new Float32Array(segmentCount * 3);

  for (let index = 0; index < segmentCount; index += 1) {
    const angle = (index / segmentCount) * Math.PI * 2;
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = 0;
    positions[index * 3 + 2] = Math.sin(angle) * radius;
  }

  return positions;
}

/**
 * 轨道可视化管理器（Phase 2.5）。
 *
 * 职责边界：
 * - 只负责轨道可视化对象，不负责天体运动。
 * - 不修改 PlanetRuntime.orbitAngle，不调用 PlanetManager.update。
 * - 不拥有主动画循环，不存在逐帧更新方法。
 * - 不读取 Pinia。
 *
 * 轨道语义：
 * - `orbit.radius` 控制轨道圆半径。
 * - `orbit.inclinationRadians` 控制轨道平面倾角（作用于轨道根节点）。
 * - `orbitAngle` 控制天体当前相位，与轨道线无关（轨道表示完整路径，不表示相位）。
 * - `orbit.enabled === false` 时不创建轨道（明确行为）。
 * - `orbit.centerBodyId` 指定轨道中心（Phase 2.11）：
 *   卫星轨道由调用方传入中心天体对象（主星 bodyRoot），轨道线跟随主星移动；
 *   绕太阳的轨道缺省挂到构造父节点（SolarSystemRoot，太阳位于原点）。
 *
 * 资源所有权：本模块创建的 BufferGeometry / LineBasicMaterial 登记到
 * ResourceManager 指定资源组，由 releaseGroup 统一 dispose；
 * destroy 只移除节点并清空引用，不重复 dispose。
 */
export class OrbitManager {
  private readonly parent: Object3D;
  private readonly resources: ResourceManager;
  private readonly resourceGroup: string;
  private readonly orbits = new Map<string, OrbitRuntime>();
  private visible = true;
  private destroyed = false;

  constructor(parent: Object3D, resources: ResourceManager, resourceGroup: string) {
    this.parent = parent;
    this.resources = resources;
    this.resourceGroup = resourceGroup;
  }

  /**
   * 根据配置创建轨道线。重复 ID、已销毁状态或非法配置会抛出明确错误。
   * centerObject 可选：指定轨道挂载中心（如卫星轨道挂主星 bodyRoot），
   * 缺省挂到构造时注入的父节点（太阳系原点）。
   */
  createOrbit(config: PlanetConfig, centerObject?: Object3D): OrbitRuntime {
    if (this.destroyed) {
      throw new Error('OrbitManager 已销毁，无法创建轨道。');
    }

    if (!config.orbit.enabled) {
      // 明确行为：orbit.enabled === false 时不创建轨道。
      throw new Error(`天体 ${config.id} 的 orbit.enabled 为 false，不创建轨道。`);
    }

    if (this.orbits.has(config.id)) {
      throw new Error(`轨道 ${config.id} 已存在，禁止重复创建。`);
    }

    const radius = config.orbit.radius;
    if (!Number.isFinite(radius) || radius <= 0) {
      throw new Error(`轨道 ${config.id} 的半径非法（radius=${radius}）。`);
    }

    const inclination = config.orbit.inclinationRadians;
    if (!Number.isFinite(inclination)) {
      throw new Error(`轨道 ${config.id} 的倾角非法（inclinationRadians=${inclination}）。`);
    }

    // 先完整构建，成功后统一注册，避免半成品进入 Map。
    const runtime = this.buildOrbit(config);
    this.orbits.set(config.id, runtime);
    const targetParent = centerObject ?? this.parent;
    targetParent.add(runtime.root);
    // 新创建的轨道继承当前全局可见状态。
    runtime.root.visible = this.visible;
    return runtime;
  }

  getOrbit(id: string): OrbitRuntime | undefined {
    return this.orbits.get(id);
  }

  /** 全局显示/隐藏所有已注册轨道，并保存默认状态供后续新轨道继承。 */
  setVisible(visible: boolean): void {
    if (this.destroyed) {
      return;
    }

    this.visible = visible;
    this.orbits.forEach((runtime) => {
      runtime.visible = visible;
      runtime.root.visible = visible;
    });
  }

  /** 单独显示/隐藏指定天体轨道。 */
  setOrbitVisible(id: string, visible: boolean): void {
    if (this.destroyed) {
      return;
    }

    const runtime = this.orbits.get(id);
    if (runtime) {
      runtime.visible = visible;
      runtime.root.visible = visible;
    }
  }

  /** 幂等销毁：移除全部轨道根节点并清空 Map。GPU 资源由 ResourceManager 释放。 */
  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.orbits.forEach((runtime) => {
      // 用实际父节点移除（卫星轨道可能挂在主星 bodyRoot 下，而非构造父节点）。
      runtime.root.parent?.remove(runtime.root);
    });
    this.orbits.clear();
    this.destroyed = true;
  }

  private buildOrbit(config: PlanetConfig): OrbitRuntime {
    const root = new Object3D();
    root.name = `${config.id}-orbit-visual-root`;
    // 轨道平面倾角作用于根节点；不随天体公转相位移动。
    root.rotation.z = config.orbit.inclinationRadians;

    // 一次性分配顶点并创建静态 Geometry。
    const positions = createCircularOrbitPositions(config.orbit.radius, ORBIT_SEGMENT_COUNT);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));

    const material = new LineBasicMaterial({
      color: 0x4e78a8,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });

    const line = new LineLoop(geometry, material);
    line.name = `${config.id}-orbit-line`;
    // 轨道不参与天体选择：Phase 2.6 InteractionManager 只检测
    // PlanetManager.getSelectableObjects() 注册的对象，此处再写入标记防止误用。
    line.userData.interactive = false;

    root.add(line);

    // 所有权：本模块创建并登记，由 ResourceManager.releaseGroup 统一释放。
    this.resources.registerDisposable(this.resourceGroup, geometry);
    this.resources.registerDisposable(this.resourceGroup, material);

    return {
      planetId: config.id,
      root,
      line,
      visible: this.visible,
    };
  }
}
