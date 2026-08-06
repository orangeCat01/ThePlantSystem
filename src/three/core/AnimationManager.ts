import type { AnimationUpdateCallback } from './three.types';

export class AnimationManager {
  private animationFrameId: number | null = null;
  private callbacks = new Map<string, AnimationUpdateCallback>();
  private running = false;
  private paused = false;
  private lastTimestamp = 0;
  private elapsedTime = 0;
  private readonly maxDeltaTime = 0.05;

  addUpdateCallback(id: string, callback: AnimationUpdateCallback): void {
    this.callbacks.set(id, callback);
  }

  removeUpdateCallback(id: string): void {
    this.callbacks.delete(id);
  }

  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.paused = false;
    this.lastTimestamp = performance.now();
    this.animationFrameId = window.requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    this.paused = false;
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.lastTimestamp = performance.now();
  }

  destroy(): void {
    this.stop();
    this.callbacks.clear();
    this.elapsedTime = 0;
  }

  private readonly tick = (timestamp: number): void => {
    if (!this.running) {
      return;
    }

    const rawDeltaTime = (timestamp - this.lastTimestamp) / 1000;
    const deltaTime = Math.min(Math.max(rawDeltaTime, 0), this.maxDeltaTime);
    this.lastTimestamp = timestamp;

    if (!this.paused) {
      this.elapsedTime += deltaTime;
      this.callbacks.forEach((callback) => callback(deltaTime, this.elapsedTime));
    }

    this.animationFrameId = window.requestAnimationFrame(this.tick);
  };
}
