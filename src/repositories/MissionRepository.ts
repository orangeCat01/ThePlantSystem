import type { ExplorationMission } from '@/types/exploration.types';
import type { SpaceMission, Spacecraft } from '@/types/mission.types';
import { earthMissions } from '@/data/missions/earth.missions';
import { moonMissions } from '@/data/missions/moon.missions';
import { marsMissions } from '@/data/missions/mars.missions';
import { jupiterMissions } from '@/data/missions/jupiter.missions';
import { saturnMissions } from '@/data/missions/saturn.missions';
import { spaceMissions } from '@/data/missions/spacecraft/spacecraft.missions';

/** 全部任务数据源（按目标天体分组；新增任务文件在此登记）。 */
const MISSION_GROUPS: readonly (readonly ExplorationMission[])[] = [
  earthMissions,
  moonMissions,
  marsMissions,
  jupiterMissions,
  saturnMissions,
];

/**
 * 探测任务仓库（Phase 2.14.2）。
 *
 * 职责：汇总并查询探测任务数据。
 * - 数据只读（readonly ExplorationMission），静态权威来源。
 * - 禁止读取 Three.js / Pinia / Store；任务数据不进入 Store（数据流：Repository → 组件）。
 * - 查询失败返回空数组（调用方显示空状态），不抛出异常。
 */
export class MissionRepository {
  private readonly missions: readonly ExplorationMission[];
  private readonly spaceMissions: readonly SpaceMission[];

  constructor(
    groups: readonly (readonly ExplorationMission[])[] = MISSION_GROUPS,
    spacecraftMissions: readonly SpaceMission[] = spaceMissions,
  ) {
    this.missions = groups.flat();
    this.spaceMissions = spacecraftMissions;
  }

  /** 全部任务（只读）。 */
  getAll(): readonly ExplorationMission[] {
    return this.missions;
  }

  /** 按目标天体 ID 查询任务（无任务时返回空数组）。 */
  getByPlanetId(planetId: string): readonly ExplorationMission[] {
    return this.missions.filter((mission) => mission.targetPlanetId === planetId);
  }

  /** 按任务 ID 查询；未知 ID 返回 undefined。 */
  getById(id: string): ExplorationMission | undefined {
    return this.missions.find((mission) => mission.id === id);
  }

  /** 全部航天任务（Phase 2.22，只读）。 */
  getAllMissions(): readonly SpaceMission[] {
    return this.spaceMissions;
  }

  /** 按航天任务 ID 查询；未知 ID 返回 undefined。 */
  getMissionById(id: string): SpaceMission | undefined {
    return this.spaceMissions.find((mission) => mission.id === id);
  }

  /** 按目标天体 ID 查询航天任务（无任务时返回空数组）。 */
  getMissionsByTarget(targetId: string): readonly SpaceMission[] {
    return this.spaceMissions.filter((mission) => mission.targetId === targetId);
  }

  /** 按任务 ID 查询探测器（无任务时返回空数组）。 */
  getSpacecraftByMission(missionId: string): readonly Spacecraft[] {
    return this.spaceMissions.find((mission) => mission.id === missionId)?.spacecraft ?? [];
  }

  /** 按探测器 ID 查询所属任务；未知 ID 返回 undefined。 */
  getMissionBySpacecraftId(spacecraftId: string): SpaceMission | undefined {
    return this.spaceMissions.find((mission) =>
      mission.spacecraft.some((spacecraft) => spacecraft.id === spacecraftId),
    );
  }
}

/** 全局任务仓库单例（数据层，无副作用）。 */
export const missionRepository = new MissionRepository();
