/**
 * 太阳系小天体数据仓库（Phase 2.23）。
 *
 * 纯数据层：禁止读取 Three.js / Store / Vue；只提供静态配置查询。
 * 供 SolarObjectPanel（UI）展示；Three.js 层直接引用配置对象创建视觉。
 */
import type { SolarObjectConfig, SolarObjectType } from '@/types/solar-object.types';
import { halleyCometConfig } from '@/data/comets/halley.comet';
import { asteroidBeltConfig } from '@/data/comets/asteroid-belt.config';

/** 全部小天体配置（只读注册表）。 */
const SOLAR_OBJECTS: readonly SolarObjectConfig[] = [
  asteroidBeltConfig,
  halleyCometConfig,
];

class SolarObjectRepository {
  /** 按 ID 查询；未知 ID 返回 undefined（UI 空状态兜底）。 */
  getById(id: string): SolarObjectConfig | undefined {
    return SOLAR_OBJECTS.find((object) => object.id === id);
  }

  /** 全部小天体配置。 */
  getAll(): readonly SolarObjectConfig[] {
    return SOLAR_OBJECTS;
  }

  /** 按类型查询（asteroid-belt / comet）。 */
  getByType(type: SolarObjectType): readonly SolarObjectConfig[] {
    return SOLAR_OBJECTS.filter((object) => object.type === type);
  }
}

/** 单例（与既有 Repository 模式一致）。 */
export const solarObjectRepository = new SolarObjectRepository();
