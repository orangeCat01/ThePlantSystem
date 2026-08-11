<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useUniverseStore } from '@/stores/universe.store';
import { getApplicationCoordinator } from '@/app/coordinator';
import { TELESCOPE_CONFIGS } from '@/data/telescope/telescopes';
import { TELESCOPE_ZOOM_MAX, TELESCOPE_ZOOM_MIN } from '@/astronomy/TelescopeEngine';

/**
 * 望远镜控制面板（Phase 2.21）。
 * 显示：当前倍率 / 视场角 / 极限星等；控制：倍率 +/-、开启/关闭、配置切换。
 * 数据流：UI → Coordinator → Store → ObservationController → CameraController。
 * 禁止直接 import 'three'。
 */
const store = useUniverseStore();
const coordinator = getApplicationCoordinator();
const { telescopeEnabled, telescopeConfigId, telescopeZoom } = storeToRefs(store);

/** 场景侧望远镜状态（FOV / 极限星等由 TelescopeEngine 计算）。 */
const telescopeState = ref<{
  enabled: boolean;
  zoom: number;
  fieldOfViewDeg: number;
  limitingMagnitude: number;
} | null>(null);

/** 可选望远镜配置（预设表）。 */
const configOptions = computed(() => Object.entries(TELESCOPE_CONFIGS));

function refreshState(): void {  telescopeState.value = coordinator.getTelescopeState();
}

function onToggle(): void {
  if (telescopeEnabled.value) {
    coordinator.disableTelescope();
  } else {
    coordinator.enableTelescope();
  }
  refreshState();
}

function onZoomChange(delta: number): void {
  const next = Math.min(
    TELESCOPE_ZOOM_MAX,
    Math.max(TELESCOPE_ZOOM_MIN, telescopeZoom.value + delta),
  );
  coordinator.setTelescopeZoom(next);
  refreshState();
}

function onConfigChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  coordinator.setTelescopeConfigId(value);
  refreshState();
}

// 状态同步：Store 变化（含外部切换场景）时刷新场景侧状态。
watch([telescopeEnabled, telescopeZoom, telescopeConfigId], () => refreshState());
</script>

<template>
  <section class="telescope-panel">
    <h3 class="telescope-panel__title">🔭 望远镜模式</h3>

    <div class="telescope-panel__row">
      <span class="telescope-panel__label">配置</span>
      <select
        class="telescope-panel__select"
        :value="telescopeConfigId"
        data-testid="telescope-config"
        @change="onConfigChange"
      >
        <option v-for="[id, config] in configOptions" :key="id" :value="id">
          {{ config.apertureMm }}mm（极限 {{ config.limitingMagnitude }} 等）
        </option>
      </select>
    </div>

    <div class="telescope-panel__row">
      <span class="telescope-panel__label">倍率</span>
      <button
        class="telescope-panel__btn"
        type="button"
        aria-label="降低倍率"
        :disabled="telescopeZoom <= TELESCOPE_ZOOM_MIN"
        @click="onZoomChange(-1)"
      >
        −
      </button>
      <span class="telescope-panel__value" data-testid="telescope-zoom">{{ telescopeZoom }}×</span>
      <button
        class="telescope-panel__btn"
        type="button"
        aria-label="提高倍率"
        :disabled="telescopeZoom >= TELESCOPE_ZOOM_MAX"
        @click="onZoomChange(1)"
      >
        ＋
      </button>
    </div>

    <div class="telescope-panel__row">
      <span class="telescope-panel__label">视场角</span>
      <span class="telescope-panel__value" data-testid="telescope-fov">
        {{ telescopeState?.fieldOfViewDeg.toFixed(2) ?? '—' }}°
      </span>
    </div>

    <div class="telescope-panel__row">
      <span class="telescope-panel__label">极限星等</span>
      <span class="telescope-panel__value" data-testid="telescope-limiting">
        {{ telescopeState?.limitingMagnitude.toFixed(1) ?? '—' }}
      </span>
    </div>

    <div class="telescope-panel__row">
      <span class="telescope-panel__label">状态</span>
      <span class="telescope-panel__value" :class="{ 'is-on': telescopeEnabled }">
        {{ telescopeEnabled ? '已开启' : '已关闭' }}
      </span>
    </div>

    <button
      class="telescope-panel__toggle"
      type="button"
      :class="{ 'is-on': telescopeEnabled }"
      data-testid="telescope-toggle"
      @click="onToggle"
    >
      {{ telescopeEnabled ? '关闭望远镜' : '开启望远镜' }}
    </button>
  </section>
</template>

<style scoped>
.telescope-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(10, 16, 32, 0.85);
  border: 1px solid rgba(120, 160, 255, 0.25);
  color: #dbe6ff;
}

.telescope-panel__title {
  margin: 0;
  font-size: 14px;
  color: #ffd28a;
}

.telescope-panel__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.telescope-panel__label {
  width: 64px;
  font-size: 12px;
  color: #8fa3c8;
}

.telescope-panel__value {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.telescope-panel__value.is-on {
  color: #7ee08a;
}

.telescope-panel__select {
  flex: 1;
  padding: 4px 6px;
  border-radius: 6px;
  background: rgba(20, 30, 56, 0.9);
  border: 1px solid rgba(120, 160, 255, 0.3);
  color: #dbe6ff;
  font-size: 12px;
}

.telescope-panel__btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(60, 90, 160, 0.5);
  border: 1px solid rgba(120, 160, 255, 0.35);
  color: #dbe6ff;
  cursor: pointer;
  font-size: 14px;
}

.telescope-panel__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.telescope-panel__toggle {
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(60, 90, 160, 0.45);
  border: 1px solid rgba(120, 160, 255, 0.35);
  color: #dbe6ff;
  cursor: pointer;
  font-size: 13px;
}

.telescope-panel__toggle.is-on {
  background: rgba(230, 140, 60, 0.4);
  border-color: rgba(255, 190, 110, 0.5);
  color: #ffd28a;
}
</style>
