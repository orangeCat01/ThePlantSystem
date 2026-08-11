/**
 * 深空天体类型定义（Phase 2.21）。
 *
 * 纯数据层：全 readonly；禁止依赖 Three.js / Vue / Pinia。
 */

/** 深空天体类型。 */
export type DeepSkyType = 'nebula' | 'galaxy' | 'cluster';

/** 深空天体（真实天文数据；位置为 J2000 赤道坐标，角度单位：度）。 */
export interface DeepSkyObject {
  /** 唯一 ID（小写连字符，如 'm42'）。 */
  readonly id: string;
  /** 名称（如 '猎户座大星云'）。 */
  readonly name: string;
  /** Messier 编号（如 'M42'；无编号为 null）。 */
  readonly messier: string | null;
  /** 天体类型：星云 / 星系 / 星团。 */
  readonly type: DeepSkyType;
  /** 赤道坐标（J2000，度）。 */
  readonly position: {
    readonly rightAscension: number;
    readonly declination: number;
  };
  /** 视星等。 */
  readonly magnitude: number;
  /** 视大小（角分，最长径）。 */
  readonly sizeArcMin: number;
  /** 距地球距离（光年，可选）。 */
  readonly distanceLightYears?: number;
  /** 简介（原创中文短文本）。 */
  readonly description: string;
}
