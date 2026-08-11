/**
 * 小行星带管理器（Phase 2.23）。
 *
 * 职责：生成火星-木星之间的小行星带粒子（BufferGeometry + THREE.Points，
 * 禁止 Mesh / InstancedMesh / ShaderMaterial），挂载、整体旋转、销毁。
 *
 * 生成算法：
 * - 环带半径：inner + random × (outer - inner)，再叠加半径扰动（避免完美圆环）。
 * - 角度：random × 2π；坐标 x = cos(angle)×radius，z = sin(angle)×radius。
 * - 高度：randomPower 聚集扰动（y 集中在黄道面附近，形成不规则岩石带）。
 *
 * 动画：禁止逐粒子 position 更新；只允许整体旋转
 * （rotation.y += deltaTime × speed，speed 来自配置 0.004）。
 *
 * 资源：geometry / material 登记 ResourceManager('solar')，releaseGroup 统一释放；
 * destroy 只移除节点与清引用（幂等）。
 */
import {
  BufferGeometry,
  Float32BufferAttribute,
  Object3D,
  Points,
  PointsMaterial,
} from 'three';
import type { ResourceManager } from '@/three/core/ResourceManager';
import type { SolarObjectConfig } from '@/types/solar-object.types';

/** 高度扰动幅度（黄道面上下 ±0.15 演示单位）。 */
const VERTICAL_SPREAD = 0.15;
/** 半径扰动幅度（演示单位；避免完美圆环）。 */
const RADIUS_JITTER = 0.3;

export class AsteroidBeltManager {
  private readonly resources: ResourceManager;
  private readonly resourceGroup: string;
  private points: Points | null = null;
  private speed = 0.004;
  private destroyed = false;

  constructor(resourceManager: ResourceManager, resourceGroup: string) {
    this.resources = resourceManager;
    this.resourceGroup = resourceGroup;
  }

  /** 生成并挂载小行星带（config 提供环带范围/数量/视觉；未知配置安全忽略）。 */
  create(parent: Object3D, config: SolarObjectConfig): void {
    if (this.destroyed) {
      return;
    }
    const innerRadius = config.orbit.innerRadius ?? 12.5;
    const outerRadius = config.orbit.outerRadius ?? 15.5;
    const count = config.visual.count ?? 8000;
    this.speed = config.orbit.speed;

    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      // 环带半径 + 半径扰动（不形成完美圆环）。
      const radius =
        innerRadius + Math.random() * (outerRadius - innerRadius) + (Math.random() * 2 - 1) * RADIUS_JITTER;
      // 角度均匀分布。
      const angle = Math.random() * Math.PI * 2;
      // 高度扰动：randomPower 聚集（幂次越高越贴近黄道面）。
      const heightJitter = (Math.random() * 2 - 1) * Math.pow(Math.random(), 2) * VERTICAL_SPREAD;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = heightJitter;
      positions[index * 3 + 2] = Math.sin(angle) * radius;
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    this.resources.registerDisposable(this.resourceGroup, geometry);

    const material = new PointsMaterial({
      size: config.visual.size,
      color: config.visual.color,
      transparent: true,
      opacity: config.visual.opacity,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.resources.registerDisposable(this.resourceGroup, material);

    const points = new Points(geometry, material);
    points.name = 'asteroid-belt';
    // 小行星带不可点击（Phase 2.23 十七）。
    points.userData.interactive = false;
    parent.add(points);
    this.points = points;
  }

  /** 每帧更新（AnimationManager 驱动）：整体慢转，禁止逐粒子更新。 */
  update(deltaTime: number): void {
    if (this.destroyed || !this.points) {
      return;
    }
    if (Number.isFinite(deltaTime) && deltaTime > 0) {
      this.points.rotation.y += this.speed * Math.min(deltaTime, 1);
    }
  }

  /** 幂等销毁：移除节点并清引用（Geometry/Material 由 releaseGroup 统一释放）。 */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.points?.removeFromParent();
    this.points = null;
    this.destroyed = true;
  }
}
