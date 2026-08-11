/**
 * 银河粒子生成器（Phase 2.20 视觉迁移）。
 *
 * 算法来源：参考博客《Three.js实现银河螺旋星云粒子特效》
 * （https://blog.csdn.net/lenovo96166/article/details/149757220）。
 *
 * 迁移范围（仅算法，不复制 Demo 架构）：
 * 1. 螺旋臂分布算法：极坐标 + 分支角 + 随半径增长的旋转角（spin）+ 幂分布随机扰动。
 * 2. 颜色分布算法：核心橙红 → 外围深蓝 的半径线性插值（lerp）。
 *
 * 输出：positions / colors Float32Array（供 BufferGeometry attributes）。
 * 纯数据生成：一次性初始化调用；无 Scene/Camera/Renderer/RAF 依赖。
 */
import { Color } from 'three';

export interface GalaxyParticleOptions {
  /** 粒子数量。 */
  readonly count: number;
  /** 最大半径（场景单位）。 */
  readonly radius: number;
  /** 旋臂数量（>= 2；任务要求 4 条以上）。 */
  readonly branches: number;
  /** 螺旋缠绕系数：spinAngle = radius * spin（弧度）。 */
  readonly spin: number;
  /** 随机扰动幅度（场景单位）。 */
  readonly randomness: number;
  /** 扰动幂指数（越大扰动越集中在中心附近小值）。 */
  readonly randomPower: number;
  /** 中心颜色（暖橙红，如 #ff6030）。 */
  readonly insideColor: number;
  /** 外围颜色（深蓝，如 #1b3984）。 */
  readonly outsideColor: number;
  /** 颜色插值归一化半径（r / colorMixRadius 钳制到 1）；默认等于 radius。 */
  readonly colorMixRadius?: number;
  /** 垂直扰动系数（<1 使银河更扁平，默认 0.6）。 */
  readonly verticalFactor?: number;
  /** 随机源（默认 Math.random；可注入种子实现可复现）。 */
  readonly random?: () => number;
}

export interface GalaxyParticleData {
  /** 位置（x,y,z 交错）。 */
  readonly positions: Float32Array;
  /** 颜色（r,g,b 交错，0-1）。 */
  readonly colors: Float32Array;
}

/** 生成银河螺旋粒子数据（博客算法迁移；一次性初始化）。 */
export function generateGalaxyParticles(options: GalaxyParticleOptions): GalaxyParticleData {
  const {
    count,
    radius,
    branches,
    spin,
    randomness,
    randomPower,
    insideColor,
    outsideColor,
  } = options;
  const random = options.random ?? Math.random;
  const colorMixRadius = options.colorMixRadius ?? radius;
  const verticalFactor = options.verticalFactor ?? 0.6;

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const inside = new Color(insideColor);
  const outside = new Color(outsideColor);
  const mixed = new Color();

  for (let index = 0; index < count; index += 1) {
    const i3 = index * 3;

    // 螺旋臂分布（博客 3.1）：半径均匀 → 中心密外围疏；分支角 + 随半径旋转角。
    const radiusValue = random() * radius;
    const spinAngle = radiusValue * spin;
    const branchAngle = ((index % branches) / branches) * Math.PI * 2;

    // 随机扰动：幂分布 + 正负随机（博客：Math.pow(Math.random(), 2) * ±1 * 20）。
    const perturb = (multiplier: number): number =>
      Math.pow(random(), randomPower) * (random() < 0.5 ? 1 : -1) * randomness * multiplier;
    const randomX = perturb(1);
    const randomY = perturb(verticalFactor);
    const randomZ = perturb(1);

    positions[i3] = Math.cos(branchAngle + spinAngle) * radiusValue + randomX;
    positions[i3 + 1] = randomY;
    positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radiusValue + randomZ;

    // 颜色渐变（博客 3.1）：核心橙红 → 外围深蓝 按半径线性插值。
    mixed.copy(inside).lerp(outside, Math.min(radiusValue / colorMixRadius, 1));
    colors[i3] = mixed.r;
    colors[i3 + 1] = mixed.g;
    colors[i3 + 2] = mixed.b;
  }

  return { positions, colors };
}
