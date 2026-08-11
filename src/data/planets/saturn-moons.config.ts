import type { PlanetConfig } from '@/types/planet.types';
import { planetModelPaths } from '@/data/models/planet-models';

/**
 * 土星环上卫星配置（Phase 2.23 扩展）。
 *
 * 设计：3 颗真实土星小卫星，演示轨道半径全部落在程序化土星环带内
 * （环内径 2.66 / 外径 4.56 演示单位），视觉上「卫星在环上」。
 * 模型复用月球岩石球 GLB（normalizeModelTransform 按 visual.radius 归一化）。
 * 真实科学数据（直径/轨道/周期）取自公开资料；演示参数不代表真实比例。
 * 角度单位：弧度（rad）。
 */

/** 土卫十六 Pan：恩克环缝内卫星（内环带）。 */
export const panConfig = {
  id: 'pan',
  name: '土卫十六',
  englishName: 'Pan',
  displayName: 'Pan',
  type: 'natural-satellite',
  parentBodyId: 'saturn',

  visual: {
    radius: 0.16,
    scale: 1,
    cameraDistance: 1.1,
    highlightScale: 1.5,
    color: 0x9c9c9c,
  },

  orbit: {
    // 演示轨道半径（土星环带内：2.66 ~ 4.56 演示单位）。
    radius: 2.9,
    // 内环卫星公转较快（演示角速度）。
    speed: 1.0,
    initialAngle: 0.6,
    inclinationRadians: 0,
    centerBodyId: 'saturn',
    enabled: true,
  },

  rotation: {
    speed: 0.2,
    axisTiltRadians: 0,
    direction: 1,
    enabled: true,
  },

  science: {
    diameterKm: 28,
    massKg: 4.95e15,
    // 距土星平均距离（卫星语义：与主星距离）。
    distanceFromSunKm: 133583,
    revolutionPeriodDays: 0.575,
    rotationPeriodHours: 13.8,
    satelliteCount: 0,
    temperatureMinCelsius: -139,
    temperatureMaxCelsius: -139,
  },
  sciencePhysical: {
    massKg: 4.95e15,
    radiusKm: 14.1,
    gravity: 0.017,
    density: 0.42,
    escapeVelocity: 0.02,
    atmosphere: '无',
    temperatureRange: { min: -139, max: -139 },
    age: '约 1 亿年（土星环结构年轻）',
  },

  education: {
    formation: '由土星 A 环恩克环缝中的环物质聚集形成',
    environment: '被土星环物质包围的小卫星',
    scientificMeaning: '牧羊犬卫星的典型代表，维持恩克环缝的形态',
    funFacts: ['潘的形状酷似汤圆/飞碟', '它清扫了恩克环缝中的环物质'],
    explorationTimeline: [
      {
        year: '1990',
        title: '旅行者 1 号',
        description: '从环缝影像中推测存在',
      },
    ],
  },

  description: '土卫十六（Pan）是土星 A 环恩克环缝中的牧羊犬卫星，维持着环缝的形态。',
  modelPath: planetModelPaths.moon,
} as const satisfies PlanetConfig;

/** 土卫十八 Prometheus：F 环牧羊犬卫星（环带中部）。 */
export const prometheusConfig = {
  id: 'prometheus',
  name: '土卫十八',
  englishName: 'Prometheus',
  displayName: 'Prometheus',
  type: 'natural-satellite',
  parentBodyId: 'saturn',

  visual: {
    radius: 0.2,
    scale: 1,
    cameraDistance: 1.2,
    highlightScale: 1.5,
    color: 0x8f8f8f,
  },

  orbit: {
    radius: 3.7,
    speed: 0.8,
    initialAngle: 2.2,
    inclinationRadians: 0,
    centerBodyId: 'saturn',
    enabled: true,
  },

  rotation: {
    speed: 0.15,
    axisTiltRadians: 0,
    direction: 1,
    enabled: true,
  },

  science: {
    diameterKm: 86,
    massKg: 1.59e17,
    distanceFromSunKm: 139380,
    revolutionPeriodDays: 0.613,
    rotationPeriodHours: 14.7,
    satelliteCount: 0,
    temperatureMinCelsius: -139,
    temperatureMaxCelsius: -139,
  },
  sciencePhysical: {
    massKg: 1.59e17,
    radiusKm: 43.1,
    gravity: 0.006,
    density: 0.48,
    escapeVelocity: 0.02,
    atmosphere: '无',
    temperatureRange: { min: -139, max: -139 },
    age: '约 1 亿年',
  },

  education: {
    formation: '由 F 环附近的环物质聚集形成',
    environment: 'F 环外缘的牧羊犬卫星',
    scientificMeaning: '与潘多拉共同约束 F 环的形态',
    funFacts: ['形状细长，像一根香肠', '持续向 F 环抛洒物质形成缕状结构'],
    explorationTimeline: [
      {
        year: '1980',
        title: '旅行者 1 号',
        description: '发现土卫十八',
      },
    ],
  },

  description: '土卫十八（Prometheus）是土星 F 环的牧羊犬卫星，与潘多拉共同塑造 F 环。',
  modelPath: planetModelPaths.moon,
} as const satisfies PlanetConfig;

/** 土卫十五 Atlas：A 环外缘卫星（环带外缘）。 */
export const atlasConfig = {
  id: 'atlas',
  name: '土卫十五',
  englishName: 'Atlas',
  displayName: 'Atlas',
  type: 'natural-satellite',
  parentBodyId: 'saturn',

  visual: {
    radius: 0.18,
    scale: 1,
    cameraDistance: 1.15,
    highlightScale: 1.5,
    color: 0x8a8a8a,
  },

  orbit: {
    radius: 4.3,
    speed: 0.65,
    initialAngle: 4.0,
    inclinationRadians: 0,
    centerBodyId: 'saturn',
    enabled: true,
  },

  rotation: {
    speed: 0.18,
    axisTiltRadians: 0,
    direction: 1,
    enabled: true,
  },

  science: {
    diameterKm: 30,
    massKg: 6.6e15,
    distanceFromSunKm: 137670,
    revolutionPeriodDays: 0.602,
    rotationPeriodHours: 14.4,
    satelliteCount: 0,
    temperatureMinCelsius: -139,
    temperatureMaxCelsius: -139,
  },
  sciencePhysical: {
    massKg: 6.6e15,
    radiusKm: 15.1,
    gravity: 0.0019,
    density: 0.44,
    escapeVelocity: 0.01,
    atmosphere: '无',
    temperatureRange: { min: -139, max: -139 },
    age: '约 1 亿年',
  },

  education: {
    formation: '由 A 环外缘环物质聚集形成',
    environment: 'A 环外缘的牧羊犬卫星',
    scientificMeaning: '限制 A 环外缘边界',
    funFacts: ['赤道脊隆起，形似飞碟', '与 A 环外缘物质互动'],
    explorationTimeline: [
      {
        year: '1980',
        title: '旅行者 1 号',
        description: '发现土卫十五',
      },
    ],
  },

  description: '土卫十五（Atlas）是土星 A 环外缘的牧羊犬卫星，具有明显的赤道脊。',
  modelPath: planetModelPaths.moon,
} as const satisfies PlanetConfig;
