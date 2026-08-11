/**
 * 银河系数据模型（Phase 2.18）。
 *
 * 纯数据层：全 readonly；禁止依赖 Three.js / Vue / Pinia / Store。
 * 科普字段为原创中文文本。
 */

/** 银河结构类型（Phase 2.19 交互对象）。 */
export type GalaxyStructureType = 'core' | 'spiral-arm' | 'bar';

/** 银河可选择对象（Phase 2.19：点击交互目标；数据层纯对象）。 */
export interface GalaxySelectableObject {
  /** 唯一 ID（'core' / 'arm-1'..'arm-4'；与 Three 层 userData.galaxyId 对齐）。 */
  readonly id: string;
  /** 结构类型：核心 / 旋臂 / 棒（本阶段可选对象为核心与 4 条旋臂）。 */
  readonly type: GalaxyStructureType;
  /** 中文显示名。 */
  readonly displayName: string;
  /** 科普说明（原创中文文本）。 */
  readonly description: string;
}

/** 银河系结构信息。 */
export interface GalaxyStructure {
  /** 星系形态（本阶段仅 'spiral' 棒旋）。 */
  readonly type: 'spiral';
  /** 主要旋臂数量。 */
  readonly armCount: number;
  /** 是否为棒旋。 */
  readonly barred: boolean;
  /** 结构描述（原创科普文本）。 */
  readonly description: string;
}

/** 银河系科学信息。 */
export interface GalaxyScience {
  /** 形成历史（原创科普文本）。 */
  readonly formation: string;
  /** 环境特征（原创科普文本）。 */
  readonly environment: string;
  /** 趣味知识（原创科普文本）。 */
  readonly interestingFacts: string;
}

/** 银河系静态配置（权威来源，运行期只读）。 */
export interface GalaxyConfig {
  /** 唯一 ID（'galaxy'）。 */
  readonly id: string;
  /** 英文名。 */
  readonly name: string;
  /** 中文名。 */
  readonly displayName: string;
  /** 星系类型（如 '棒旋星系'）。 */
  readonly type: string;
  /** 直径（光年）。 */
  readonly diameterLightYears: number;
  /** 恒星数量（科普展示字符串，如 '约 1000 亿 - 4000 亿颗'）。 */
  readonly estimatedStarCount: string;
  /** 年龄（年）。 */
  readonly ageYears: number;
  /** 结构信息。 */
  readonly structure: GalaxyStructure;
  /** 位置（J2000 赤道坐标，度；银河系中心方向）。 */
  readonly position: {
    readonly rightAscension: number;
    readonly declination: number;
  };
  /** 简介（原创科普文本）。 */
  readonly description: string;
  /** 科学信息。 */
  readonly science: GalaxyScience;
}
