import { Box3, Material, MathUtils, Mesh, Object3D, Sphere, Texture, Vector3 } from 'three';
import type { ResourceManager } from '@/three/core/ResourceManager';
import { modelLoader } from '@/three/loaders/ModelLoader';
import type { PlanetConfig } from '@/types/planet.types';
import type { PlanetRuntime, PlanetUpdateOptions } from './solar.types';

/** 一个完整圆周的弧度数。 */
const TWO_PI = Math.PI * 2;

/**
 * 标准化模型变换：几何中心归零 + 按目标半径缩放。
 *
 * GLTF 模型尺寸未知，不能假设 1:1；通过包围盒包围球半径计算缩放：
 * scale = (targetRadius / modelRadius) * scale，使模型视觉半径接近目标半径。
 * 几何中心归零：将包围盒中心平移到模型局部原点（只调整节点 position，不修改共享 Geometry）。
 * 不影响 bodyRoot.position 与 orbitNode（模型挂载于 rotationNode 下）。
 * 创建时调用一次，非每帧操作。
 */
export function normalizeModelTransform(model: Object3D, targetRadius: number, scale: number): void {
  // 1. 原始（scale=1）包围盒：求模型实际半径（包含内部 Group -> Node -> Mesh
  //    嵌套节点的全部变换，Box3.setFromObject 递归展开）。
  const box = new Box3().setFromObject(model);
  const sphere = box.getBoundingSphere(new Sphere());
  const modelRadius = sphere.radius;

  if (!Number.isFinite(modelRadius) || modelRadius <= 0) {
    throw new Error(`模型包围球半径非法（${modelRadius}），无法归一化缩放。`);
  }

  // 2. 先设置缩放（缩放以模型局部原点为中心，会把几何中心一并放大）。
  const finalScale = (targetRadius / modelRadius) * scale;
  model.scale.setScalar(finalScale);

  // 3. 缩放后再求几何包围盒中心并归零平移：补偿「缩放放大内部节点偏移」
  //   （如木星/太阳节点带 translation），保证模型局部原点（即自转中心）
  //   与几何包围盒中心严格重合，自转不再偏心。
  const scaledBox = new Box3().setFromObject(model);
  const center = scaledBox.getCenter(new Vector3());
  model.position.sub(center);
}

/**
 * 登记 GLTF 模型树内的全部 GPU 资源（Geometry / Material / Texture）到指定资源组。
 *
 * 只登记不释放：释放由 ResourceManager.releaseGroup 统一处理。
 * GLTF.scene 可能包含多个 Mesh，因此需要 traverse 收集。
 */
export function registerModelResources(
  model: Object3D,
  resources: ResourceManager,
  resourceGroup: string,
): void {
  model.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }

    resources.registerDisposable(resourceGroup, object.geometry);
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      resources.registerDisposable(resourceGroup, material);
      collectMaterialTextures(material).forEach((texture) => {
        resources.registerDisposable(resourceGroup, texture);
      });
    });
  });
}

/** 收集材质实例属性中的全部 Texture（覆盖 GLTFLoader 常用槽位与自定义槽位）。 */
function collectMaterialTextures(material: Material): Texture[] {
  const textures: Texture[] = [];
  const properties = material as unknown as Record<string, unknown>;

  Object.keys(properties).forEach((key) => {
    const value = properties[key];
    if (value instanceof Texture) {
      textures.push(value);
    } else if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item instanceof Texture) {
          textures.push(item);
        }
      });
    }
  });

  return textures;
}

/**
 * 天体运行时管理器（Phase 2.3：仅静态创建与查询）。
 *
 * 节点层级约定（以地球为例）：
 *
 * ```text
 * parent (SolarSystemRoot)
 * └── orbitNode                 // rotation.y = 公转角度（绕中心天体）
 *     └── bodyRoot              // position = 轨道半径；rotation.z = 轴倾角
 *         ├── rotationNode      // 自转节点（rotation.y = 自转角度）
 *         │   └── modelPivot    // 模型修正节点（几何中心归零）
 *         │       └── modelObject // Mesh，userData.planetId = config.id
 *         └── cameraAnchor      // 与 rotationNode 同级，不受自转影响
 * ```
 *
 * 卫星（Phase 2.11 起）：创建时传入父天体 runtime，orbitNode 挂载到
 * 父天体的 bodyRoot 下，形成多中心层级：
 *
 * ```text
 * Sun
 * └── Earth (bodyRoot)
 *     └── MoonOrbitNode
 *         └── MoonBodyRoot
 * ```
 *
 * 资源所有权：本模块创建的 Geometry / Material 登记到 ResourceManager
 * 指定资源组，由 ResourceManager.releaseGroup 统一释放；
 * destroy 只移除节点并清空引用，不重复 dispose。
 */
export class PlanetManager {
  private readonly parent: Object3D;
  private readonly resources: ResourceManager;
  private readonly resourceGroup: string;
  private readonly planets = new Map<string, PlanetRuntime>();
  private destroyed = false;

  constructor(parent: Object3D, resources: ResourceManager, resourceGroup: string) {
    this.parent = parent;
    this.resources = resources;
    this.resourceGroup = resourceGroup;
  }

  /**
   * 根据配置创建完整节点树并注册（异步：GLTF 模型加载）。
   *
   * - 中心天体：不传 parentRuntime，orbitNode 挂到构造时注入的父节点（SolarSystemRoot）。
   * - 卫星：传父天体 runtime，orbitNode 挂到 parentRuntime.bodyRoot（跟随主星）。
   *
   * 重复 ID 或已销毁状态会抛出明确错误；模型加载失败时无资源残留。
   */
  async createPlanet(
    config: PlanetConfig,
    parentRuntime?: PlanetRuntime,
  ): Promise<PlanetRuntime> {
    if (this.destroyed) {
      throw new Error('PlanetManager 已销毁，无法创建天体。');
    }

    if (this.planets.has(config.id)) {
      throw new Error(`天体 ${config.id} 已存在，禁止重复创建。`);
    }

    // 先完整构建节点树与模型，全部成功后统一注册，避免半成品进入 Map。
    const runtime = await this.buildPlanet(config, parentRuntime);
    this.planets.set(config.id, runtime);
    const targetParent = parentRuntime?.bodyRoot ?? this.parent;
    targetParent.add(runtime.orbitNode);
    return runtime;
  }

  getPlanet(id: string): PlanetRuntime | undefined {
    return this.planets.get(id);
  }

  /** 获取全部天体运行时（只读视图；初始化期批量消费，如创建标签）。 */
  getAllPlanets(): readonly PlanetRuntime[] {
    return Array.from(this.planets.values());
  }

  /** 获取相机聚焦/跟随锚点；未知 ID 返回 undefined。 */
  getCameraAnchor(id: string): Object3D | undefined {
    return this.planets.get(id)?.cameraAnchor;
  }

  /** 获取全部可拾取对象（Phase 2.6 供 InteractionManager 注册）。 */
  getSelectableObjects(): readonly Object3D[] {
    const objects: Object3D[] = [];
    this.planets.forEach((runtime) => {
      objects.push(...runtime.selectableObjects);
    });
    return objects;
  }

  /**
   * 每帧驱动天体运动（Phase 2.4）。
   *
   * - 公转：orbitAngle 累加后写入 orbitNode.rotation.y。
   * - 自转：rotationNode.rotation.y 直接累加并归一化。
   * - 运动全部基于 deltaTime，支持 timeScale 与 animationPaused。
   * - 非法输入（NaN / Infinity / 负值）安全跳过，不在每帧抛出异常。
   * - 不修改 options 与 PlanetConfig，运动状态只保存在 PlanetRuntime。
   * - 每帧不创建任何临时对象。
   */
  update(deltaTime: number, options: PlanetUpdateOptions): void {
    if (this.destroyed) {
      return;
    }

    if (options.animationPaused) {
      return;
    }

    if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
      return;
    }

    const safeTimeScale =
      Number.isFinite(options.timeScale) && options.timeScale >= 0
        ? options.timeScale
        : 1;
    if (safeTimeScale === 0) {
      // timeScale 为 0 时效果等同于暂停运动。
      return;
    }

    for (const runtime of this.planets.values()) {
      const { config } = runtime;

      if (config.orbit.enabled) {
        const orbitDelta = deltaTime * config.orbit.speed * safeTimeScale;
        runtime.orbitAngle = MathUtils.euclideanModulo(runtime.orbitAngle + orbitDelta, TWO_PI);
        runtime.orbitNode.rotation.y = runtime.orbitAngle;
      }

      if (config.rotation.enabled) {
        const rotationDelta =
          deltaTime * config.rotation.speed * config.rotation.direction * safeTimeScale;
        // euclideanModulo 对负数（direction = -1）同样返回 [0, 2π) 内的非负角度。
        runtime.rotationAngle = MathUtils.euclideanModulo(
          runtime.rotationAngle + rotationDelta,
          TWO_PI,
        );
        runtime.rotationNode.rotation.y = runtime.rotationAngle;
      }
    }
  }

  /**
   * 幂等销毁：移除全部 orbitNode、清空 Map，并同步清除 ModelLoader 缓存。
   * GPU 资源由 ResourceManager.releaseGroup 统一释放（本模块不重复 dispose）。
   */
  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.planets.forEach((runtime) => {
      // 用实际父节点移除（卫星可能挂在主星 bodyRoot 下，而非构造父节点）。
      runtime.orbitNode.parent?.remove(runtime.orbitNode);
      // 共享资源已登记到 ResourceManager，此处仅清除缓存引用，
      // 避免下次加载返回已释放资源的脏缓存。
      modelLoader.disposeModel(runtime.config.id);
    });
    this.planets.clear();
    this.destroyed = true;
  }

  private async buildPlanet(
    config: PlanetConfig,
    parentRuntime?: PlanetRuntime,
  ): Promise<PlanetRuntime> {
    const { visual, orbit, rotation } = config;

    // 先加载模型（失败直接抛出，此时未创建任何可释放资源）。
    // 模型路径来自 PlanetConfig（配置驱动），缺省时由 ModelLoader 按 id 解析。
    const model = await modelLoader.loadModel(config.id, config.modelPath);

    const orbitNode = new Object3D();
    orbitNode.name = `${config.id}-orbit-node`;
    orbitNode.rotation.y = orbit.initialAngle;

    const bodyRoot = new Object3D();
    bodyRoot.name = `${config.id}-body-root`;
    bodyRoot.position.x = orbit.radius;
    // 轴倾角作用于 bodyRoot，使 cameraAnchor（同级）不受自转影响。
    bodyRoot.rotation.z = rotation.axisTiltRadians;

    const rotationNode = new Object3D();
    rotationNode.name = `${config.id}-rotation-node`;

    const cameraAnchor = new Object3D();
    cameraAnchor.name = `${config.id}-camera-anchor`;

    // 模型配置：GLTF 模型尺寸未知，按目标视觉半径归一化；
    // position 保持 (0,0,0)，不改变 bodyRoot.position（公转依赖 position.x）。
    model.name = `${config.id}-model`;
    // 为 Phase 2.6 点击拾取预留：模型根标记天体 ID，深层子 Mesh 命中时沿 parent 解析。
    model.userData.planetId = config.id;
    model.position.set(0, 0, 0);
    // 几何中心归零 + 缩放（支持含内部节点偏移的模型，如木星/太阳）。
    normalizeModelTransform(model, visual.radius, visual.scale);

    // ModelPivot 中间节点：隔离 GLTF 模型原始结构。自转（rotationNode.rotation）
    // 作用于 pivot；模型修正（position/scale）保证几何中心对齐 pivot 原点，
    // 自转始终绕模型几何中心，不偏心。
    const modelPivot = new Object3D();
    modelPivot.name = `${config.id}-model-pivot`;

    orbitNode.add(bodyRoot);
    bodyRoot.add(rotationNode, cameraAnchor);
    rotationNode.add(modelPivot);
    modelPivot.add(model);

    // 登记 GLTF 资源（可能多个 Mesh 的 Geometry/Material/Texture），
    // 所有权归 ResourceManager，releaseGroup 统一释放。
    registerModelResources(model, this.resources, this.resourceGroup);

    return {
      config,
      id: config.id,
      orbitNode,
      bodyRoot,
      rotationNode,
      modelObject: model,
      cameraAnchor,
      // 恒星（太阳）不可拾取：Raycaster 目标仅限行星与卫星。
      selectableObjects: config.type === 'star' ? [] : [model],
      parentRuntime,
      orbitAngle: orbit.initialAngle,
      rotationAngle: 0,
    };
  }
}
