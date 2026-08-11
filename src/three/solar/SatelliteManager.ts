import type { PlanetConfig } from '@/types/planet.types';
import type { PlanetManager } from './PlanetManager';
import type { PlanetRuntime, PlanetUpdateOptions } from './solar.types';

/**
 * 卫星运行时管理器（Phase 2.11）。
 *
 * 职责边界：
 * - 只负责卫星（parentBodyId 指向主星的天体）的创建入口与索引。
 * - 不复制 PlanetManager 逻辑：节点树构建、模型加载、资源登记、公转/自转
 *   驱动全部复用 PlanetManager（卫星经 createPlanet 注册进其运行时表，
 *   运动由 PlanetManager.update 统一驱动，避免双份积分）。
 * - 卫星挂载到主星 bodyRoot 下，形成多中心层级：
 *
 * ```text
 * EarthBodyRoot
 * └── MoonOrbitNode
 *     └── MoonBodyRoot
 *         ├── MoonRotationNode
 *         └── MoonCameraAnchor
 * ```
 *
 * 资源所有权：与 PlanetManager 一致，GPU 资源登记到 ResourceManager 指定资源组，
 * 由 releaseGroup 统一释放；本模块不创建也不重复释放任何资源。
 */
export class SatelliteManager {
  private readonly planetManager: PlanetManager;
  private readonly satellites = new Map<string, PlanetRuntime>();
  private destroyed = false;

  constructor(planetManager: PlanetManager) {
    this.planetManager = planetManager;
  }

  /**
   * 创建卫星并挂载到父天体（复用 PlanetManager.createPlanet 的完整节点树逻辑）。
   * 父天体必须已存在（由上层按 parentBodyId 解析后传入）。
   */
  async createSatellite(
    config: PlanetConfig,
    parentRuntime: PlanetRuntime,
  ): Promise<PlanetRuntime> {
    if (this.destroyed) {
      throw new Error('SatelliteManager 已销毁，无法创建卫星。');
    }

    if (this.satellites.has(config.id)) {
      throw new Error(`卫星 ${config.id} 已存在，禁止重复创建。`);
    }

    const runtime = await this.planetManager.createPlanet(config, parentRuntime);
    this.satellites.set(config.id, runtime);
    return runtime;
  }

  /** 获取卫星运行时；未知 ID 返回 undefined。 */
  getSatellite(id: string): PlanetRuntime | undefined {
    return this.satellites.get(id);
  }

  /** 卫星数量（诊断/测试用）。 */
  get count(): number {
    return this.satellites.size;
  }

  /**
   * 卫星运动（公转/自转）已由 PlanetManager.update 统一驱动——
   * 卫星注册在其运行时表中，此处保留接口用于未来卫星专属逻辑（如潮汐锁定），
   * 当前为空操作，不复制 PlanetManager 的积分逻辑。
   */
  update(_deltaTime: number, _options: PlanetUpdateOptions): void {
    return;
  }

  /**
   * 幂等销毁：仅清空卫星索引（节点移除与 GPU 资源释放分别由
   * PlanetManager.destroy 与 ResourceManager.releaseGroup 统一处理）。
   */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.satellites.clear();
    this.destroyed = true;
  }
}
