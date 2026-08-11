/**
 * 航天任务领域模型（Phase 2.22）。
 *
 * 纯数据层：全 readonly；禁止依赖 Three.js / Vue / Pinia / Store。
 * 轨迹坐标为场景演示坐标（视觉空间，非真实天文距离），由数据目录提供。
 */

/** 探测器类型。 */
export type SpacecraftType = 'orbiter' | 'lander' | 'rover' | 'flyby';

/** 任务轨迹点（数据层纯对象）。 */
export interface TrajectoryPoint {
  /** 日期（YYYY-MM-DD）。 */
  readonly date: string;
  /** 场景演示坐标（相对太阳系中心，视觉空间）。 */
  readonly position: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
  /** 关键事件标注（可选，如 '木星飞掠'）。 */
  readonly event?: string;
}

/** 探测器（任务载荷；本阶段使用 Sprite 视觉，未来支持 GLTF 模型）。 */
export interface Spacecraft {
  /** 探测器唯一 ID（小写连字符，如 'voyager-1'）。 */
  readonly id: string;
  /** 所属任务 ID（SpaceMission.id）。 */
  readonly missionId: string;
  /** 探测器名称（如 'Voyager 1'）。 */
  readonly name: string;
  /** 探测器类型：orbiter / lander / rover / flyby。 */
  readonly type: SpacecraftType;
  /** 未来 GLTF 模型路径（可选；本阶段为 null / 省略）。 */
  readonly modelPath?: string;
}

/** 任务时间线条目（如 Launch / Encounter / Arrival）。 */
export interface MissionTimelineEntry {
  /** 日期（YYYY-MM-DD）。 */
  readonly date: string;
  /** 事件标签（如 '发射'、'木星飞掠'、'入轨'）。 */
  readonly label: string;
}

/** 航天任务。 */
export interface SpaceMission {
  /** 任务唯一 ID（小写连字符，如 'voyager-1'）。 */
  readonly id: string;
  /** 任务名称（如 '旅行者 1 号'）。 */
  readonly name: string;
  /** 执行机构（如 'NASA'、'NASA/ESA'）。 */
  readonly agency: string;
  /** 目标天体 ID（与 PlanetConfig.id 对齐，如 'jupiter'）。 */
  readonly targetId: string;
  /** 发射日期（YYYY-MM-DD）。 */
  readonly launchDate: string;
  /** 状态（如 'active' / 'completed'）。 */
  readonly status: string;
  /** 任务描述（原创中文短文本）。 */
  readonly description: string;
  /** 任务搭载探测器（1 个或多个）。 */
  readonly spacecraft: readonly Spacecraft[];
  /** 任务时间线（发射 → 飞掠/入轨 → 抵达/结束）。 */
  readonly timeline: readonly MissionTimelineEntry[];
  /** 任务轨迹（演示坐标，按日期排序）。 */
  readonly trajectory: readonly TrajectoryPoint[];
}
