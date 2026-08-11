/**
 * 银河星云尘埃生成器（Phase 2.20 视觉迁移）。
 *
 * 算法来源：参考博客《Three.js实现银河螺旋星云粒子特效》的螺旋分布思想，
 * 扩展为「星云尘埃层」：与主粒子同源分布（旋臂 + 扰动），但参数差异化：
 * - 随机扰动更大（randomPower 更高、randomness 更大）→ 弥散成云团而非清晰臂。
 * - 单一暗色（深蓝紫）→ 作为银河底层的暗淡尘埃背景。
 * - 数量少、材质尺寸大（由调用方设置 PointsMaterial size）。
 *
 * 输出：positions / colors Float32Array；纯数据生成，一次性初始化。
 */
import { Color } from 'three';

export interface GalaxyDustOptions {
  /** 尘埃粒子数量（远少于主粒子）。 */
  readonly count: number;
  /** 最大半径（场景单位）。 */
  readonly radius: number;
  /** 旋臂数量（分布同源）。 */
  readonly branches: number;
  /** 螺旋缠绕系数。 */
  readonly spin: number;
  /** 扰动幅度（建议大于主粒子）。 */
  readonly randomness: number;
  /** 扰动幂指数（建议大于主粒子 → 更弥散）。 */
  readonly randomPower: number;
  /** 尘埃颜色（暗蓝紫，如 #141b3c）。 */
  readonly color: number;
  /** 垂直扰动系数（扁平盘，默认 0.8）。 */
  readonly verticalFactor?: number;
  /** 随机源。 */
  readonly random?: () => number;
}

export interface GalaxyDustData {
  readonly positions: Float32Array;
  readonly colors: Float32Array;
}

/** 生成星云尘埃粒子数据（一次性初始化）。 */
export function generateGalaxyDust(options: GalaxyDustOptions): GalaxyDustData {
  const { count, radius, branches, spin, randomness, randomPower, color } = options;
  const random = options.random ?? Math.random;
  const verticalFactor = options.verticalFactor ?? 0.8;

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const dustColor = new Color(color);

  for (let index = 0; index < count; index += 1) {
    const i3 = index * 3;

    const radiusValue = random() * radius;
    const spinAngle = radiusValue * spin;
    const branchAngle = ((index % branches) / branches) * Math.PI * 2;

    const perturb = (multiplier: number): number =>
      Math.pow(random(), randomPower) * (random() < 0.5 ? 1 : -1) * randomness * multiplier;
    const randomX = perturb(1);
    const randomY = perturb(verticalFactor);
    const randomZ = perturb(1);

    positions[i3] = Math.cos(branchAngle + spinAngle) * radiusValue + randomX;
    positions[i3 + 1] = randomY;
    positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radiusValue + randomZ;

    // 单色尘埃（轻微抖动 ±0.04 增加层次）。
    colors[i3] = Math.min(Math.max(dustColor.r + (random() * 2 - 1) * 0.04, 0), 1);
    colors[i3 + 1] = Math.min(Math.max(dustColor.g + (random() * 2 - 1) * 0.04, 0), 1);
    colors[i3 + 2] = Math.min(Math.max(dustColor.b + (random() * 2 - 1) * 0.04, 0), 1);
  }

  return { positions, colors };
}
