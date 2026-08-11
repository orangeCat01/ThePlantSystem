import type { PlanetConfig } from '@/types/planet.types';
import { planetModelPaths } from '@/data/models/planet-models';

/**
 * 水星唯一配置（权威来源）。
 * 场景中的尺寸、距离和运行速度经过可视化调整，不代表真实比例。
 * 角度单位：弧度（rad）。
 */
export const mercuryConfig = {
  id: 'mercury',
  name: '水星',
  englishName: 'Mercury',
  displayName: 'Mercury',
  type: 'terrestrial-planet',
  parentBodyId: 'sun',

  visual: {
    radius: 0.38,
    scale: 1,
    cameraDistance: 2,
    highlightScale: 1.5,
    color: 0x9c8e7c,
  },

  orbit: {
    radius: 5,
    speed: 0.55,
    initialAngle: 0.6,
    inclinationRadians: (7 * Math.PI) / 180,
    centerBodyId: 'sun',
    enabled: true,
  },

  rotation: {
    speed: 0.05,
    axisTiltRadians: (0.03 * Math.PI) / 180,
    direction: 1,
    enabled: true,
  },

  science: {
    diameterKm: 4879,
    massKg: 3.301e23,
    distanceFromSunKm: 57900000,
    revolutionPeriodDays: 87.97,
    rotationPeriodHours: 1407.6,
    satelliteCount: 0,
    temperatureMinCelsius: -173,
    temperatureMaxCelsius: 427,
  },
  sciencePhysical: {
    massKg: 3.301e+23,
    radiusKm: 2439.7,
    gravity: 3.7,
    density: 5.427,
    escapeVelocity: 4.25,
    atmosphere: '极稀薄外逸层（钠、钾、氧）',
    temperatureRange: { min: -173, max: 427 },
    age: '约 45 亿年',
  },

  education: {
    formation: '约 46 亿年前形成，表面保留早期太阳系撞击记录',
    environment: '几乎没有大气层，昼夜温差极大',
    scientificMeaning: '距离太阳最近的行星，是研究行星形成与演化的窗口',
    funFacts: ['水星上的一天（自转周期）比一年（公转周期）还长', '水星表面昼夜温差超过 600 摄氏度'],
    explorationTimeline: [
      {
        year: '1974',
        title: '水手 10 号',
        description: '首次飞掠水星',
      },
      {
        year: '2011',
        title: '信使号',
        description: '进入水星轨道开展测绘',
      },
      {
        year: '2018',
        title: '贝皮科伦布',
        description: '欧日联合水星探测任务',
      },
    ],
  },

  description: '水星是太阳系中距离太阳最近、体积最小的行星，表面布满陨石坑。',
  modelPath: planetModelPaths.mercury,
} as const satisfies PlanetConfig;
