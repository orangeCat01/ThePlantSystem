/**
 * 哈雷彗星管理器（Phase 2.23）。
 *
 * 职责：管理彗星椭圆轨道、彗核、彗尾与轨道显示线（HalleyOrbit / HalleyComet）。
 *
 * 轨道算法（任务公式）：
 *   x = a·cos(θ)，z = b·sin(θ)，其中 a = semiMajorAxis，b = a·√(1−e²)
 *   高度偏心椭圆（哈雷 e=0.967 → b≈0.25·a），轨道中心在原点（太阳），
 *   彗星沿轨道公转（θ += speed·deltaTime）。
 *
 * 结构：
 *   HalleyOrbit（Line，椭圆采样 128 段，低可见度 0x5566aa）
 *   HalleyComet（group）
 *    ├── Nucleus（SphereGeometry 0.08 + MeshStandardMaterial；可点击，solarObjectId='halley'）
 *    └── Tail（Points 1000，沿背离太阳方向延伸，锥形收敛）
 *
 * 动画：每帧仅标量角度推进 + 1 次 group.position.set + 1 次 tail.rotation.y 赋值
 * （零每帧分配；禁止逐粒子更新）。
 *
 * 资源：geometry / material 登记 ResourceManager('solar')，releaseGroup 统一释放。
 */
import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Points,
  PointsMaterial,
  SphereGeometry,
} from 'three';
import type { ResourceManager } from '@/three/core/ResourceManager';
import type { SolarObjectConfig } from '@/types/solar-object.types';

/** 轨道线采样段数。 */
const ORBIT_SEGMENTS = 128;
/** 彗尾最大长度（演示单位）。 */
const TAIL_MAX_LENGTH = 6;
/** 彗尾横向扩散（相对长度比例）。 */
const TAIL_SPREAD = 0.06;

export class CometManager {
  private readonly resources: ResourceManager;
  private readonly resourceGroup: string;
  private group: Object3D | null = null;
  private orbitLine: Line | null = null;
  private nucleus: Mesh | null = null;
  private tail: Points | null = null;
  /** 椭圆参数（演示单位）。 */
  private semiMajorAxis = 17.8;
  private semiMinorAxis = 4.5;
  /** 轨道参数角（弧度；状态推进，不写回配置）。 */
  private orbitAngle = 0;
  private speed = 0.02;
  private destroyed = false;

  constructor(resourceManager: ResourceManager, resourceGroup: string) {
    this.resources = resourceManager;
    this.resourceGroup = resourceGroup;
  }

  /** 生成并挂载彗星（轨道线 + 彗核 + 彗尾；未知配置安全忽略）。 */
  create(parent: Object3D, config: SolarObjectConfig): void {
    if (this.destroyed) {
      return;
    }
    const semiMajorAxis = config.orbit.semiMajorAxis ?? 17.8;
    const eccentricity = config.orbit.eccentricity ?? 0.967;
    const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);
    this.semiMajorAxis = semiMajorAxis;
    this.semiMinorAxis = semiMinorAxis;
    this.speed = config.orbit.speed;
    const count = config.visual.count ?? 1000;

    // ---- HalleyOrbit：椭圆轨道显示线（低可见度，不抢行星轨道）。 ----
    const orbitPositions = new Float32Array((ORBIT_SEGMENTS + 1) * 3);
    for (let index = 0; index <= ORBIT_SEGMENTS; index += 1) {
      const angle = (index / ORBIT_SEGMENTS) * Math.PI * 2;
      orbitPositions[index * 3] = Math.cos(angle) * semiMajorAxis;
      orbitPositions[index * 3 + 1] = 0;
      orbitPositions[index * 3 + 2] = Math.sin(angle) * semiMinorAxis;
    }
    const orbitGeometry = new BufferGeometry();
    orbitGeometry.setAttribute('position', new Float32BufferAttribute(orbitPositions, 3));
    this.resources.registerDisposable(this.resourceGroup, orbitGeometry);
    const orbitMaterial = new LineBasicMaterial({
      color: 0x5566aa,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    this.resources.registerDisposable(this.resourceGroup, orbitMaterial);
    const orbitLine = new Line(orbitGeometry, orbitMaterial);
    orbitLine.name = 'halley-orbit';
    orbitLine.userData.interactive = false;
    parent.add(orbitLine);
    this.orbitLine = orbitLine;

    // ---- HalleyComet group（彗核 + 彗尾）。 ----
    const group = new Object3D();
    group.name = 'halley-comet';

    // 彗核：小于行星的岩石球（可点击；0.1 保证演示单位下可命中，仍远小于行星半径 1.2）。
    const nucleusGeometry = new SphereGeometry(0.1, 16, 12);
    this.resources.registerDisposable(this.resourceGroup, nucleusGeometry);
    const nucleusMaterial = new MeshStandardMaterial({
      color: 0x999999,
      roughness: 0.8,
      metalness: 0.1,
    });
    this.resources.registerDisposable(this.resourceGroup, nucleusMaterial);
    const nucleus = new Mesh(nucleusGeometry, nucleusMaterial);
    nucleus.name = 'halley-nucleus';
    nucleus.userData.interactive = true;
    group.add(nucleus);
    this.nucleus = nucleus;

    // 可点击标记设在 group：点击彗尾任意粒子或彗核均沿 parent 解析选中哈雷。
    group.userData.interactive = true;
    group.userData.solarObjectId = config.id;

    // 彗尾：Points 粒子沿背离太阳方向（局部 +x）延伸，锥形收敛。
    const tailPositions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const tailLength = Math.random() * TAIL_MAX_LENGTH;
      // 锥形：越远越窄（宽度随距离线性收敛）。
      const spread = TAIL_SPREAD * (1 - tailLength / TAIL_MAX_LENGTH);
      tailPositions[index * 3] = tailLength;
      tailPositions[index * 3 + 1] = (Math.random() * 2 - 1) * spread * tailLength;
      tailPositions[index * 3 + 2] = (Math.random() * 2 - 1) * spread * tailLength;
    }
    const tailGeometry = new BufferGeometry();
    tailGeometry.setAttribute('position', new Float32BufferAttribute(tailPositions, 3));
    this.resources.registerDisposable(this.resourceGroup, tailGeometry);
    const tailMaterial = new PointsMaterial({
      size: config.visual.size,
      color: config.visual.color,
      transparent: true,
      opacity: config.visual.opacity,
      depthWrite: false,
      blending: AdditiveBlending,
      sizeAttenuation: true,
    });
    this.resources.registerDisposable(this.resourceGroup, tailMaterial);
    const tail = new Points(tailGeometry, tailMaterial);
    tail.name = 'halley-tail';
    tail.userData.interactive = false;
    group.add(tail);
    this.tail = tail;

    parent.add(group);
    this.group = group;
    // 初始位置（θ=0：近日点方向）。
    group.position.set(semiMajorAxis, 0, 0);
    tail.rotation.y = 0;
  }

  /** 彗核对象（SolarScene 拾取注册用；未创建返回 null）。 */
  getNucleus(): Object3D | null {
    return this.nucleus;
  }

  /** 每帧更新（AnimationManager 驱动）：轨道角推进 + 位置写入（无每帧分配）。 */
  update(deltaTime: number): void {
    if (this.destroyed || !this.group || !this.tail) {
      return;
    }
    if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
      return;
    }
    this.orbitAngle += this.speed * Math.min(deltaTime, 1);
    // 椭圆轨道：x = a·cos(θ)，z = b·sin(θ)（太阳在原点，中心式近似）。
    const x = Math.cos(this.orbitAngle) * this.semiMajorAxis;
    const z = Math.sin(this.orbitAngle) * this.semiMinorAxis;
    this.group.position.set(x, 0, z);
    // 彗尾方向 = 背离太阳（太阳在原点）→ 尾沿 (cosθ, 0, sinθ)。
    // 局部 +x 绕 y 旋转 φ 后指向 (cosφ, 0, -sinφ)，取 φ = -θ。
    this.tail.rotation.y = -this.orbitAngle;
  }

  /** 幂等销毁：移除节点并清引用（Geometry/Material 由 releaseGroup 统一释放）。 */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.group?.removeFromParent();
    this.orbitLine?.removeFromParent();
    this.group = null;
    this.orbitLine = null;
    this.nucleus = null;
    this.tail = null;
    this.destroyed = true;
  }
}
