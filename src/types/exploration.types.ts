/**
 * 探测任务与探索目标类型（Phase 2.14 / 2.18）。
 *
 * 本文件只包含可序列化、与 Three.js 无关的数据定义。
 * 任务数据由 MissionRepository 读取，经 PlanetPanel 展示；
 * 探索目标由 ExplorationRepository 聚合（PlanetRepository + StarRepository）。
 * 禁止 Store 保存任务/目标对象（仅保存 id 与类型）。
 */

/** 探索目标类型（Phase 2.18 / 2.21 / 2.22）。 */
export type ExplorationTargetType = 'planet' | 'moon' | 'star' | 'deepSky' | 'spacecraft';

/** 统一探索目标（太阳系天体 + 恒星目录的聚合视图，Phase 2.18）。 */
export interface ExplorationTarget {
  /** 唯一 ID（与 PlanetConfig.id / StarConfig.id 对齐）。 */
  readonly id: string;
  /** 目标类型。 */
  readonly type: ExplorationTargetType;
  /** 中文名称。 */
  readonly name: string;
  /** 简介（原创中文短文本）。 */
  readonly description: string;
}

export interface ExplorationMission {
  /** 任务唯一 ID（小写连字符，如 'apollo-11'）。 */
  readonly id: string;
  /** 任务名称（如 'Apollo 11'）。 */
  readonly name: string;
  /** 目标天体 ID（与 PlanetConfig.id 对齐，如 'moon'）。 */
  readonly targetPlanetId: string;
  /** 发射或抵达年份（字符串，如 '1969'、'1998'）。 */
  readonly year: string;
  /** 执行机构（如 'NASA'、'ESA'）。 */
  readonly agency: string;
  /** 任务描述（原创中文短文本）。 */
  readonly description: string;
}
