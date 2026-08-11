<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useUniverseStore } from '@/stores/universe.store';
import { deepSkyRepository } from '@/repositories/DeepSkyRepository';
import { getApplicationCoordinator } from '@/app/coordinator';

/**
 * 深空天体信息面板（Phase 2.21）。
 * 显示：名称 / 类型 / 距离 / 视大小 / 星等 / 简介。
 * 数据流：Store.selectedTarget（type='deepSky'）→ DeepSkyRepository → 展示。
 * 禁止 import 'three'。
 */
const store = useUniverseStore();
const coordinator = getApplicationCoordinator();
const { selectedTargetId, selectedTargetType } = storeToRefs(store);

/** 当前选中的深空天体（仅当统一目标类型为 deepSky 时显示）。 */
const object = computed(() => {
  if (selectedTargetType.value !== 'deepSky' || !selectedTargetId.value) {
    return undefined;
  }
  return deepSkyRepository.getById(selectedTargetId.value);
});

/** 类型中文标签。 */
const typeLabel = computed(() => {
  switch (object.value?.type) {
    case 'nebula':
      return '星云';
    case 'galaxy':
      return '星系';
    case 'cluster':
      return '星团';
    default:
      return '深空天体';
  }
});

/** 距离显示（光年；无数据时占位）。 */
const distanceText = computed(() => {
  const distance = object.value?.distanceLightYears;
  if (distance === undefined) {
    return '—';
  }
  return distance >= 10000 ? `${(distance / 1000).toFixed(0)} 千光年` : `${distance.toFixed(0)} 光年`;
});

/** 视大小显示（角分）。 */
const sizeText = computed(() => {
  const size = object.value?.sizeArcMin;
  return size === undefined ? '—' : `${size.toFixed(0)}′`;
});

/** 星等显示。 */
const magnitudeText = computed(() => {
  const magnitude = object.value?.magnitude;
  return magnitude === undefined ? '—' : `${magnitude.toFixed(1)} 等`;
});

function onFocus(): void {
  if (object.value) {
    void coordinator.focusTarget(object.value.id);
  }
}
</script>

<template>
  <section v-if="object" class="deep-sky-panel">
    <h3 class="deep-sky-panel__title">
      {{ object.name }}
      <span v-if="object.messier" class="deep-sky-panel__messier">{{ object.messier }}</span>
    </h3>

    <dl class="deep-sky-panel__grid">
      <dt>类型</dt>
      <dd data-testid="deepsky-type">{{ typeLabel }}</dd>
      <dt>距离</dt>
      <dd>{{ distanceText }}</dd>
      <dt>视大小</dt>
      <dd>{{ sizeText }}</dd>
      <dt>星等</dt>
      <dd>{{ magnitudeText }}</dd>
    </dl>

    <p class="deep-sky-panel__desc">{{ object.description }}</p>

    <button
      class="deep-sky-panel__focus"
      type="button"
      data-testid="deepsky-focus"
      @click="onFocus"
    >
      定位到 {{ object.name }}
    </button>
  </section>
</template>

<style scoped>
.deep-sky-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(10, 16, 32, 0.85);
  border: 1px solid rgba(160, 200, 255, 0.3);
  color: var(--color-text, #dbe6ff);
}

.deep-sky-panel__title {
  margin: 0;
  font-size: 14px;
  color: var(--color-cyan, #9fc6ff);
}

.deep-sky-panel__messier {
  margin-left: 6px;
  font-size: 12px;
  color: #8fa3c8;
}

.deep-sky-panel__grid {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 4px 8px;
  margin: 0;
  font-size: 12px;
}

.deep-sky-panel__grid dt {
  color: #8fa3c8;
}

.deep-sky-panel__grid dd {
  margin: 0;
}

.deep-sky-panel__desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--color-muted, #b9c8e6);
}

.deep-sky-panel__focus {
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(60, 90, 160, 0.45);
  border: 1px solid rgba(120, 160, 255, 0.35);
  color: var(--color-text, #dbe6ff);
  cursor: pointer;
  font-size: 13px;
}
</style>
