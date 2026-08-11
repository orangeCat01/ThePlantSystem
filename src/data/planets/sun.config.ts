import type { PlanetConfig } from '@/types/planet.types';
import { planetModelPaths } from '@/data/models/planet-models';

/**
 * 太阳唯一配置（权威来源）。
 *
 * 注意：场景中的尺寸、距离和运行速度经过可视化调整，不代表真实比例。
 * 真实天文数据仅保存在 science 中，visual / orbit / rotation 为三维演示参数。
 *
 * 角度单位：弧度（rad）。太阳无公转（orbit.enabled = false，轨道半径占位为 0，
 * 使 bodyRoot 固定于太阳系原点）。
 */
export const sunConfig = {
  id: 'sun',
  name: '太阳',
  englishName: 'Sun',
  displayName: 'Sun',
  type: 'star',

  visual: {
    radius: 3,
    scale: 1,
    cameraDistance: 9,
    highlightScale: 1.5,
    color: 0xffc966,
  },

  orbit: {
    // 太阳固定于太阳系原点（无公转）；radius 为 0 使 bodyRoot.position 归零。
    radius: 0,
    speed: 0,
    initialAngle: 0,
    // 太阳位于太阳系中心，无公转轨道。
    inclinationRadians: 0,
    enabled: false,
  },

  rotation: {
    // 演示角速度（弧度/秒）。
    speed: 0.1,
    // 自转轴倾角（弧度），约 7.25°。
    axisTiltRadians: (7.25 * Math.PI) / 180,
    direction: 1,
    enabled: true,
  },

  science: {
    diameterKm: 1392700,
    massKg: 1.989e30,
    distanceFromSunKm: 0,
    revolutionPeriodDays: 0,
    rotationPeriodHours: 609.12,
    satelliteCount: 0,
    temperatureMinCelsius: 5500,
    temperatureMaxCelsius: 5500,
  },
  sciencePhysical: {
    massKg: 1.989e+30,
    radiusKm: 696340,
    gravity: 274,
    density: 1.408,
    escapeVelocity: 617.7,
    atmosphere: '氢氦等离子体，无固体表面',
    temperatureRange: { min: 5500, max: 5500 },
    age: '约 46 亿年',
  },

  education: {
    formation: '约 46 亿年前由星际云坍缩形成',
    environment: '等离子体构成的恒星，核心持续进行氢核聚变',
    scientificMeaning: '太阳系的中心天体，为地球生命提供能量来源',
    funFacts: ['太阳占太阳系总质量的约 99.86%', '太阳每秒钟将约 400 万吨物质转化为能量'],
    explorationTimeline: [
      {
        year: '1958',
        title: '先驱者号系列',
        description: '早期太阳观测任务',
      },
      {
        year: '2010',
        title: '太阳动力学天文台',
        description: 'SDO 持续观测太阳活动',
      },
      {
        year: '2018',
        title: '帕克太阳探测器',
        description: '首次飞入太阳日冕层',
      },
    ],
  },

  description:
    '太阳是太阳系的中心恒星，由等离子体构成，核心的核聚变反应为太阳系提供光与热。',
  modelPath: planetModelPaths.sun,
} as const satisfies PlanetConfig;
