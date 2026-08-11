/**
 * 旋臂数据生成器（Phase 2.17）。
 *
 * 算法：简单对数螺旋（r = a·e^(b·θ) 的工程近似：r 从内半径按指数增长到外半径）。
 * - 输出：每臂一条螺旋曲线采样点（Vector3[]，薄盘 y≈0）。
 * - 参数：arms / radius / spread / turns / pointsPerArm 可配置。
 * - 纯数据生成：一次性初始化调用，禁止每帧调用；无 Three 运行时依赖以外的副作用。
 */
import { Vector3 } from 'three';

export interface SpiralArmOptions {
  /** 旋臂数量（默认 4）。 */
  readonly arms?: number;
  /** 外半径（默认 100）。 */
  readonly radius?: number;
  /** 内半径（默认 6；避免旋臂穿过中心亮核）。 */
  readonly innerRadius?: number;
  /** 螺旋圈数（默认 1.5）。 */
  readonly turns?: number;
  /** 每臂曲线采样点数（默认 400）。 */
  readonly pointsPerArm?: number;
  /** 垂直扰动幅度（默认 1.2；薄盘厚度）。 */
  readonly spread?: number;
}

export interface SpiralArmData {
  /** 臂索引（0..arms-1）。 */
  readonly armIndex: number;
  /** 该臂曲线采样点（对数螺旋 + 高斯扰动）。 */
  readonly points: readonly Vector3[];
}

/** 生成全部旋臂曲线（每臂 pointsPerArm 个采样点）。 */
export function generateSpiralArms(options: SpiralArmOptions = {}): SpiralArmData[] {
  const arms = clampInt(options.arms ?? 4, 1, 8);
  const radius = clampPositive(options.radius ?? 100);
  const innerRadius = clampPositive(options.innerRadius ?? 6);
  const turns = Math.max(options.turns ?? 1.5, 0.25);
  const pointsPerArm = clampInt(options.pointsPerArm ?? 400, 16, 2000);
  const spread = Math.max(options.spread ?? 1.2, 0);

  const armData: SpiralArmData[] = [];
  for (let armIndex = 0; armIndex < arms; armIndex += 1) {
    armData.push({
      armIndex,
      points: generateOneArm(armIndex, arms, radius, innerRadius, turns, pointsPerArm, spread),
    });
  }
  return armData;
}

/** 生成单条旋臂：对数螺旋采样（t∈[0,1] → 角度均匀推进，半径按指数曲线增长）。 */
function generateOneArm(
  armIndex: number,
  arms: number,
  radius: number,
  innerRadius: number,
  turns: number,
  pointsPerArm: number,
  spread: number,
): Vector3[] {
  const points: Vector3[] = [];
  const armOffset = (armIndex / arms) * Math.PI * 2;
  const totalAngle = turns * Math.PI * 2;
  // 对数增长系数：r(t) = inner + (radius - inner) * (e^(k·t) - 1) / (e^k - 1)
  const k = 1.8;
  const expK = Math.exp(k);

  for (let index = 0; index < pointsPerArm; index += 1) {
    const t = index / (pointsPerArm - 1);
    const theta = armOffset + t * totalAngle;
    const growth = (Math.exp(k * t) - 1) / (expK - 1);
    const r = innerRadius + (radius - innerRadius) * growth;
    // 高斯扰动（沿径向与垂直方向），保持旋臂聚集感。
    const radialNoise = gaussian() * spread * 0.35;
    const verticalNoise = gaussian() * spread;
    // 钳制半径：旋臂粒子保持在盘面半径内（外围稀疏、不出盘）。
    const finalRadius = Math.min(Math.max(r + radialNoise, 0.1), radius);
    points.push(
      new Vector3(
        Math.cos(theta) * finalRadius,
        verticalNoise,
        Math.sin(theta) * finalRadius,
      ),
    );
  }
  return points;
}

/** 标准正态分布近似（Box-Muller；仅初始化期调用，非每帧）。 */
function gaussian(): number {
  const u = Math.max(Math.random(), Number.EPSILON);
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.round(value), min), max);
}

function clampPositive(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 100;
}
