import type { DeepSkyObject } from '@/types/deepSky.types';
import { deepSkyCatalog } from '@/data/deepSky/deep-sky-catalog';

/**
 * 深空天体仓库（Phase 2.21）。
 *
 * 职责：管理深空天体数据（M31 / M42 / M45 / M13 等）。
 * - 数据只读（readonly DeepSkyObject），静态权威来源。
 * - 禁止读取 Three.js / Pinia / Vue；查询失败返回空数组 / undefined。
 */
export class DeepSkyRepository {
  private readonly objects: readonly DeepSkyObject[];

  constructor(objects: readonly DeepSkyObject[] = deepSkyCatalog) {
    this.objects = objects;
  }

  /** 全部深空天体（只读）。 */
  getAll(): readonly DeepSkyObject[] {
    return this.objects;
  }

  /** 按 ID 查询；未知 ID 返回 undefined。 */
  getById(id: string): DeepSkyObject | undefined {
    return this.objects.find((object) => object.id === id);
  }

  /** 按类型查询（nebula / galaxy / cluster）；无结果返回空数组。 */
  getByType(type: DeepSkyObject['type']): readonly DeepSkyObject[] {
    return this.objects.filter((object) => object.type === type);
  }
}

/** 全局深空天体仓库单例（数据层，无副作用）。 */
export const deepSkyRepository = new DeepSkyRepository();
