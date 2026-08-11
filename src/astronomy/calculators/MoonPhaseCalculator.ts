/**
 * 月相计算器（Phase 2.15）。
 *
 * 基于儒略日计算月相：光照比例、月龄与相位名称。
 * 简化天文算法（Meeus 简化式）：
 * - 朔望月长度 29.53059 天。
 * - 参考新月：2000-01-06 18:14 UT（JD 2451550.1）。
 *
 * 纯函数模块：禁止依赖 Vue / Pinia / Three.js；不使用 Date.now()。
 */

/** 朔望月长度（天）。 */
const SYNODIC_MONTH = 29.53059;
/** 参考新月儒略日（2000-01-06 18:14 UT）。 */
const REFERENCE_NEW_MOON_JD = 2451550.1;
/** 每相位时长（天）= 朔望月 / 8。 */
const PHASE_SEGMENT = SYNODIC_MONTH / 8;

/** 月相数据（只读视图，供消费方读取）。 */
export interface MoonPhaseData {
  /** 光照比例（0~1；0 = 新月，1 = 满月）。 */
  readonly illumination: number;
  /** 相位名称（中文，八相之一）。 */
  readonly phaseName: string;
  /** 月龄（自新月起的天数，0~29.53）。 */
  readonly age: number;
}

/** 内部可变月相状态（计算写回目标；只读视图为 MoonPhaseData）。 */
export type MutableMoonPhaseData = {
  illumination: number;
  phaseName: string;
  age: number;
};

/** 八相位名称（顺序：新月起）。 */
const PHASE_NAMES: readonly string[] = [
  '新月',
  '娥眉月',
  '上弦月',
  '盈凸月',
  '满月',
  '亏凸月',
  '下弦月',
  '残月',
];

/** 根据月龄（0~朔望月）返回相位名称（八相等分区间）。 */
function phaseNameForAge(age: number): string {
  const segmentIndex = Math.min(PHASE_NAMES.length - 1, Math.floor(age / PHASE_SEGMENT));
  // 索引恒在 [0, 7] 内；兜底字符串仅为满足严格索引检查（不可达分支）。
  return PHASE_NAMES[segmentIndex] ?? '新月';
}

/**
 * 计算月相（复用入参对象写回，避免创建新对象）。
 * 非法 JD 返回 false（结果对象保持原值，调用方安全处理）。
 */
export function calculateMoonPhase(
  julianDay: number,
  target: MutableMoonPhaseData,
): boolean {
  if (!Number.isFinite(julianDay)) {
    return false;
  }

  const daysSinceReference = julianDay - REFERENCE_NEW_MOON_JD;
  // 归一化到 [0, 朔望月)：euclideanModulo 对负数同样返回非负值。
  const age = ((daysSinceReference % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;

  const illumination = (1 - Math.cos((2 * Math.PI * age) / SYNODIC_MONTH)) / 2;
  const phaseName = phaseNameForAge(age);

  target.illumination = illumination;
  target.phaseName = phaseName;
  target.age = age;
  return true;
}
