<script setup lang="ts">
import { computed } from 'vue';
import { useUniverseStore } from '@/stores/universe.store';
import { getApplicationCoordinator } from '@/app/coordinator';

/**
 * 太阳系时间控制组件（Phase 2.13.1）。
 *
 * 职责边界：只负责 UI 展示与用户输入；
 * - 状态来源：useUniverseStore（timeScale / animationPaused / simulationSpeedOptions）。
 * - 事件出口：ApplicationCoordinator（setSimulationSpeed / setSimulationPaused）。
 * - 禁止 import three；禁止直接调用 SolarScene。
 */

const store = useUniverseStore();
const coordinator = getApplicationCoordinator();

/** 档位中文标签（×0 / ×0.1 / ×1 / ×5 / ×20）。 */
const speedLabel = (speed: number): string => `×${String(speed)}`;

/** 当前是否选中该档位（与 store.timeScale 精确比较；档位均为有限合法值）。 */
const isActiveSpeed = (speed: number): boolean => store.timeScale === speed;

/** 当前是否有档位被选中（自定义滑动值时不高亮任何档位）。 */
const hasActivePreset = computed(() => store.simulationSpeedOptions.includes(store.timeScale));

const applySpeed = (speed: number): void => {
  coordinator.setSimulationSpeed(speed);
};

const togglePaused = (): void => {
  coordinator.setSimulationPaused(!store.animationPaused);
};
</script>

<template>
  <section class="time-control" aria-label="时间控制">
    <div class="time-control__header">
      <h2>模拟速度</h2>
      <button
        type="button"
        class="time-control__pause"
        :class="{ 'time-control__pause--active': store.animationPaused }"
        @click="togglePaused"
      >
        {{ store.animationPaused ? '继续' : '暂停' }}
      </button>
    </div>

    <div class="time-control__speeds" role="group" aria-label="预设速度档位">
      <button
        v-for="speed in store.simulationSpeedOptions"
        :key="speed"
        type="button"
        class="time-control__speed"
        :class="{ 'time-control__speed--active': isActiveSpeed(speed) }"
        :aria-pressed="isActiveSpeed(speed)"
        @click="applySpeed(speed)"
      >
        {{ speedLabel(speed) }}
      </button>
    </div>

    <p class="time-control__status">
      <template v-if="store.animationPaused">模拟已暂停</template>
      <template v-else-if="hasActivePreset">运行中（{{ speedLabel(store.timeScale) }}）</template>
      <template v-else>运行中（×{{ store.timeScale }}）</template>
    </p>
  </section>
</template>

<style scoped>
.time-control {
  border: 1px solid var(--color-line, rgba(255, 255, 255, 0.14));
  border-radius: 12px;
  background: var(--color-panel, rgba(10, 14, 24, 0.72));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(18px);
  padding: 14px 16px;
}

.time-control__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.time-control__header h2 {
  margin: 0;
  font-size: 15px;
}

.time-control__pause {
  border: 1px solid var(--color-line, rgba(255, 255, 255, 0.2));
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  padding: 4px 12px;
  cursor: pointer;
}

.time-control__pause:hover {
  background: rgba(255, 255, 255, 0.12);
}

.time-control__pause--active {
  border-color: rgba(85, 216, 255, 0.6);
  color: var(--color-cyan, #55d8ff);
}

.time-control__speeds {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.time-control__speed {
  border: 1px solid var(--color-line, rgba(255, 255, 255, 0.14));
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  padding: 6px 0;
  font-size: 13px;
  cursor: pointer;
}

.time-control__speed:hover {
  background: rgba(255, 255, 255, 0.1);
}

.time-control__speed--active {
  border-color: rgba(85, 216, 255, 0.8);
  background: rgba(85, 216, 255, 0.16);
  color: var(--color-cyan, #55d8ff);
  font-weight: 600;
}

.time-control__status {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--color-muted, rgba(255, 255, 255, 0.55));
}
</style>
