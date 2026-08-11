import type { PlanetConfig } from '@/types/planet.types';
import { planetModelPaths } from '@/data/models/planet-models';

/**
 * 天王星唯一配置（权威来源）。
 * 场景中的尺寸、距离和运行速度经过可视化调整，不代表真实比例。
 * 角度单位：弧度（rad）。天王星自转轴倾角约 97.8°（"躺着"公转）。
 */
export const uranusConfig = {
  id: 'uranus',
  name: '天王星',
  englishName: 'Uranus',
  displayName: 'Uranus',
  type: 'ice-giant',
  parentBodyId: 'sun',

  visual: {
    radius: 1.1,
    scale: 1,
    cameraDistance: 5.5,
    highlightScale: 1.5,
    color: 0x9ad9e4,
  },

  orbit: {
    radius: 27,
    speed: 0.055,
    initialAngle: 4.5,
    inclinationRadians: (0.8 * Math.PI) / 180,
    centerBodyId: 'sun',
    enabled: true,
  },

  rotation: {
    speed: 0.8,
    axisTiltRadians: (97.8 * Math.PI) / 180,
    direction: 1,
    enabled: true,
  },

  science: {
    diameterKm: 50724,
    massKg: 8.681e25,
    distanceFromSunKm: 2872500000,
    revolutionPeriodDays: 30688.5,
    rotationPeriodHours: 17.24,
    satelliteCount: 28,
    temperatureMinCelsius: -224,
    temperatureMaxCelsius: -197,
  },
  sciencePhysical: {
    massKg: 8.681e+25,
    radiusKm: 25362,
    gravity: 8.87,
    density: 1.27,
    escapeVelocity: 21.3,
    atmosphere: '氢氦甲烷大气，呈蓝绿色',
    temperatureRange: { min: -224, max: -197 },
    age: '约 45 亿年',
  },

  education: {
    formation: '约 46 亿年前形成，属于冰巨行星',
    environment: '富含水、甲烷与氨的冰巨行星，甲烷使大气呈蓝绿色',
    scientificMeaning: '自转轴几乎"躺着"公转，是研究行星自转演化的特殊样本',
    funFacts: ['天王星自转轴倾角约 98 度，像躺着滚动公转', '天王星是太阳系中最冷的行星之一'],
    explorationTimeline: [
      {
        year: '1986',
        title: '旅行者 2 号',
        description: '迄今唯一飞掠天王星的探测器',
      },
      {
        year: '2011',
        title: '哈勃望远镜',
        description: '持续观测天王星大气与光环',
      },
      {
        year: '现在',
        title: '未来计划',
        description: '多国提出天王星轨道探测器方案',
      },
    ],
  },

  description: '天王星是太阳系第七颗行星，自转轴严重倾斜，甲烷大气呈现独特的蓝绿色。',
  modelPath: planetModelPaths.uranus,
} as const satisfies PlanetConfig;
