import { Material, Mesh, MeshStandardMaterial, Object3D, SphereGeometry, Texture } from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { planetModelPaths } from '@/data/models/planet-models';

/** MeshStandardMaterial 等材质的常用纹理槽位（用于释放）。 */
const MATERIAL_TEXTURE_KEYS = [
  'map',
  'normalMap',
  'specularMap',
  'roughnessMap',
  'metalnessMap',
  'emissiveMap',
  'alphaMap',
  'aoMap',
  'bumpMap',
  'displacementMap',
  'lightMap',
] as const;

/** 递归释放对象树中 Mesh 的 Geometry / Material / 纹理（共享资源所有权方为 ModelLoader）。 */
function disposeObjectTree(root: Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }

    object.geometry.dispose();

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      disposeMaterialTextures(material);
      material.dispose();
    });
  });
}

/** 释放材质持有的纹理（仅释放槽位中实际存在的 Texture 实例）。 */
function disposeMaterialTextures(material: Material): void {
  const textureSlots = material as unknown as Record<string, unknown>;
  MATERIAL_TEXTURE_KEYS.forEach((key) => {
    const texture = textureSlots[key];
    if (texture instanceof Texture) {
      texture.dispose();
    }
  });
}

/**
 * 统一 GLTF 模型加载器（Phase 2.10.1 基础设施）。
 *
 * 职责：
 * - 加载 public/models 下的分离式 glTF 资源（.gltf + .bin + texture，相对引用由 GLTFLoader 解析）。
 * - 维护模型缓存：缓存原始 Object3D，重复加载返回 clone（共享 Geometry/Material/Texture，不返回同一实例）。
 * - 统一释放：disposeModel / clearCache 释放缓存原始资源的 GPU 资源。
 *
 * 所有权（遵循 ADR-002 模型缓存规则）：
 * - 原始资源由 ModelLoader 缓存并统一释放；clone 消费者不得 dispose 共享资源，
 *   只负责从场景移除自身挂载的节点。
 *
 * 边界：
 * - 不依赖 Vue / Pinia / Store；不创建 Scene / Camera / Renderer。
 * - 加载失败降级（Phase 2.16）：返回占位球体（SphereGeometry + MeshStandardMaterial，
 *   userData { planetId, placeholder: true }），不抛出导致场景初始化失败；
 *   失败经 onModelError 回调上报（SolarScene → LoadingTracker → Coordinator → UI）。
 * - 占位对象不入缓存：重试（重新加载）会重新发起真实加载。
 */
export class ModelLoader {
  private readonly loader = new GLTFLoader();
  private readonly cache = new Map<string, Object3D>();
  private readonly pending = new Map<string, Promise<Object3D>>();
  /** 模型加载失败回调（Phase 2.16；SolarScene 注册，null 安全忽略）。 */
  onModelError: ((id: string, error: Error) => void) | null = null;

  /**
   * 获取模型实例（每次调用返回新的 clone，不返回缓存原始实例）。
   * 首次调用时加载并缓存；重复调用命中缓存后直接 clone。
   * path 可选：显式模型路径（优先于按 id 的默认路径解析）。
   */
  async loadModel(id: string, path?: string): Promise<Object3D> {
    const cached = this.cache.get(id);
    if (cached) {
      return cached.clone();
    }

    const original = await this.cacheModel(id, path);
    return original.clone();
  }

  /**
   * 预加载并缓存模型，返回缓存原始引用（幂等；并发调用共享同一加载 Promise）。
   * path 可选：显式模型路径（优先于按 id 的默认路径解析）。
   * 注意：返回的是缓存原始实例，调用方不得修改或释放它，需要独立实例请用 loadModel。
   */
  async cacheModel(id: string, path?: string): Promise<Object3D> {
    const cached = this.cache.get(id);
    if (cached) {
      return cached;
    }

    const resolvedPath = path ?? this.resolvePath(id);
    const pending = this.pending.get(id);
    if (pending) {
      return pending;
    }

    const promise = this.loadGltf(resolvedPath)
      .then((gltf) => {
        const root = gltf.scene;
        this.cache.set(id, root);
        this.pending.delete(id);
        return root;
      })
      .catch((error: unknown) => {
        this.pending.delete(id);
        // Phase 2.16 降级：记录失败 → 回调上报 → 返回占位球体（不抛出）。
        const wrapped =
          error instanceof Error
            ? error
            : new Error(`模型加载失败（${id}）：${String(error)}`);
        this.onModelError?.(id, wrapped);
        return createPlaceholderModel(id);
      });
    this.pending.set(id, promise);
    return promise;
  }

  /** 释放指定模型的缓存原始资源（幂等；未知 ID 安全返回）。 */
  disposeModel(id: string): void {
    const cached = this.cache.get(id);
    if (!cached) {
      return;
    }

    disposeObjectTree(cached);
    this.cache.delete(id);
  }

  /** 释放全部缓存模型的资源并清空缓存（幂等）。 */
  clearCache(): void {
    this.cache.forEach((object) => disposeObjectTree(object));
    this.cache.clear();
  }

  private resolvePath(id: string): string {
    // 显式配置路径，禁止按 id 拼接（public/models 存在命名异常）。
    const path = (planetModelPaths as Record<string, string | undefined>)[id];
    if (!path) {
      throw new Error(`未配置天体 ${id} 的模型路径。`);
    }
    return path;
  }

  private loadGltf(path: string): Promise<GLTF> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (gltf) => resolve(gltf),
        undefined,
        (error: unknown) => {
          const detail = error instanceof Error ? error.message : String(error);
          reject(new Error(`模型加载失败（${path}）：${detail}`));
        },
      );
    });
  }
}

/**
 * 创建模型占位对象（Phase 2.16 FR-012）：
 * SphereGeometry + MeshStandardMaterial + userData { planetId, placeholder: true }。
 * - 半径 1：由 PlanetManager.normalizeModelTransform 按视觉半径归一化。
 * - 支持：点击拾取（planetId）、高亮、相机聚焦、信息面板（与真实模型同链路）。
 * - Geometry/Material 由调用方（PlanetManager.registerModelResources）登记资源组统一释放。
 */
export function createPlaceholderModel(planetId: string): Object3D {
  const placeholder = new Object3D();
  placeholder.name = `placeholder-${planetId}`;
  placeholder.userData.planetId = planetId;
  placeholder.userData.placeholder = true;

  const mesh = new Mesh(
    new SphereGeometry(1, 24, 16),
    new MeshStandardMaterial({
      color: 0x7788aa,
      roughness: 0.85,
      metalness: 0.1,
    }),
  );
  mesh.name = `placeholder-mesh-${planetId}`;
  mesh.userData.planetId = planetId;
  mesh.userData.placeholder = true;
  placeholder.add(mesh);
  return placeholder;
}

/** 全局共享实例（统一 Loader 入口，供后续 PlanetManager 接入使用）。 */
export const modelLoader = new ModelLoader();
