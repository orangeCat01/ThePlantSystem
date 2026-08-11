import {
  CanvasTexture,
  Mesh,
  MeshPhongMaterial,
  Object3D,
  RepeatWrapping,
  SphereGeometry,
  SRGBColorSpace,
} from 'three';
import type { ResourceManager } from '@/three/core/ResourceManager';
import { planetRepository } from '@/repositories/PlanetRepository';

/** 云层球半径：地球视觉半径的倍数。 */
const CLOUD_RADIUS_SCALE = 1.015;
/** 云层自转角速度（弧度/秒）：慢于地球地表自转（earth.rotation.speed = 0.5）。 */
const CLOUD_ROTATION_SPEED = 0.12;
/** 云纹理尺寸（宽 512 × 高 256，覆盖球面 UV 全展开）。 */
const CLOUD_TEXTURE_WIDTH = 512;
const CLOUD_TEXTURE_HEIGHT = 256;
/** 云层材质不透明度。 */
const CLOUD_OPACITY = 0.85;

/** 云斑定义（固定种子，确定性生成，避免每次加载纹理不同）。 */
const CLOUD_PATCHES: readonly (readonly [number, number, number, number, number])[] = [
  // [中心 u(0-1), 中心 v(0-1), 半径 x, 半径 y 比例, 不透明度]
  [0.18, 0.3, 0.16, 0.5, 0.9],
  [0.3, 0.62, 0.14, 0.45, 0.95],
  [0.48, 0.38, 0.18, 0.55, 0.85],
  [0.62, 0.68, 0.12, 0.4, 0.9],
  [0.75, 0.28, 0.15, 0.5, 0.88],
  [0.88, 0.55, 0.12, 0.42, 0.92],
  [0.4, 0.15, 0.1, 0.35, 0.8],
  [0.55, 0.85, 0.11, 0.38, 0.82],
];

/**
 * 生成云层纹理：半透明白色云斑（径向渐变椭圆），背景透明。
 * 仅初始化时调用一次；CanvasTexture 登记到 ResourceManager 统一释放。
 */
function createCloudTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = CLOUD_TEXTURE_WIDTH;
  canvas.height = CLOUD_TEXTURE_HEIGHT;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('无法创建 2D 上下文，地球云层纹理生成失败。');
  }

  context.clearRect(0, 0, CLOUD_TEXTURE_WIDTH, CLOUD_TEXTURE_HEIGHT);
  CLOUD_PATCHES.forEach(([u, v, radiusX, radiusYScale, alpha]) => {
    const x = u * CLOUD_TEXTURE_WIDTH;
    const y = v * CLOUD_TEXTURE_HEIGHT;
    const radiusY = radiusX * radiusYScale * CLOUD_TEXTURE_HEIGHT;

    context.save();
    context.translate(x, y);
    context.scale(1, radiusY / (radiusX * CLOUD_TEXTURE_WIDTH));
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radiusX * CLOUD_TEXTURE_WIDTH);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    gradient.addColorStop(0.6, `rgba(255, 255, 255, ${alpha * 0.5})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(0, 0, radiusX * CLOUD_TEXTURE_WIDTH, 0, Math.PI * 2);
    context.fill();
    context.restore();
  });

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  // 水平环绕：云层跨球面接缝时连续（SphereGeometry UV 水平 0→1）。
  texture.wrapS = RepeatWrapping;
  return texture;
}

/**
 * 地球云层视觉增强（Phase 2.12.3-一）。
 *
 * 职责：为地球创建独立于地表的半透明云层球，并驱动其独立缓慢旋转。
 *
 * 层级：
 *
 * ```text
 * EarthBodyRoot
 * ├── EarthRotationNode → EarthModel（地表，受地球自转驱动）
 * └── EarthCloudMesh（云层，独立自转，速度慢于地表）
 * ```
 *
 * - 云层挂 bodyRoot：继承公转位置与自转轴倾角；不挂 rotationNode，独立旋转。
 * - 云层旋转 deltaTime 驱动（旋转角状态累加），禁止时间戳/Tween。
 * - 材质 MeshPhongMaterial（受太阳点光源照明的半透明云），禁止 Shader。
 * - 不参与天体拾取：云层不注册进 selectableObjects，并写入 interactive 标记防误用。
 *
 * 资源所有权：SphereGeometry / MeshPhongMaterial / CanvasTexture 登记到
 * ResourceManager 指定资源组，由 releaseGroup 统一释放；destroy 只移除节点并清空引用。
 */
export class EarthCloudEffect {
  private readonly parent: Object3D;
  private readonly resources: ResourceManager;
  private readonly resourceGroup: string;
  private mesh: Mesh | null = null;
  private rotationAngle = 0;
  private destroyed = false;

  constructor(parent: Object3D, resources: ResourceManager, resourceGroup: string) {
    this.parent = parent;
    this.resources = resources;
    this.resourceGroup = resourceGroup;
  }

  /** 创建云层球并挂载（幂等；半径从地球配置计算，不硬编码）。 */
  create(): Mesh {
    if (this.destroyed || this.mesh) {
      throw new Error('EarthCloudEffect 已销毁或云层已存在，无法重复创建。');
    }

    const earth = planetRepository.getById('earth');
    if (!earth) {
      throw new Error('PlanetRepository 中找不到 earth 配置，无法创建云层。');
    }
    const earthRadius = earth.visual.radius * earth.visual.scale;
    if (!Number.isFinite(earthRadius) || earthRadius <= 0) {
      throw new Error(`地球视觉半径非法（${earthRadius}），无法创建云层。`);
    }

    const geometry = new SphereGeometry(earthRadius * CLOUD_RADIUS_SCALE, 48, 24);
    const texture = createCloudTexture();
    const material = new MeshPhongMaterial({
      map: texture,
      transparent: true,
      opacity: CLOUD_OPACITY,
      depthWrite: false,
    });

    const mesh = new Mesh(geometry, material);
    mesh.name = 'earth-cloud';
    mesh.userData.interactive = false;

    this.parent.add(mesh);

    this.resources.registerDisposable(this.resourceGroup, geometry);
    this.resources.registerDisposable(this.resourceGroup, material);
    this.resources.registerDisposable(this.resourceGroup, texture);

    this.mesh = mesh;
    return mesh;
  }

  /** 每帧驱动云层独立旋转（deltaTime，慢于地表自转）。 */
  update(deltaTime: number): void {
    if (this.destroyed || !this.mesh) {
      return;
    }
    if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
      return;
    }

    this.rotationAngle += deltaTime * CLOUD_ROTATION_SPEED;
    this.mesh.rotation.y = this.rotationAngle;
  }

  /** 幂等销毁：移除云层 Mesh 并清空引用（资源由 releaseGroup 统一释放）。 */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    if (this.mesh) {
      this.parent.remove(this.mesh);
      this.mesh = null;
    }
    this.destroyed = true;
  }
}
