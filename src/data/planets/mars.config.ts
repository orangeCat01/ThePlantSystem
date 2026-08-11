import type { PlanetConfig } from '@/types/planet.types';
import { planetModelPaths } from '@/data/models/planet-models';

/**
 * 火星唯一配置（权威来源）。
 * 场景中的尺寸、距离和运行速度经过可视化调整，不代表真实比例。
 * 角度单位：弧度（rad）。
 */
export const marsConfig = {
  id: 'mars',
  name: '火星',
  englishName: 'Mars',
  displayName: 'Mars',
  type: 'terrestrial-planet',
  parentBodyId: 'sun',

  visual: {
    radius: 0.55,
    scale: 1,
    cameraDistance: 2.8,
    highlightScale: 1.5,
    color: 0xc1440e,
  },

  orbit: {
    radius: 11,
    speed: 0.15,
    initialAngle: 2.5,
    inclinationRadians: (1.9 * Math.PI) / 180,
    centerBodyId: 'sun',
    enabled: true,
  },

  rotation: {
    speed: 0.5,
    axisTiltRadians: (25.2 * Math.PI) / 180,
    direction: 1,
    enabled: true,
  },

  science: {
    diameterKm: 6779,
    massKg: 6.417e23,
    distanceFromSunKm: 227900000,
    revolutionPeriodDays: 686.98,
    rotationPeriodHours: 24.62,
    satelliteCount: 2,
    temperatureMinCelsius: -153,
    temperatureMaxCelsius: 20,
  },
  sciencePhysical: {
    massKg: 6.417e+23,
    radiusKm: 3389.5,
    gravity: 3.71,
    density: 3.934,
    escapeVelocity: 5.03,
    atmosphere: '稀薄二氧化碳大气，气压约为地球 0.6%',
    temperatureRange: { min: -153, max: 20 },
    age: '约 46 亿年',
  },

  education: {
    formation: '约 46 亿年前形成，早期表面曾存在液态水',
    environment: '稀薄二氧化碳大气，红色地表，两极存在冰盖',
    scientificMeaning: '最有可能找到地外生命痕迹的行星',
    funFacts: ['火星上的奥林帕斯山是太阳系最高火山（约 21 公里）', '火星一天约 24.6 小时，与地球非常接近'],
    explorationTimeline: [
      {
        year: '1965',
        title: '水手 4 号',
        description: '首次飞掠火星',
      },
      {
        year: '1976',
        title: '海盗 1 号',
        description: '首个成功着陆火星的探测器',
      },
      {
        year: '2021',
        title: '毅力号与祝融号',
        description: '中美火星车同期开展探测',
      },
    ],
  },

  description: '火星是太阳系第四颗行星，因富含氧化铁呈红色，是地外生命探测的重点目标。',
  modelPath: planetModelPaths.mars,
} as const satisfies PlanetConfig;
