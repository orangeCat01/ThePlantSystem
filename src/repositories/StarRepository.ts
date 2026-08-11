import type { StarConfig } from '@/types/star.types';
import type { ConstellationConfig } from '@/types/star.types';
import { starCatalog } from '@/data/stars';
import { constellationCatalog } from '@/data/constellations/constellations';

/**
 * 恒星仓库（Phase 2.17 / 2.19）。
 *
 * 职责：管理恒星与星座数据。
 * - 数据只读（readonly StarConfig / ConstellationConfig），静态权威来源。
 * - 数据源：src/data/stars/index.ts（Phase 2.19 汇总目录）。
 * - 禁止读取 Three.js / Pinia / Vue；查询失败返回空数组 / undefined。
 */
export class StarRepository {
  private readonly stars: readonly StarConfig[];
  private readonly constellations: readonly ConstellationConfig[];

  constructor(
    stars: readonly StarConfig[] = starCatalog,
    constellations: readonly ConstellationConfig[] = constellationCatalog,
  ) {
    this.stars = stars;
    this.constellations = constellations;
  }

  /** 全部恒星（只读）。 */
  getAll(): readonly StarConfig[] {
    return this.stars;
  }

  /** 按恒星 ID 查询；未知 ID 返回 undefined。 */
  getById(id: string): StarConfig | undefined {
    return this.stars.find((star) => star.id === id);
  }

  /** 按星座 ID 查询恒星；无恒星返回空数组。 */
  getByConstellation(constellationId: string): readonly StarConfig[] {
    return this.stars.filter((star) => star.constellation === constellationId);
  }

  /** 全部星座（只读）。 */
  getConstellations(): readonly ConstellationConfig[] {
    return this.constellations;
  }

  /** 按星座 ID 查询星座；未知 ID 返回 undefined。 */
  getConstellationById(id: string): ConstellationConfig | undefined {
    return this.constellations.find((constellation) => constellation.id === id);
  }
}

/** 全局恒星仓库单例（数据层，无副作用）。 */
export const starRepository = new StarRepository();
