<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useUniverseStore } from '@/stores/universe.store';
import { getApplicationCoordinator } from '@/app/coordinator';
import { starRepository } from '@/repositories/StarRepository';
import type { TargetVisibility } from '@/astronomy/observation.types';

/**
 * 观测控制面板（Phase 2.20）。
 *
 * 职责边界：只负责 UI 展示与输入；
 * - 地点/日期时间/开关：ApplicationCoordinator 桥接（Store + SolarScene ObservationEngine）。
 * - 可见目标列表：coordinator.getVisibleTargets()（UI 不直接调用计算模块）。
 * - 禁止 import three；禁止在组件中写天文计算。
 */

const store = useUniverseStore();
const coordinator = getApplicationCoordinator();

/** 纬度/经度输入（本地编辑，提交时经校验下发）。 */
const latitudeInput = ref(store.observerLocation?.latitude ?? 39.9);
const longitudeInput = ref(store.observerLocation?.longitude ?? 116.4);

/** 日期时间输入（本地编辑，提交时经校验下发）。 */
const dateTimeInput = ref(store.observerDateTime);

/** 可见目标列表（日期/时间/地点变化时刷新，不每帧轮询）。 */
const visibleTargets = ref<readonly TargetVisibility[]>([]);

/** 可见数量。 */
const visibleCount = computed(() => visibleTargets.value.length);

/** 本地恒星时（度 → 时分展示）。 */
const siderealTimeText = computed(() => {
  const lst = coordinator.getLocalSiderealTime();
  if (!Number.isFinite(lst)) {
    return '暂无数据';
  }
  const hours = (lst / 15) % 24;
  const hh = Math.floor(hours);
  const mm = Math.floor((hours - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
});

const refresh = (): void => {
  visibleTargets.value = coordinator.getVisibleTargets();
  latitudeInput.value = store.observerLocation?.latitude ?? latitudeInput.value;
  longitudeInput.value = store.observerLocation?.longitude ?? longitudeInput.value;
  dateTimeInput.value = store.observerDateTime;
};

watch(
  () => [store.observerLocation, store.observerDateTime],
  refresh,
  { immediate: true },
);

/** 恒星中文名（数据层解析）。 */
const starName = (starId: string): string => starRepository.getById(starId)?.name ?? starId;

/** 观测等级中文。 */
const qualityLabel = (quality: TargetVisibility['quality']): string => {
  const labels: Record<string, string> = {
    excellent: '极佳',
    good: '良好',
    low: '较低',
  };
  return quality ? labels[quality] ?? quality : '—';
};

const submitLocation = (): void => {
  coordinator.setObserverLocation(
    Number(latitudeInput.value),
    Number(longitudeInput.value),
    '自定义地点',
  );
};

const submitDateTime = (): void => {
  coordinator.setObserverDateTime(dateTimeInput.value);
};

const toggleVisibleOnly = (enabled: boolean): void => {
  coordinator.setVisibleOnly(enabled);
};

const focusBestTarget = (): void => {
  void coordinator.focusVisibleTarget();
};
</script>

<template>
  <section class="observation-panel" aria-label="观测控制面板">
    <h2>观测环境</h2>

    <form class="observation-panel__form" @submit.prevent="submitLocation">
      <div class="observation-panel__row">
        <label>
          <span>纬度</span>
          <input v-model.number="latitudeInput" type="number" step="0.1" min="-90" max="90" />
        </label>
        <label>
          <span>经度</span>
          <input v-model.number="longitudeInput" type="number" step="0.1" min="-180" max="180" />
        </label>
        <button type="submit">设置地点</button>
      </div>
      <p class="observation-panel__hint">
        当前地点：{{ store.observerLocation?.name ?? '北京（默认）' }}（{{
          store.observerLocation?.latitude ?? 39.9
        }}°, {{ store.observerLocation?.longitude ?? 116.4 }}°）
      </p>
    </form>

    <form class="observation-panel__form" @submit.prevent="submitDateTime">
      <label class="observation-panel__datetime">
        <span>日期时间</span>
        <input v-model="dateTimeInput" type="datetime-local" step="60" />
      </label>
      <button type="submit">应用</button>
    </form>

    <dl class="observation-panel__facts">
      <div class="observation-panel__fact">
        <dt>本地恒星时</dt>
        <dd>{{ siderealTimeText }}</dd>
      </div>
      <div class="observation-panel__fact">
        <dt>可见恒星</dt>
        <dd>{{ visibleCount }} 颗</dd>
      </div>
    </dl>

    <label class="observation-panel__toggle">
      <input
        type="checkbox"
        :checked="store.visibleOnly"
        @change="toggleVisibleOnly(($event.target as HTMLInputElement).checked)"
      />
      <span>仅显示可见目标</span>
    </label>

    <div v-if="visibleTargets.length > 0" class="observation-panel__targets">
      <header class="observation-panel__targets-header">
        <h3>当前可见天体</h3>
        <button type="button" class="observation-panel__best" @click="focusBestTarget">
          定位最佳目标
        </button>
      </header>
      <ul class="observation-panel__target-list">
        <li v-for="target in visibleTargets.slice(0, 10)" :key="target.starId">
          <span class="observation-panel__star-name">{{ starName(target.starId) }}</span>
          <span class="observation-panel__alt">{{ target.altitude.toFixed(1) }}°</span>
          <span class="observation-panel__az">{{ target.azimuth.toFixed(0) }}°</span>
          <span class="observation-panel__quality">{{ qualityLabel(target.quality) }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.observation-panel {
  border: 1px solid rgba(85, 216, 255, 0.3);
  border-radius: 12px;
  background: var(--color-panel, rgba(10, 14, 24, 0.72));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(18px);
  padding: 14px 16px;
}

.observation-panel h2 {
  margin: 0 0 12px;
  font-size: 15px;
}

.observation-panel__form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.observation-panel__row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 6px;
  align-items: end;
}

.observation-panel__row label,
.observation-panel__datetime {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--color-muted, rgba(255, 255, 255, 0.55));
}

.observation-panel input {
  border: 1px solid var(--color-line, rgba(255, 255, 255, 0.2));
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  padding: 6px 8px;
  font-size: 13px;
}

.observation-panel button {
  border: 1px solid rgba(85, 216, 255, 0.5);
  border-radius: 8px;
  background: rgba(85, 216, 255, 0.12);
  color: var(--color-cyan, #55d8ff);
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
}

.observation-panel__hint {
  margin: 0;
  font-size: 12px;
  color: var(--color-muted, rgba(255, 255, 255, 0.6));
}

.observation-panel__facts {
  display: grid;
  gap: 6px;
  margin: 0 0 10px;
}

.observation-panel__fact {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.observation-panel__fact dd {
  margin: 0;
  font-weight: 600;
}

.observation-panel__toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
  margin-bottom: 10px;
}

.observation-panel__targets {
  border-top: 1px solid var(--color-line, rgba(255, 255, 255, 0.12));
  padding-top: 10px;
}

.observation-panel__targets-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.observation-panel__targets-header h3 {
  margin: 0;
  font-size: 13px;
}

.observation-panel__best {
  padding: 3px 8px !important;
  font-size: 12px !important;
}

.observation-panel__target-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 180px;

}

.observation-panel__target-list li {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 10px;
  font-size: 12px;
  padding: 3px 6px;
  border-radius: 6px;
}

.observation-panel__target-list li:nth-child(odd) {
  background: rgba(255, 255, 255, 0.04);
}

.observation-panel__alt,
.observation-panel__az {
  color: var(--color-muted, rgba(255, 255, 255, 0.65));
  font-variant-numeric: tabular-nums;
}

.observation-panel__quality {
  color: var(--color-cyan, #55d8ff);
}
</style>
