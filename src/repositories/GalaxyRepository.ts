import type { GalaxyConfig, GalaxyScience, GalaxySelectableObject } from '@/types/galaxy.types';
import { galaxyConfig, galaxyConfigs, galaxySelectableObjects } from '@/data/galaxy/galaxy.config';

/**
 * 银河系数据仓库（Phase 2.18）。
 *
 * 职责：读取银河系静态配置，供 UI / Coordinator 展示与查询。
 * - 数据只读（readonly GalaxyConfig），静态权威来源。
 * - 禁止依赖 Three.js / Pinia / Store；查询失败返回 undefined。
 */
export class GalaxyRepository {
  private readonly configs: Readonly<Record<string, GalaxyConfig>>;

  constructor(configs: Readonly<Record<string, GalaxyConfig>> = galaxyConfigs) {
    this.configs = configs;
  }

  /** 默认银河系配置（本阶段唯一条目：'galaxy'）。 */
  get(): GalaxyConfig {
    return galaxyConfig;
  }

  /** 按 ID 查询银河系配置；未知 ID 返回 undefined。 */
  getById(id: string): GalaxyConfig | undefined {
    return this.configs[id];
  }

  /** 银河系科学信息（形成历史 / 环境 / 趣味知识）。 */
  getScienceData(): GalaxyScience {
    return galaxyConfig.science;
  }

  /** 银河可选择对象目录（Phase 2.19：核心 + 4 条旋臂；只读）。 */
  getSelectableObjects(): readonly GalaxySelectableObject[] {
    return galaxySelectableObjects;
  }

  /** 按 ID 查询可选择对象；未知 ID 返回 undefined。 */
  getSelectableObjectById(id: string): GalaxySelectableObject | undefined {
    return galaxySelectableObjects.find((object) => object.id === id);
  }
}

/** 全局银河系数据仓库单例（数据层，无副作用）。 */
export const galaxyRepository = new GalaxyRepository();
