<script setup lang="ts">
import { computed } from 'vue';
import type { CameraMode } from '@/types/common.types';
import { useUniverseStore } from '@/stores/universe.store';
import { getApplicationCoordinator } from '@/app/coordinator';

const store = useUniverseStore();
const coordinator = getApplicationCoordinator();

const cameraModeLabels: Record<CameraMode, string> = {
  FREE: '自由视角',
  FOCUSING: '聚焦中',
  FOLLOWING: '跟随中',
  RESETTING: '复位中',
  TELESCOPE: '望远镜',
  MISSION_FOLLOW: '任务跟随',
};

/** 相机模式中文标签（Store 已由 Coordinator 实时同步）。 */
const cameraModeText = computed(() => cameraModeLabels[store.cameraMode]);

const onTimeScaleInput = (event: Event): void => {
  const value = Number((event.target as HTMLInputElement).value);
  coordinator.setTimeScale(value);
};

const togglePaused = (): void => {
  coordinator.setAnimationPaused(!store.animationPaused);
};

const toggleOrbitVisible = (): void => {
  coordinator.setOrbitVisible(!store.orbitVisible);
};
</script>

<template>
  <section class="control-panel" aria-label="模拟控制面板">
    <h2>模拟控制</h2>

    <div class="control-panel__row">
      <label class="control-panel__label" for="time-scale">时间速度</label>
      <input
        id="time-scale"
        class="control-panel__slider"
        type="range"
        min="0"
        max="3"
        step="0.25"
        :value="store.timeScale"
        @input="onTimeScaleInput"
      />
      <span class="control-panel__value">{{ store.timeScale.toFixed(2) }}x</span>
    </div>

    <div class="control-panel__row">
      <span class="control-panel__label">模拟状态</span>
      <button type="button" class="control-panel__button" @click="togglePaused">
        {{ store.animationPaused ? '继续' : '暂停' }}
      </button>
    </div>

    <div class="control-panel__row">
      <label class="control-panel__toggle">
        <input type="checkbox" :checked="store.orbitVisible" @change="toggleOrbitVisible" />
        <span>显示轨道</span>
      </label>
    </div>

    <div class="control-panel__row">
      <span class="control-panel__label">相机状态</span>
      <strong class="control-panel__mode">{{ cameraModeText }}</strong>
    </div>
  </section>
</template>

<style scoped>
.control-panel {
  border: 1px solid var(--color-line, rgba(255, 255, 255, 0.14));
  border-radius: 12px;
  background: var(--color-panel, rgba(10, 14, 24, 0.72));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(18px);
  padding: 14px;
}

.control-panel h2 {
  margin: 0 0 12px;
  font-size: 15px;
}

.control-panel__row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 32px;
}

.control-panel__row + .control-panel__row {
  margin-top: 4px;
}

.control-panel__label {
  min-width: 64px;
  color: var(--color-muted, rgba(255, 255, 255, 0.55));
  font-size: 13px;
}

.control-panel__slider {
  flex: 1;
  min-width: 0;
  accent-color: var(--color-cyan, #55d8ff);
}

.control-panel__value {
  min-width: 48px;
  font-size: 13px;
  font-weight: 600;
  text-align: right;
}

.control-panel__button {
  border: 1px solid var(--color-line, rgba(255, 255, 255, 0.2));
  border-radius: 6px;
  background: rgba(85, 216, 255, 0.12);
  color: inherit;
  cursor: pointer;
  padding: 4px 14px;
  font-size: 13px;
}

.control-panel__button:hover {
  background: rgba(85, 216, 255, 0.22);
}

.control-panel__toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
}

.control-panel__toggle input {
  accent-color: var(--color-cyan, #55d8ff);
}

.control-panel__mode {
  color: var(--color-cyan, #55d8ff);
  font-size: 13px;
}
</style>
