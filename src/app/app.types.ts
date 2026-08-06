import type { SceneName } from '@/types/common.types';

export interface CoordinatorOptions {
  initialScene: SceneName;
}

export interface AppLifecycleTarget {
  pause(): void;
  resume(): void;
  destroy(): void;
}
