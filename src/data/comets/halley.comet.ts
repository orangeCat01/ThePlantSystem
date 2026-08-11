/**
 * 哈雷彗星配置（Phase 2.23）。
 *
 * 真实数据：公转周期约 75.3 年、半长轴约 17.8 AU、偏心率约 0.967
 * （近日点 0.59 AU / 远日点 35.1 AU）、轨道倾角约 162.3°（逆行）、
 * 来源奥尔特云。
 *
 * 轨道单位：演示单位（地球轨道 = 14 演示单位 ≈ 1 AU 语义；
 * 半长轴 17.8 演示单位使轨道跨越内太阳系至海王星附近）。
 */
import type { SolarObjectConfig } from '@/types/solar-object.types';

/** 哈雷彗星配置。 */
export const halleyCometConfig: SolarObjectConfig = {
  id: 'halley',
  type: 'comet',
  name: '哈雷彗星',
  orbit: {
    semiMajorAxis: 17.8,
    eccentricity: 0.967,
    inclination: 2.834, // 162.3°（记录值；本阶段不参与三维倾斜）
    // 演示公转角速度（弧度/秒；真实周期 75.3 年无法在演示中体现）。
    speed: 0.02,
  },
  visual: {
    count: 1000,
    size: 0.15,
    color: 0xb8d0f0,
    opacity: 0.8,
  },
  science: {
    typeLabel: '周期彗星',
    periodYears: 75.3,
    origin: '奥尔特云',
    summary: '著名周期彗星，每 75.3 年回归一次，最近一次回归 2061 年。',
  },
};
