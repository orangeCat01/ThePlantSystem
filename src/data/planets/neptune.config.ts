import type { PlanetConfig } from '@/types/planet.types';
import { planetModelPaths } from '@/data/models/planet-models';

/**
 * 海王星唯一配置（权威来源）。
 * 场景中的尺寸、距离和运行速度经过可视化调整，不代表真实比例。
 * 角度单位：弧度（rad）。
 */
export const neptuneConfig = {
  id: 'neptune',
  name: '海王星',
  englishName: 'Neptune',
  displayName: 'Neptune',
  type: 'ice-giant',
  parentBodyId: 'sun',

  visual: {
    radius: 1.05,
    scale: 1,
    cameraDistance: 5.2,
    highlightScale: 1.5,
    color: 0x3f66d4,
  },

  orbit: {
    radius: 32,
    speed: 0.045,
    initialAngle: 5,
    inclinationRadians: (1.8 * Math.PI) / 180,
    centerBodyId: 'sun',
    enabled: true,
  },

  rotation: {
    speed: 0.9,
    axisTiltRadians: (28.3 * Math.PI) / 180,
    direction: 1,
    enabled: true,
  },

  science: {
    diameterKm: 49244,
    massKg: 1.024e26,
    distanceFromSunKm: 4495100000,
    revolutionPeriodDays: 60182,
    rotationPeriodHours: 16.11,
    satelliteCount: 14,
    temperatureMinCelsius: -218,
    temperatureMaxCelsius: -201,
  },
  sciencePhysical: {
    massKg: 1.024e+26,
    radiusKm: 24622,
    gravity: 11.15,
    density: 1.638,
    escapeVelocity: 23.5,
    atmosphere: '氢氦甲烷大气，风暴活跃',
    temperatureRange: { min: -218, max: -201 },
    age: '约 45 亿年',
  },

  education: {
    formation: '约 46 亿年前形成，属于冰巨行星',
    environment: '太阳系最远的行星，拥有太阳系中最强的风暴',
    scientificMeaning: '先通过数学计算预言、后被观测确认的行星',
    funFacts: ['海王星是先经计算预言、后被观测确认的行星', '海王星上的风速可达每小时 2000 公里以上'],
    explorationTimeline: [
      {
        year: '1989',
        title: '旅行者 2 号',
        description: '迄今唯一飞掠海王星的探测器',
      },
      {
        year: '2014',
        title: '哈勃望远镜',
        description: '发现海王星新卫星',
      },
      {
        year: '现在',
        title: '持续观测',
        description: '地基与空间望远镜持续追踪',
      },
    ],
  },

  description: '海王星是太阳系最外侧的行星，深蓝色大气中孕育着太阳系最强的风暴。',
  modelPath: planetModelPaths.neptune,
} as const satisfies PlanetConfig;
