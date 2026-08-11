import type { ExplorationTarget, ExplorationTargetType } from '@/types/exploration.types';
import { planetRepository } from '@/repositories/PlanetRepository';
import { starRepository } from '@/repositories/StarRepository';
import { deepSkyRepository } from '@/repositories/DeepSkyRepository';
import { missionRepository } from '@/repositories/MissionRepository';

/**
 * 统一探索目标仓库（Phase 2.18 / 2.21 / 2.22）。
 *
 * 职责：聚合 PlanetRepository（太阳系天体）、StarRepository（恒星目录）、
 * DeepSkyRepository（深空天体）与 MissionRepository（探测器）为统一
 * ExplorationTarget 列表，提供搜索与查询。
 *
 * - 目标类型映射：太阳系 natural-satellite → 'moon'，其余（含太阳）→ 'planet'；
 *   恒星目录 → 'star'；深空目录 → 'deepSky'；探测器 → 'spacecraft'。
 * - 搜索匹配：id / 中文名 / 英文名（大小写不敏感子串）。
 * - 禁止读取 Three.js / Pinia / Vue；查询失败返回空数组 / undefined。
 */
export class ExplorationRepository {
  private readonly targets: readonly ExplorationTarget[];

  constructor() {
    const solarTargets: ExplorationTarget[] = planetRepository
      .getAll()
      .map((config) => ({
        id: config.id,
        type: config.type === 'natural-satellite' ? 'moon' : 'planet',
        name: config.name,
        description: config.description,
      }));

    const starTargets: ExplorationTarget[] = starRepository.getAll().map((star) => ({
      id: star.id,
      type: 'star',
      name: star.name,
      description: star.description,
    }));

    const deepSkyTargets: ExplorationTarget[] = deepSkyRepository.getAll().map((object) => ({
      id: object.id,
      type: 'deepSky',
      name: object.name,
      description: object.description,
    }));

    const spacecraftTargets: ExplorationTarget[] = missionRepository
      .getAllMissions()
      .flatMap((mission) =>
        mission.spacecraft.map((spacecraft) => ({
          id: spacecraft.id,
          type: 'spacecraft' as const,
          // 中文任务名（如 '旅行者 1 号'）作为统一目标名称，便于搜索与列表展示。
          name: mission.name,
          description: mission.description,
        })),
      );

    this.targets = [...solarTargets, ...starTargets, ...deepSkyTargets, ...spacecraftTargets];
  }

  /** 全部探索目标（只读）。 */
  getAllTargets(): readonly ExplorationTarget[] {
    return this.targets;
  }

  /** 按关键字搜索（id / 中文名 / 英文名，大小写不敏感子串；空关键字返回空数组）。 */
  search(keyword: string): readonly ExplorationTarget[] {
    const normalized = keyword.trim().toLowerCase();
    if (normalized.length === 0) {
      return [];
    }

    const matches = (value: string | undefined): boolean =>
      value !== undefined && value.toLowerCase().includes(normalized);

    return this.targets.filter(
      (target) =>
        matches(target.id) || matches(target.name) || matches(this.englishName(target.id)),
    );
  }

  /** 按 ID 查询；未知 ID 返回 undefined。 */
  getById(id: string): ExplorationTarget | undefined {
    return this.targets.find((target) => target.id === id);
  }

  /** 按类型查询；无目标返回空数组。 */
  getByType(type: ExplorationTargetType): readonly ExplorationTarget[] {
    return this.targets.filter((target) => target.type === type);
  }

  /** 目标英文名（planet 与 star 数据源均有 englishName；未知目标返回 undefined）。 */
  private englishName(id: string): string | undefined {
    const planet = planetRepository.getById(id);
    if (planet) {
      return planet.englishName;
    }
    const star = starRepository.getById(id);
    if (star) {
      return star.englishName;
    }
    return deepSkyRepository.getById(id)?.messier ?? undefined;
  }
}

/** 全局探索目标仓库单例（数据层，无副作用）。 */
export const explorationRepository = new ExplorationRepository();
