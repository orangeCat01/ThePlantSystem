import type { AstronomyEvent } from '@/astronomy/events/astronomy-event.types';
import { staticAstronomyEvents } from '@/data/astronomy-events/static-events';

/**
 * 天文事件仓库（Phase 2.16）。
 *
 * 职责：管理固定事件 / 历史事件 / 预测事件数据。
 * - 数据只读（readonly AstronomyEvent），静态权威来源。
 * - 禁止读取 Three.js / Pinia / Store / Vue。
 * - 查询失败返回空数组 / undefined（调用方显示空状态），不抛出异常。
 */
export class AstronomyEventRepository {
  private readonly events: readonly AstronomyEvent[];

  constructor(events: readonly AstronomyEvent[] = staticAstronomyEvents) {
    this.events = events;
  }

  /** 全部事件（只读）。 */
  getAll(): readonly AstronomyEvent[] {
    return this.events;
  }

  /** 按事件 ID 查询；未知 ID 返回 undefined。 */
  getById(id: string): AstronomyEvent | undefined {
    return this.events.find((event) => event.id === id);
  }

  /** 按相关天体 ID 查询（事件涉及该天体的全部事件）。 */
  getByPlanetId(planetId: string): readonly AstronomyEvent[] {
    return this.events.filter((event) => event.relatedBodies.includes(planetId));
  }

  /** 按日期（YYYY-MM-DD，精确匹配）查询；无事件返回空数组。 */
  getByDate(date: string): readonly AstronomyEvent[] {
    return this.events.filter((event) => event.date === date);
  }
}

/** 全局天文事件仓库单例（数据层，无副作用）。 */
export const astronomyEventRepository = new AstronomyEventRepository();
