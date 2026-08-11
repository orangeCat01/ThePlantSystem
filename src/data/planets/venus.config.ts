import type { PlanetConfig } from '@/types/planet.types';
import { planetModelPaths } from '@/data/models/planet-models';

/**
 * 金星唯一配置（权威来源）。
 * 场景中的尺寸、距离和运行速度经过可视化调整，不代表真实比例。
 * 角度单位：弧度（rad）。金星自转方向与公转相反（direction = -1，逆行）。
 */
export const venusConfig = {
  id: 'venus',
  name: '金星',
  englishName: 'Venus',
  displayName: 'Venus',
  type: 'terrestrial-planet',
  parentBodyId: 'sun',

  visual: {
    radius: 0.95,
    scale: 1,
    cameraDistance: 4.8,
    highlightScale: 1.5,
    color: 0xe8cda0,
  },

  orbit: {
    radius: 7.5,
    speed: 0.4,
    initialAngle: 1.2,
    inclinationRadians: (3.4 * Math.PI) / 180,
    centerBodyId: 'sun',
    enabled: true,
  },

  rotation: {
    speed: 0.03,
    // 等效轴倾角（弧度），约 2.64°（真实 177.4° 倒置的等效表示）。
    axisTiltRadians: (2.64 * Math.PI) / 180,
    direction: -1,
    enabled: true,
  },

  science: {
    diameterKm: 12104,
    massKg: 4.867e24,
    distanceFromSunKm: 108200000,
    revolutionPeriodDays: 224.7,
    rotationPeriodHours: 5832.5,
    satelliteCount: 0,
    temperatureMinCelsius: 462,
    temperatureMaxCelsius: 462,
  },
  sciencePhysical: {
    massKg: 4.867e+24,
    radiusKm: 6051.8,
    gravity: 8.87,
    density: 5.243,
    escapeVelocity: 10.36,
    atmosphere: '浓密二氧化碳大气，气压约为地球 92 倍',
    temperatureRange: { min: 464, max: 464 },
    age: '约 45 亿年',
  },

  education: {
    formation: '约 46 亿年前形成，后经历失控温室效应',
    environment: '浓厚二氧化碳大气与硫酸云层，地表高温高压',
    scientificMeaning: '研究温室效应与行星气候演化的天然实验室',
    funFacts: ['金星自转方向与其他行星相反（逆行自转）', '金星是夜空中除日月外最亮的天体'],
    explorationTimeline: [
      {
        year: '1962',
        title: '水手 2 号',
        description: '首次成功飞掠金星',
      },
      {
        year: '1970',
        title: '金星 7 号',
        description: '首个着陆金星表面的探测器',
      },
      {
        year: '2006',
        title: '金星快车',
        description: '长期环绕金星观测大气',
      },
    ],
  },

  description: '金星是太阳系第二颗行星，拥有浓厚大气和失控温室效应，是夜空中最亮的行星。',
  modelPath: planetModelPaths.venus,
} as const satisfies PlanetConfig;
