import type { PlanetConfig } from '@/types/planet.types';
import { planetModelPaths } from '@/data/models/planet-models';

/**
 * 月球唯一配置（权威来源）。
 * 月球是地球的天然卫星，orbit 参数相对地球（主星）而言。
 * 场景中的尺寸、距离和运行速度经过可视化调整，不代表真实比例。
 * 角度单位：弧度（rad）。
 */
export const moonConfig = {
  id: 'moon',
  name: '月球',
  englishName: 'Moon',
  displayName: 'Moon',
  type: 'natural-satellite',
  parentBodyId: 'earth',

  visual: {
    radius: 0.3,
    scale: 1,
    cameraDistance: 1.6,
    highlightScale: 1.5,
    color: 0x9b9b9b,
  },

  orbit: {
    // 轨道半径相对地球（演示参数）。
    radius: 2,
    speed: 2.2,
    initialAngle: 2,
    inclinationRadians: (5.1 * Math.PI) / 180,
    centerBodyId: 'earth',
    enabled: true,
  },

  rotation: {
    speed: 0.15,
    axisTiltRadians: (6.7 * Math.PI) / 180,
    direction: 1,
    enabled: true,
  },

  science: {
    diameterKm: 3474,
    massKg: 7.342e22,
    // 距地球平均距离（该字段对卫星表示与主星的距离）。
    distanceFromSunKm: 384400,
    revolutionPeriodDays: 27.32,
    rotationPeriodHours: 655.7,
    satelliteCount: 0,
    temperatureMinCelsius: -173,
    temperatureMaxCelsius: 127,
  },
  sciencePhysical: {
    massKg: 7.342e+22,
    radiusKm: 1737.4,
    gravity: 1.62,
    density: 3.344,
    escapeVelocity: 2.38,
    atmosphere: '无（仅极稀薄外逸层）',
    temperatureRange: { min: -173, max: 127 },
    age: '约 45 亿年',
  },

  education: {
    formation: '约 45 亿年前由巨大撞击抛射物凝聚形成（大碰撞假说）',
    environment: '没有大气层，表面覆盖月壤与环形山',
    scientificMeaning: '地球唯一的天然卫星，稳定了地球自转轴与潮汐',
    funFacts: ['月球正以每年约 3.8 厘米的速度远离地球', '月球表面无风化和流水侵蚀，撞击坑保存数十亿年'],
    explorationTimeline: [
      {
        year: '1959',
        title: '月球 3 号',
        description: '首次拍到月球背面',
      },
      {
        year: '1969',
        title: '阿波罗 11 号',
        description: '人类首次登月',
      },
      {
        year: '2019',
        title: '嫦娥四号',
        description: '首次着陆月球背面',
      },
    ],
  },

  description: '月球是地球唯一的天然卫星，表面布满环形山，其潮汐作用深刻影响地球。',
  modelPath: planetModelPaths.moon,
} as const satisfies PlanetConfig;
