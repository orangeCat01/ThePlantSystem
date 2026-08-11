/**
 * 天文事件类型定义（Phase 2.16）。
 *
 * 纯数据层：禁止依赖 Vue / Pinia / Three.js；不使用 Date.now()。
 * 事件数据可序列化，可安全跨 UI / Three.js 边界传递。
 */

/** 天文事件类型。 */
export type AstronomyEventType =
  | 'solar_eclipse'
  | 'lunar_eclipse'
  | 'opposition'
  | 'conjunction'
  | 'meteor_shower'
  | 'special_event';

/** 天文事件重要程度。 */
export type AstronomyEventSeverity = 'minor' | 'normal' | 'major';

/** 天文事件（动态计算或静态数据，统一结构）。 */
export interface AstronomyEvent {
  /** 唯一 ID（如 'solar-eclipse-2026-03-03'、'opposition-mars-2026-01-16'）。 */
  readonly id: string;
  /** 事件类型。 */
  readonly type: AstronomyEventType;
  /** 事件标题（如 '日全食'、'火星冲日'）。 */
  readonly title: string;
  /** 事件日期（YYYY-MM-DD）。 */
  readonly date: string;
  /** 事件描述（原创中文短文本）。 */
  readonly description: string;
  /** 相关天体 ID 列表（与 PlanetConfig.id 对齐）。 */
  readonly relatedBodies: readonly string[];
  /** 重要程度：minor / normal / major。 */
  readonly importance: AstronomyEventSeverity;
}

/** 事件查询结果（当前日期事件 + 未来事件）。 */
export interface AstronomyEventsResult {
  /** 当前日期（模拟日期当天）的事件。 */
  readonly currentEvents: readonly AstronomyEvent[];
  /** 未来事件（未来 1~30 天内，按日期升序）。 */
  readonly upcomingEvents: readonly AstronomyEvent[];
}

/** 事件类型中文名映射（UI 展示用，纯数据）。 */
export const ASTRONOMY_EVENT_TYPE_LABELS: Record<AstronomyEventType, string> = {
  solar_eclipse: '日食',
  lunar_eclipse: '月食',
  opposition: '行星冲日',
  conjunction: '行星合相',
  meteor_shower: '流星雨',
  special_event: '特殊天象',
};
