import type { PlanetConfig } from '@/types/planet.types';
import { planetModelPaths } from '@/data/models/planet-models';

/**
 * 地球唯一配置（权威来源）。
 *
 * 注意：场景中的尺寸、距离和运行速度经过可视化调整，不代表真实比例。
 * 真实天文数据仅保存在 science 中，visual / orbit / rotation 为三维演示参数。
 *
 * 角度单位：弧度（rad）。axisTiltRadians 约 23.4° = 约 0.4084 rad。
 */
export const earthConfig = {
  id: 'earth',
  name: '地球',
  englishName: 'Earth',
  displayName: 'Earth',
  type: 'terrestrial-planet',
  parentBodyId: 'sun',

  visual: {
    radius: 1.2,
    scale: 1,
    cameraDistance: 6,
    highlightScale: 1.5,
    color: 0x3a6fd8,
  },

  orbit: {
    radius: 14,
    // 演示角速度（弧度/秒），仅为便于观察，不代表真实公转周期。
    speed: 0.2,
    // 初始公转角度（弧度），约 45°。
    initialAngle: Math.PI / 4,
    // 相对黄道面的轨道倾角（弧度），地球约为 0°。
    inclinationRadians: 0,
    centerBodyId: 'sun',
    enabled: true,
  },

  rotation: {
    // 演示角速度（弧度/秒），仅为便于观察，不代表真实自转周期。
    speed: 0.5,
    // 自转轴倾角（弧度），约 23.4°。
    axisTiltRadians: (23.4 * Math.PI) / 180,
    direction: 1,
    enabled: true,
  },

  science: {
    diameterKm: 12742,
    massKg: 5.972e24,
    distanceFromSunKm: 149600000,
    revolutionPeriodDays: 365.25,
    rotationPeriodHours: 23.93,
    satelliteCount: 1,
    temperatureMinCelsius: -89,
    temperatureMaxCelsius: 58,
  },
  sciencePhysical: {
    massKg: 5.972e+24,
    radiusKm: 6371,
    gravity: 9.81,
    density: 5.514,
    escapeVelocity: 11.19,
    atmosphere: '氮氧大气（约 78% 氮、21% 氧）',
    temperatureRange: { min: -89, max: 57 },
    age: '约 45.4 亿年',
  },

  education: {
    formation: '约 45 亿年前形成',
    environment: '拥有氮氧大气层和大量液态水',
    scientificMeaning: '目前已知唯一存在生命的天体',
    funFacts: ['地球表面约 71% 被水覆盖', '地球拥有天然卫星月球'],
    explorationTimeline: [
      {
        year: '1609',
        title: '望远镜观测',
        description: '伽利略首次使用望远镜观察天空',
      },
      {
        year: '1960',
        title: '空间探测开始',
        description: '人类开始进行行星探测任务',
      },
      {
        year: '现在',
        title: '深空探索',
        description: '持续开展空间科学任务',
      },
    ],
  },

  description:
    '地球是太阳系第三颗行星，是目前已知唯一存在生命的天体。表面大部分被液态水覆盖，拥有以氮和氧为主的大气层。',
  modelPath: planetModelPaths.earth,
} as const satisfies PlanetConfig;
