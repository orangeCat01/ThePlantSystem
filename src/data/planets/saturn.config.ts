import type { PlanetConfig } from '@/types/planet.types';
import { planetModelPaths } from '@/data/models/planet-models';

/**
 * 土星唯一配置（权威来源）。
 * 场景中的尺寸、距离和运行速度经过可视化调整，不代表真实比例。
 * 角度单位：弧度（rad）。
 * 注意：saturn.gltf 不包含光环 Mesh，环由 Phase 2.12 的 RingManager 程序化生成（ring 配置驱动）。
 */
export const saturnConfig = {
  id: 'saturn',
  name: '土星',
  englishName: 'Saturn',
  displayName: 'Saturn',
  type: 'gas-giant',
  parentBodyId: 'sun',

  visual: {
    radius: 1.9,
    scale: 1,
    cameraDistance: 9.5,
    highlightScale: 1.5,
    color: 0xe3cf9e,
  },

  orbit: {
    radius: 22,
    speed: 0.075,
    initialAngle: 4,
    inclinationRadians: (2.5 * Math.PI) / 180,
    centerBodyId: 'sun',
    enabled: true,
  },

  rotation: {
    speed: 1.1,
    axisTiltRadians: (26.7 * Math.PI) / 180,
    direction: 1,
    enabled: true,
  },

  // 程序化土星环：内径 1.4×、外径 2.4× 视觉半径，环平面与自转轴一致（挂 bodyRoot 继承轴倾角）。
  ring: {
    innerRadiusScale: 1.4,
    outerRadiusScale: 2.4,
    color: 0xc8b59a,
    opacity: 0.55,
  },

  science: {
    diameterKm: 116460,
    massKg: 5.683e26,
    distanceFromSunKm: 1433500000,
    revolutionPeriodDays: 10759.22,
    rotationPeriodHours: 10.7,
    satelliteCount: 146,
    temperatureMinCelsius: -189,
    temperatureMaxCelsius: -139,
  },
  sciencePhysical: {
    massKg: 5.683e+26,
    radiusKm: 58232,
    gravity: 10.44,
    density: 0.687,
    escapeVelocity: 35.5,
    atmosphere: '氢氦大气，无固体表面',
    temperatureRange: { min: -178, max: -139 },
    age: '约 45 亿年',
  },

  education: {
    formation: '约 46 亿年前形成，以壮观的光环系统闻名',
    environment: '气态巨行星，整体密度低于水',
    scientificMeaning: '光环系统是研究行星环与卫星系统的天然实验室',
    funFacts: ['土星密度低于水，理论上可以漂浮在水面', '土星环主要由冰粒与岩石碎块组成'],
    explorationTimeline: [
      {
        year: '1979',
        title: '先驱者 11 号',
        description: '首次飞掠土星',
      },
      {
        year: '2004',
        title: '卡西尼号',
        description: '环绕土星探测 13 年',
      },
      {
        year: '2017',
        title: '卡西尼终章',
        description: '冲入土星大气结束使命',
      },
    ],
  },

  description: '土星是太阳系第二大行星，以壮观的冰质光环系统闻名，密度低于水。',
  modelPath: planetModelPaths.saturn,
} as const satisfies PlanetConfig;
