/**
 * 天体业务类型定义。
 *
 * 本文件只包含可序列化、与 Three.js 无关的业务配置类型。
 * Three.js 运行时类型（如 PlanetRuntime）请见 `src/three/solar/solar.types.ts`。
 *
 * 角度单位约定：本文件中所有角度字段（orbit.initialAngle、orbit.inclinationRadians、
 * rotation.axisTiltRadians、orbit.speed、rotation.speed）统一使用「弧度（rad）」，
 * 禁止在消费方另行猜测单位。
 */

/** 天体类型。 */
export type PlanetType =
  | 'star'
  | 'terrestrial-planet'
  | 'gas-giant'
  | 'ice-giant'
  | 'natural-satellite';

/** 三维演示视觉参数。不代表真实比例。 */
export interface PlanetVisualConfig {
  /** 场景中天体的视觉半径（相对单位）。 */
  readonly radius: number;
  /** 模型整体缩放系数。 */
  readonly scale: number;
  /** 相机聚焦时的目标距离（相对单位）。 */
  readonly cameraDistance: number;
  /** 选中高亮时的放大系数（>= 1）。 */
  readonly highlightScale: number;
  /** 兜底颜色（0xRRGGBB），仅在无模型/无贴图时使用。 */
  readonly color?: number;
}

/** 公转演示参数。速度经过可视化调整，不代表真实周期。 */
export interface PlanetOrbitConfig {
  /** 轨道半径（相对单位）。 */
  readonly radius: number;
  /** 公转角速度（弧度/秒），演示速度。 */
  readonly speed: number;
  /** 初始公转角度（弧度）。 */
  readonly initialAngle: number;
  /** 轨道面相对参考面的倾角（弧度）。 */
  readonly inclinationRadians: number;
  /** 是否绘制并启用公转。 */
  readonly enabled: boolean;
  /**
   * 轨道中心天体 ID（绕谁公转）。
   * 缺省视为绕太阳系中心（恒星）公转；卫星（如月球）填主星 ID（如 'earth'）。
   */
  readonly centerBodyId?: string;
}

/** 自转演示参数。速度经过可视化调整，不代表真实周期。 */
export interface PlanetRotationConfig {
  /** 自转角速度（弧度/秒），演示速度。 */
  readonly speed: number;
  /** 自转轴倾角（弧度）。 */
  readonly axisTiltRadians: number;
  /** 自转方向：1 为正向，-1 为反向。 */
  readonly direction: 1 | -1;
  /** 是否启用自转。 */
  readonly enabled: boolean;
}

/** 程序化天体环参数（如土星环；GLTF 不含 ring mesh 时使用）。 */
export interface PlanetRingConfig {
  /** 环内径相对视觉半径的倍数（如 1.4 = 1.4 × visual.radius）。 */
  readonly innerRadiusScale: number;
  /** 环外径相对视觉半径的倍数（如 2.4 = 2.4 × visual.radius）。 */
  readonly outerRadiusScale: number;
  /** 环颜色。 */
  readonly color: number;
  /** 环不透明度（0-1）。 */
  readonly opacity: number;
}

/** 真实科普数据。与三维演示参数分离，不得被视觉比例覆盖。 */
export interface PlanetScienceData {
  /** 直径（公里）。 */
  readonly diameterKm: number;
  /** 质量（千克），可选。 */
  readonly massKg?: number;
  /** 与太阳的平均距离（公里）。 */
  readonly distanceFromSunKm: number;
  /** 公转周期（天）。 */
  readonly revolutionPeriodDays: number;
  /** 自转周期（小时）。 */
  readonly rotationPeriodHours: number;
  /** 天然卫星数量。 */
  readonly satelliteCount: number;
  /** 最低温度（摄氏度）。 */
  readonly temperatureMinCelsius: number;
  /** 最高温度（摄氏度）。 */
  readonly temperatureMaxCelsius: number;
}

/** 天体物理参数（真实量级数据，Phase 2.14.1；字段可选，缺失时 UI 显示空状态）。 */
export interface PlanetPhysicalData {
  /** 质量（千克）。 */
  readonly massKg?: number;
  /** 赤道半径（公里）。 */
  readonly radiusKm?: number;
  /** 表面重力加速度（m/s²）。 */
  readonly gravity?: number;
  /** 平均密度（g/cm³）。 */
  readonly density?: number;
  /** 逃逸速度（km/s）。 */
  readonly escapeVelocity?: number;
  /** 大气成分（原创短文本）。 */
  readonly atmosphere?: string;
  /** 表面温度范围（摄氏度）。 */
  readonly temperatureRange?: {
    readonly min: number;
    readonly max: number;
  };
  /** 天体年龄（原创短文本，如 '约 46 亿年'）。 */
  readonly age?: string;
}

/** 探测历史时间线条目。 */
export interface PlanetEducationTimelineEntry {
  /** 年份（字符串，如 '1609'、'现在'）。 */
  readonly year: string;
  /** 事件标题。 */
  readonly title: string;
  /** 事件描述。 */
  readonly description: string;
}

/** 科普教育数据。与三维演示无关，供信息面板展示。 */
export interface PlanetEducationData {
  /** 形成历史。 */
  readonly formation: string;
  /** 环境特征。 */
  readonly environment: string;
  /** 科学意义。 */
  readonly scientificMeaning: string;
  /** 趣味知识列表。 */
  readonly funFacts: readonly string[];
  /** 探测历史时间线。 */
  readonly explorationTimeline: readonly PlanetEducationTimelineEntry[];
}

/**
 * 天体唯一配置。
 *
 * 所有属性只读：配置是静态权威数据，运行期修改应写入运行时状态
 * （如 PlanetRuntime.orbitAngle），不得写回本配置。
 */
export interface PlanetConfig {
  /** 唯一 ID，必须为小写（如 'earth'）。 */
  readonly id: string;
  /** 中文名称。 */
  readonly name: string;
  /** 英文名称。 */
  readonly englishName: string;
  /** 天体类型。 */
  readonly type: PlanetType;
  /** 三维演示视觉参数。 */
  readonly visual: PlanetVisualConfig;
  /** 公转演示参数。 */
  readonly orbit: PlanetOrbitConfig;
  /** 自转演示参数。 */
  readonly rotation: PlanetRotationConfig;
  /** 程序化天体环（可选，如土星环）。 */
  readonly ring?: PlanetRingConfig;
  /** 真实科普数据。 */
  readonly science: PlanetScienceData;
  /** 真实量级物理参数（Phase 2.14.1，可选；缺失时信息面板显示空状态）。 */
  readonly sciencePhysical?: PlanetPhysicalData;
  /** 科普教育数据。 */
  readonly education: PlanetEducationData;
  /**
   * 标签显示名（Phase 2.14.4，如 'Earth'）。缺省回退 englishName；
   * 显式配置用于三维标签，可与 englishName 分离。
   */
  readonly displayName?: string;
  /**
   * 父级天体 ID：当前天体绕哪个天体运行（多中心层级）。
   * 中心天体（如恒星）不填；行星填 'sun'；卫星填其主星 ID（如月球填 'earth'）。
   */
  readonly parentBodyId?: string;
  /**
   * 模型路径（public 根相对路径，如 '/models/Earth/Earth.gltf'）。
   * 显式配置，禁止按 id 拼接；缺省时由 ModelLoader 按 id 从模型路径配置解析。
   */
  readonly modelPath?: string;
  /** 中文科普描述。 */
  readonly description: string;
}
