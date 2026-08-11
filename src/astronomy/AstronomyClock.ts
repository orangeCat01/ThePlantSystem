import { dateToJulianDay, isValidAstronomyDate, julianDayToDate } from './JulianDate';
import type { SimulationTimeState } from './astronomy.types';

/** 一天的模拟秒数（时间推进换算用）。 */
const SECONDS_PER_DAY = 86400;
/** 默认模拟日期（与 Store 默认一致）。 */
const DEFAULT_DATE = '2026-01-01';

/** 内部可变时间状态（getState 返回其只读视图 SimulationTimeState）。 */
type MutableTimeState = {
  date: string;
  julianDay: number;
  timeScale: number;
  paused: boolean;
};

/**
 * 天文时钟（Phase 2.15）。
 *
 * 职责：统一管理模拟时间——日期、儒略日、时间倍率与暂停状态。
 *
 * 设计约束：
 * - 不使用 Date.now() / 真实系统时间：时间只基于「初始日期 + deltaTime × timeScale」推进。
 * - update(deltaTime) 由 SolarScene 每帧调用（唯一 AnimationManager RAF 驱动）。
 * - setDate 接受 YYYY-MM-DD；非法日期安全忽略（保持原值）。
 * - getState() 返回内部复用状态对象（不创建新对象，满足每帧性能约束）。
 *
 * 依赖：仅 JulianDate 纯函数模块；禁止依赖 Vue / Pinia / Three.js。
 */
export class AstronomyClock {
  private currentJulianDay: number;
  private timeScale = 1;
  private paused = false;
  private readonly state: MutableTimeState;

  constructor(initialDate: string = DEFAULT_DATE) {
    const jd = dateToJulianDay(initialDate);
    if (!Number.isFinite(jd)) {
      // 非法初始日期回退默认值（构造期 fail-safe）。
      this.currentJulianDay = dateToJulianDay(DEFAULT_DATE);
    } else {
      this.currentJulianDay = jd;
    }
    this.state = {
      date: julianDayToDate(this.currentJulianDay),
      julianDay: this.currentJulianDay,
      timeScale: this.timeScale,
      paused: this.paused,
    };
  }

  /** 当前模拟日期（YYYY-MM-DD）。 */
  getDate(): string {
    return julianDayToDate(this.currentJulianDay);
  }

  /** 当前儒略日（0h UT 约定）。 */
  getJulianDay(): number {
    return this.currentJulianDay;
  }

  /** 设置模拟日期（YYYY-MM-DD）。非法日期安全忽略（保持原值）。 */
  setDate(date: string): void {
    if (!isValidAstronomyDate(date)) {
      return;
    }
    this.currentJulianDay = dateToJulianDay(date);
  }

  /**
   * 推进模拟时间（deltaTime 秒 × timeScale）。
   * 暂停或非法 deltaTime 时安全返回；不使用任何真实时钟。
   */
  update(deltaTime: number): void {
    if (this.paused) {
      return;
    }
    if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
      return;
    }
    const safeScale = Number.isFinite(this.timeScale) && this.timeScale >= 0 ? this.timeScale : 1;
    if (safeScale === 0) {
      return;
    }
    this.currentJulianDay += (deltaTime * safeScale) / SECONDS_PER_DAY;
  }

  /** 设置时间倍率（>= 0；NaN / Infinity / 负数安全恢复为 1）。 */
  setTimeScale(scale: number): void {
    this.timeScale = Number.isFinite(scale) && scale >= 0 ? scale : 1;
  }

  /** 暂停时间推进。 */
  pause(): void {
    this.paused = true;
  }

  /** 恢复时间推进。 */
  resume(): void {
    this.paused = false;
  }

  /** 当前是否暂停。 */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * 返回模拟时间状态快照（复用内部对象，不创建新对象）。
   * 注意：返回的是内部可变对象引用，调用方不得修改其内容。
   */
  getState(): SimulationTimeState {
    this.state.date = julianDayToDate(this.currentJulianDay);
    this.state.julianDay = this.currentJulianDay;
    this.state.timeScale = this.timeScale;
    this.state.paused = this.paused;
    return this.state;
  }
}
