<script setup lang="ts">
import { computed } from 'vue';
import { useUniverseStore } from '@/stores/universe.store';
import { solarObjectRepository } from '@/repositories/SolarObjectRepository';

/**
 * 太阳系小天体信息面板（Phase 2.23）。
 *
 * 展示：哈雷彗星 / 小行星带 / 未来小天体。
 * - 状态来源：Store.selectedSolarObjectId（未选择不渲染）。
 * - 数据来源：SolarObjectRepository（纯数据层，禁止读 Three / Store）。
 * - 风格与 PlanetPanel 一致：两列卡片（标签 / 数值 / 单位 nowrap）。
 */
const store = useUniverseStore();

/** 当前选中小天体配置；未选择或未知 ID 时为 undefined（不渲染）。 */
const object = computed(() => {
  const id = store.selectedSolarObjectId;
  if (!id) {
    return undefined;
  }
  return solarObjectRepository.getById(id);
});

const close = (): void => {
  store.clearSolarObject();
};
</script>

<template>
  <section v-if="object" class="solar-object-panel" aria-label="小天体信息面板">
    <header class="solar-object-panel__title">
      <span class="solar-object-panel__name">{{ object.name }}</span>
      <span class="solar-object-panel__type">{{ object.science.typeLabel }}</span>
    </header>

    <dl class="solar-object-panel__facts">
      <div class="solar-object-panel__fact">
        <dt>类型</dt>
        <dd>
          <span class="fact-value">{{ object.science.typeLabel }}</span>
        </dd>
      </div>
      <div class="solar-object-panel__fact">
        <dt>周期</dt>
        <dd v-if="object.science.periodYears !== undefined">
          <span class="fact-value">{{ object.science.periodYears }}</span>
          <span class="fact-unit">年</span>
        </dd>
        <dd v-else class="fact-missing">暂无数据</dd>
      </div>
      <div class="solar-object-panel__fact">
        <dt>来源</dt>
        <dd v-if="object.science.origin">
          <span class="fact-value">{{ object.science.origin }}</span>
        </dd>
        <dd v-else class="fact-missing">暂无数据</dd>
      </div>
    </dl>

    <p class="solar-object-panel__summary">{{ object.science.summary }}</p>

    <button class="solar-object-panel__close" type="button" @click="close">关闭</button>
  </section>
</template>

<style scoped>
.solar-object-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
}

.solar-object-panel__title {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.solar-object-panel__name {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text, #edf4ff);
}

.solar-object-panel__type {
  font-size: 12px;
  color: var(--color-amber, #f4c95d);
}

.solar-object-panel__facts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 0;
}

.solar-object-panel__fact {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--color-line, rgba(80, 120, 180, 0.16));
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}

.solar-object-panel__fact dt {
  color: var(--color-muted, #9ba8c7);
  font-size: 11px;
}

.solar-object-panel__fact dd {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin: 0;
  font-weight: 600;
  font-size: 13px;
}

.fact-value {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.fact-unit {
  flex-shrink: 0;
  color: var(--color-muted, #9ba8c7);
  font-size: 11px;
  font-weight: 400;
  white-space: nowrap;
}

.fact-missing {
  color: var(--color-muted, #9ba8c7);
  font-weight: 400;
}

.solar-object-panel__summary {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--color-muted, #9ba8c7);
}

.solar-object-panel__close {
  align-self: flex-start;
  min-height: 28px;
  padding: 4px 14px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--color-amber, #f4c95d);
  border-color: var(--color-line, rgba(80, 120, 180, 0.25));
  background: rgba(8, 15, 35, 0.5);
  cursor: pointer;
}

.solar-object-panel__close:hover {
  border-color: var(--color-cyan, #42d9ff);
}
</style>
