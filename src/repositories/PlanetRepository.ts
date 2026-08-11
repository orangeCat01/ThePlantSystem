import { planetConfigs } from '@/data/planets';
import type { PlanetConfig } from '@/types/planet.types';

/**
 * 天体配置 Repository。
 *
 * 不依赖 Three.js、Vue 或 Pinia，只提供只读查询。
 * ID 查找大小写敏感；所有配置 ID 约定为小写（由数据层校验保证）。
 */
export class PlanetRepository {
  private readonly configs: ReadonlyMap<string, PlanetConfig>;
  private readonly configList: readonly PlanetConfig[];

  constructor(configs: readonly PlanetConfig[] = planetConfigs) {
    this.configs = new Map(configs.map((config) => [config.id, config]));
    // 构造时生成一次只读数组，getAll 直接复用，避免每次调用重建。
    this.configList = Array.from(this.configs.values());
  }

  /** 返回全部配置的只读引用，调用方无法通过返回值增删内部集合。 */
  getAll(): readonly PlanetConfig[] {
    return this.configList;
  }

  /** 按 ID 精确查找（大小写敏感）。未知 ID 返回 undefined。 */
  getById(id: string): PlanetConfig | undefined {
    return this.configs.get(id);
  }

  /** 判断指定 ID 是否存在。 */
  has(id: string): boolean {
    return this.configs.has(id);
  }
}

/** 全局单例。后续 PlanetManager、信息面板等统一通过该实例查询。 */
export const planetRepository = new PlanetRepository();
