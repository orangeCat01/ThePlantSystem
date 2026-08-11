/**
 * 加载进度跟踪器（Phase 2.16）。
 *
 * 职责：统一统计天体模型加载数量、已完成数量、失败列表与当前进度。
 *
 * 边界：
 * - 无 Vue / Pinia / Store 依赖（纯逻辑）。
 * - 由 SolarScene 创建并驱动；进度经类型化回调由 ApplicationCoordinator 同步到 UI。
 * - destroy 幂等，重复调用无异常。
 */

/** 加载进度快照（可序列化，经 Coordinator 同步 Store）。 */
export interface LoadingProgressState {
  /** 0-100。 */
  readonly progress: number;
  /** 已完成（含失败降级）天体数。 */
  readonly loaded: number;
  /** 总天体数。 */
  readonly total: number;
  /** 加载失败的天体 ID 列表（去重）。 */
  readonly failedIds: readonly string[];
}

export class LoadingTracker {
  private total = 0;
  private loaded = 0;
  private readonly failedIds: string[] = [];
  private destroyed = false;

  /** 开始一批加载（重置统计；total 非正数安全忽略）。 */
  start(total: number): void {
    if (this.destroyed) {
      return;
    }
    this.total = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
    this.loaded = 0;
    this.failedIds.length = 0;
  }

  /** 一个天体加载完成（成功或占位降级都视为完成；不超总数）。 */
  itemLoaded(): void {
    if (this.destroyed) {
      return;
    }
    if (this.loaded < this.total) {
      this.loaded += 1;
    }
  }

  /** 一个天体模型加载失败（记录 ID，去重；不计数进度，进度由 itemLoaded 推进）。 */
  itemFailed(id: string): void {
    if (this.destroyed) {
      return;
    }
    if (id && !this.failedIds.includes(id)) {
      this.failedIds.push(id);
    }
  }

  /** 当前进度（0-100）：(已完成 + 失败数) / 总数；总数非法返回 0。 */
  getProgress(): number {
    if (this.total <= 0) {
      return 0;
    }
    const done = Math.min(this.loaded + this.failedIds.length, this.total);
    return Math.round((done / this.total) * 100);
  }

  /** 当前快照（供回调上报 / 断言）。 */
  getState(): LoadingProgressState {
    return {
      progress: this.getProgress(),
      loaded: this.loaded,
      total: this.total,
      failedIds: [...this.failedIds],
    };
  }

  /** 重置统计（保留实例，供下一批加载复用）。 */
  reset(): void {
    this.total = 0;
    this.loaded = 0;
    this.failedIds.length = 0;
  }

  /** 幂等销毁（重复调用无异常）。 */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.reset();
    this.destroyed = true;
  }
}
