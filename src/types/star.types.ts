/**
 * 恒星与星座类型定义（Phase 2.17）。
 *
 * 本文件只包含可序列化、与 Three.js 无关的数据类型。
 * 禁止 any；全部字段 readonly。
 */

/** 恒星物理参数（Phase 2.19；全部可选，缺失时 UI 显示空状态）。 */
export interface StarPhysicalData {
  /** 质量（太阳质量倍数）。 */
  readonly massSolar?: number;
  /** 半径（太阳半径倍数）。 */
  readonly radiusSolar?: number;
  /** 表面温度（开尔文）。 */
  readonly temperatureK?: number;
  /** 光度（太阳光度倍数）。 */
  readonly luminositySolar?: number;
  /** 光谱类型（与顶层 spectralType 一致，冗余便于独立消费）。 */
  readonly spectralType?: string;
  /** 视星等（与顶层 magnitude 一致）。 */
  readonly magnitude?: number;
  /** 距离（光年，与顶层 distanceLightYears 一致）。 */
  readonly distanceLightYear?: number;
}

/** 恒星配置（真实天文数据；位置为 J2000 赤道坐标，角度单位：度）。 */
export interface StarConfig {
  /** 唯一 ID（小写连字符，如 'sirius'）。 */
  readonly id: string;
  /** 中文名称。 */
  readonly name: string;
  /** 英文名称。 */
  readonly englishName: string;
  /** 所属星座 ID（与 ConstellationConfig.id 对齐，如 'orion'）。 */
  readonly constellation: string;
  /** 距地球距离（光年）。 */
  readonly distanceLightYears: number;
  /** 视星等（越小越亮）。 */
  readonly magnitude: number;
  /** 光谱类型（如 'A1V'）。 */
  readonly spectralType: string;
  /** 赤道坐标（J2000，度）。 */
  readonly position: {
    /** 赤经（度，0~360）。 */
    readonly rightAscension: number;
    /** 赤纬（度，-90~90）。 */
    readonly declination: number;
  };
  /** 真实量级物理参数（Phase 2.19，可选）。 */
  readonly physical?: StarPhysicalData;
  /** 恒星简介（原创中文短文本）。 */
  readonly description: string;
}

/** 星座连线（引用恒星 ID，数组对格式 [起点, 终点]，Phase 2.19）。 */
export type ConstellationLine = readonly [string, string];

/** 星座配置。 */
export interface ConstellationConfig {
  /** 唯一 ID（小写连字符，如 'orion'）。 */
  readonly id: string;
  /** 中文名称。 */
  readonly name: string;
  /** 英文名称。 */
  readonly englishName: string;
  /** 星座内恒星 ID 列表。 */
  readonly stars: readonly string[];
  /** 星座连线（可视化 LineSegments 使用）。 */
  readonly lines: readonly ConstellationLine[];
}
