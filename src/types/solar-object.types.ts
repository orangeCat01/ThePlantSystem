/**
 * 太阳系小天体数据模型（Phase 2.23）。
 *
 * 纯数据层：全 readonly；禁止依赖 Three.js / Vue / Pinia；
 * 禁止在数据层存放 Object3D 或任何运行时对象。
 *
 * 单位约定（与太阳系演示单位一致，非真实 AU）：
 * - 轨道半径：演示单位（地球轨道 = 14，1 AU 语义对应演示单位）。
 * - 角度：弧度。
 */

/** 小天体类型。 */
export type SolarObjectType = 'asteroid-belt' | 'comet';

/** 小天体轨道配置（小行星带用环带；彗星用椭圆轨道）。 */
export interface SolarObjectOrbitConfig {
  /** 环带内半径（asteroid-belt；演示单位）。 */
  readonly innerRadius?: number;
  /** 环带外半径（asteroid-belt；演示单位）。 */
  readonly outerRadius?: number;
  /** 椭圆半长轴（comet；演示单位）。 */
  readonly semiMajorAxis?: number;
  /** 轨道偏心率（0~1；椭圆越扁）。 */
  readonly eccentricity?: number;
  /** 轨道倾角（弧度；本阶段不参与三维倾斜，保留数据完整性）。 */
  readonly inclination?: number;
  /** 演示角速度（弧度/秒；小行星带整体旋转 / 彗星公转）。 */
  readonly speed: number;
}

/** 小天体视觉配置。 */
export interface SolarObjectVisualConfig {
  /** 粒子数量（asteroid-belt / comet-tail）。 */
  readonly count?: number;
  /** 粒子 / 彗核尺寸（演示单位）。 */
  readonly size: number;
  /** 颜色（0xRRGGBB）。 */
  readonly color: number;
  /** 透明度（0~1）。 */
  readonly opacity: number;
}

/** 小天体科普信息（Repository 展示用；缺失时 UI 显示「暂无数据」）。 */
export interface SolarObjectScience {
  /** 类型标签（如「周期彗星」）。 */
  readonly typeLabel: string;
  /** 周期（年）。 */
  readonly periodYears?: number;
  /** 来源（如「奥尔特云」）。 */
  readonly origin?: string;
  /** 一句话简介。 */
  readonly summary: string;
}

/** 太阳系小天体配置（Phase 2.23）。 */
export interface SolarObjectConfig {
  /** 唯一 ID（如 'halley'、'asteroid-belt'）。 */
  readonly id: string;
  /** 类型。 */
  readonly type: SolarObjectType;
  /** 展示名称。 */
  readonly name: string;
  /** 轨道配置（按类型取用字段）。 */
  readonly orbit: SolarObjectOrbitConfig;
  /** 视觉配置。 */
  readonly visual: SolarObjectVisualConfig;
  /** 科普信息。 */
  readonly science: SolarObjectScience;
}
