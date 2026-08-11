import type { PlanetConfig } from '@/types/planet.types';
import { planetModelPaths } from '@/data/models/planet-models';

/**
 * 木星唯一配置（权威来源）。
 * 场景中的尺寸、距离和运行速度经过可视化调整，不代表真实比例。
 * 角度单位：弧度（rad）。
 */
export const jupiterConfig = {
  id: 'jupiter',
  name: '木星',
  englishName: 'Jupiter',
  displayName: 'Jupiter',
  type: 'gas-giant',
  parentBodyId: 'sun',

  visual: {
    radius: 2.3,
    scale: 1,
    cameraDistance: 11.5,
    highlightScale: 1.5,
    color: 0xd8a06a,
  },

  orbit: {
    radius: 17,
    speed: 0.1,
    initialAngle: 3.5,
    inclinationRadians: (1.3 * Math.PI) / 180,
    centerBodyId: 'sun',
    enabled: true,
  },

  rotation: {
    speed: 1.2,
    axisTiltRadians: (3.1 * Math.PI) / 180,
    direction: 1,
    enabled: true,
  },

  science: {
    diameterKm: 139820,
    massKg: 1.898e27,
    distanceFromSunKm: 778600000,
    revolutionPeriodDays: 4332.59,
    rotationPeriodHours: 9.93,
    satelliteCount: 95,
    temperatureMinCelsius: -163,
    temperatureMaxCelsius: -108,
  },
  sciencePhysical: {
    massKg: 1.898e+27,
    radiusKm: 69911,
    gravity: 24.79,
    density: 1.326,
    escapeVelocity: 59.5,
    atmosphere: '氢氦大气，无固体表面',
    temperatureRange: { min: -145, max: -108 },
    age: '约 46 亿年',
  },

  education: {
    formation: '约 46 亿年前率先从原行星盘凝聚，质量巨大',
    environment: '气态巨行星，大红斑风暴持续数百年',
    scientificMeaning: '以强大引力保护内行星，是太阳系的"引力盾牌"',
    funFacts: ['木星体积可容纳 1300 多个地球', '木星大红斑是一场持续至少 350 年的风暴'],
    explorationTimeline: [
      {
        year: '1973',
        title: '先驱者 10 号',
        description: '首次飞掠木星',
      },
      {
        year: '1995',
        title: '伽利略号',
        description: '首个环绕木星的探测器',
      },
      {
        year: '2016',
        title: '朱诺号',
        description: '深入探测木星内部结构',
      },
    ],
  },

  description: '木星是太阳系中体积和质量最大的行星，以壮观的大红斑与众多卫星闻名。',
  modelPath: planetModelPaths.jupiter,
} as const satisfies PlanetConfig;
