/**
 * 儒略日（Julian Day）转换（Phase 2.15）。
 *
 * 纯函数模块：
 * - 禁止依赖 Vue / Pinia / Three.js；禁止 Date.now()（本模块只用给定日期计算）。
 * - 日期格式：YYYY-MM-DD（格里高利历）。
 * - 约定：返回 0h UT 的 JD（小数部分 .5，如 2026-01-01 → 2461041.5）。
 *
 * 公式来源：Meeus, "Astronomical Algorithms"（公历 JD 换算标准算法）。
 */

/** YYYY-MM-DD 格式校验正则。 */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 校验日期字符串：必须为 YYYY-MM-DD 且是真实存在的格里高利历日期。
 * 非法返回 false（调用方安全处理，不抛错）。
 */
export function isValidAstronomyDate(date: string): boolean {
  if (!DATE_PATTERN.test(date)) {
    return false;
  }
  const parts = date.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return false;
  }
  if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  // 反向校验：Date.UTC 溢出（如 2026-02-30 → 3 月 2 日）时逐项比对拒绝。
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

/**
 * 日期字符串 → 儒略日（0h UT）。
 * 非法日期（格式错误 / 不存在的日期 / 超出 1000~9999 年）返回 NaN。
 */
export function dateToJulianDay(date: string): number {
  if (!isValidAstronomyDate(date)) {
    return NaN;
  }

  const parts = date.split('-');
  let year = Number(parts[0]);
  let month = Number(parts[1]);
  const day = Number(parts[2]);

  // 1、2 月视为上一年 13、14 月（Meeus 算法约定）。
  if (month <= 2) {
    year -= 1;
    month += 12;
  }

  const century = Math.floor(year / 100);
  const leapCorrection = 2 - century + Math.floor(century / 4);

  // 0h UT 的 JD（结果 .5 结尾）。
  return (
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    leapCorrection -
    1524.5
  );
}

/**
 * 儒略日 → 日期字符串（YYYY-MM-DD，格里高利历）。
 * 非有限 JD 返回空字符串（调用方安全处理）。
 */
export function julianDayToDate(julianDay: number): string {
  if (!Number.isFinite(julianDay)) {
    return '';
  }

  // 0h UT 约定：加 0.5 后进入整数日部分（Meeus 算法）。
  let jd = julianDay + 0.5;
  const z = Math.floor(jd);
  const f = jd - z;

  let alpha = Math.floor((z - 1867216.25) / 36524.25);
  let a = z + 1 + alpha - Math.floor(alpha / 4);
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);

  const dayWithFraction = b - d - Math.floor(30.6001 * e) + f;
  const day = Math.floor(dayWithFraction + 0.5);
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;

  if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) {
    return '';
  }

  const monthText = String(month).padStart(2, '0');
  const dayText = String(day).padStart(2, '0');
  return `${year}-${monthText}-${dayText}`;
}
