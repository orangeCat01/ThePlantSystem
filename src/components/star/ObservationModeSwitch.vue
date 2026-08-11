<script setup lang="ts">
import { useUniverseStore } from '@/stores/universe.store';
import { getApplicationCoordinator } from '@/app/coordinator';
import type { ObservationMode } from '@/types/common.types';

/**
 * 深空观察模式切换（Phase 2.17）。
 *
 * 职责边界：只负责 UI 输入；
 * - 状态来源：useUniverseStore.starObservationMode。
 * - 事件出口：ApplicationCoordinator.setObservationMode()。
 */

const store = useUniverseStore();
const coordinator = getApplicationCoordinator();

const MODES: readonly { readonly mode: ObservationMode; readonly label: string }[] = [
  { mode: 'SOLAR_SYSTEM', label: '太阳系' },
  { mode: 'STELLAR_VIEW', label: '恒星观测' },
  { mode: 'CONSTELLATION_VIEW', label: '星座模式' },
  { mode: 'STAR_CATALOG', label: '星表' },
  { mode: 'NIGHT_OBSERVATION', label: '夜间观测' },
  { mode: 'FREE_EXPLORATION', label: '自由探索' },
];

const applyMode = (mode: ObservationMode): void => {
  coordinator.setObservationMode(mode);
};
</script>

<template>
  <section class="obs-mode" aria-label="深空观察模式">
    <h2>观察模式</h2>
    <div class="obs-mode__buttons" role="group">
      <button
        v-for="entry in MODES"
        :key="entry.mode"
        type="button"
        class="obs-mode__button"
        :class="{ 'obs-mode__button--active': store.starObservationMode === entry.mode }"
        :aria-pressed="store.starObservationMode === entry.mode"
        @click="applyMode(entry.mode)"
      >
        {{ entry.label }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.obs-mode {
  border: 1px solid var(--color-line, rgba(255, 255, 255, 0.14));
  border-radius: 12px;
  background: var(--color-panel, rgba(10, 14, 24, 0.72));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(18px);
  padding: 14px 16px;
}

.obs-mode h2 {
  margin: 0 0 10px;
  font-size: 15px;
}

.obs-mode__buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.obs-mode__button {
  border: 1px solid var(--color-line, rgba(255, 255, 255, 0.14));
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  padding: 6px 0;
  font-size: 13px;
  cursor: pointer;
}

.obs-mode__button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.obs-mode__button--active {
  border-color: rgba(85, 216, 255, 0.8);
  background: rgba(85, 216, 255, 0.16);
  color: var(--color-cyan, #55d8ff);
  font-weight: 600;
}
</style>
