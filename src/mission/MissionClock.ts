/**
 * 任务时间时钟（Phase 2.22）。
 *
 * 职责：以模拟 deltaTime 推进任务时间（missionDate）。
 *
 * 约束：
 * - 禁止使用 Date.now() / setInterval / setTimeout：时间只由 AnimationManager
 *   提供的 deltaTime 驱动（与场景时间系统一致）。
 * - 速度档位：1× / 10× / 100× / 1000×（1× = 每秒推进 1 天）。
 * - 暂停时 update 直接返回（时间不推进）。
 */

/** 日期解析：YYYY-MM-DD → UTC 毫秒；非法返回 NaN。 */
function parseDate(date: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    return Number.NaN;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return Number.NaN;
  }
  return Date.UTC(year, month - 1, day);
}

/** UTC 毫秒 → YYYY-MM-DD。 */
function formatDate(millis: number): string {
  const date = new Date(millis);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 每秒推进的任务天数（1× 档位）。 */
const DAYS_PER_SECOND = 1;

export class MissionClock {
  /** 当前任务日期（YYYY-MM-DD）。 */
  private missionDate: string;
  /** 时间倍率（1 / 10 / 100 / 1000）。 */
  private speed = 1;
  /** 暂停标志。 */
  private paused = false;

  constructor(initialDate: string) {
    this.missionDate = Number.isNaN(parseDate(initialDate)) ? '1970-01-01' : initialDate;
  }

  /** 当前任务日期。 */
  getMissionDate(): string {
    return this.missionDate;
  }

  /** 当前时间倍率。 */
  getSpeed(): number {
    return this.speed;
  }

  /** 是否暂停。 */
  isPaused(): boolean {
    return this.paused;
  }

  /** 设置任务日期（非法输入安全忽略）。 */
  setMissionDate(date: string): void {
    if (!Number.isNaN(parseDate(date))) {
      this.missionDate = date;
    }
  }

  /** 设置时间倍率（[1, 10000] 钳制；非法输入安全忽略）。 */
  setSpeed(speed: number): void {
    if (!Number.isFinite(speed)) {
      return;
    }
    this.speed = Math.min(Math.max(speed, 1), 10000);
  }

  /** 暂停 / 恢复。 */
  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  /** 重置到指定日期（同时清暂停）。 */
  reset(date: string): void {
    this.setMissionDate(date);
    this.paused = false;
  }

  /**
   * 以模拟 deltaTime 推进任务时间。
   * deltaTime 必须非负且设上限（防切后台跳变），上限 1 秒。
   */
  update(deltaTime: number): void {
    if (this.paused || !Number.isFinite(deltaTime) || deltaTime <= 0) {
      return;
    }
    const clamped = Math.min(deltaTime, 1);
    const base = parseDate(this.missionDate);
    if (Number.isNaN(base)) {
      return;
    }
    const days = clamped * this.speed * DAYS_PER_SECOND;
    this.missionDate = formatDate(base + days * 24 * 60 * 60 * 1000);
  }
}
