<script setup lang="ts">
import { computed, ref } from 'vue';
import { explorationRepository } from '@/repositories/ExplorationRepository';
import { getApplicationCoordinator } from '@/app/coordinator';
import type { ExplorationTarget, ExplorationTargetType } from '@/types/exploration.types';

/**
 * 宇宙探索搜索（Phase 2.18）。
 *
 * 职责边界：只负责 UI 输入与结果展示；
 * - 数据来源：ExplorationRepository（聚合行星/卫星/恒星，禁止直接读 Three.js）。
 * - 事件出口：ApplicationCoordinator.focusTarget()（定位 + 选择 + 记录）。
 * - 实时搜索（数据量小，无防抖定时器）。
 */

const coordinator = getApplicationCoordinator();

/** 搜索关键字。 */
const keyword = ref('');

/** 搜索结果（空关键字不展示；最多显示 12 条）。 */
const results = computed<readonly ExplorationTarget[]>(() =>
  explorationRepository.search(keyword.value).slice(0, 12),
);

/** 类型标签（中文）。 */
const TYPE_LABELS: Record<ExplorationTargetType, string> = {
  planet: '行星',
  moon: '卫星',
  star: '恒星',
  deepSky: '深空天体',
  spacecraft: '探测器',
};

const focusTarget = (id: string): void => {
  void coordinator.focusTarget(id);
  keyword.value = '';
};
</script>

<template>
  <section class="exploration-search" aria-label="天体搜索">
    <h2>天体搜索</h2>
    <input
      v-model="keyword"
      class="exploration-search__input"
      type="search"
      placeholder="搜索：Earth / 地球 / Sirius / 天狼星…"
      aria-label="搜索天体或恒星"
    />

    <ul v-if="keyword.trim().length > 0" class="exploration-search__results">
      <li v-for="target in results" :key="target.id">
        <button type="button" class="exploration-search__item" @click="focusTarget(target.id)">
          <span class="exploration-search__name">{{ target.name }}</span>
          <span class="exploration-search__type">{{ TYPE_LABELS[target.type] }}</span>
        </button>
      </li>
      <li v-if="results.length === 0" class="exploration-search__empty">
        <p>未找到匹配目标。</p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.exploration-search {
  border: 1px solid var(--color-line, rgba(255, 255, 255, 0.14));
  border-radius: 12px;
  background: var(--color-panel, rgba(10, 14, 24, 0.72));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(18px);
  padding: 14px 16px;
}

.exploration-search h2 {
  margin: 0 0 10px;
  font-size: 15px;
}

.exploration-search__input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--color-line, rgba(255, 255, 255, 0.2));
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  padding: 8px 10px;
  font-size: 13px;
}

.exploration-search__results {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  max-height: 220px;

}

.exploration-search__item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid var(--color-line, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  padding: 6px 10px;
  font-size: 13px;
  cursor: pointer;
}

.exploration-search__item:hover {
  background: rgba(85, 216, 255, 0.12);
  border-color: rgba(85, 216, 255, 0.4);
}

.exploration-search__type {
  font-size: 11px;
  color: var(--color-cyan, #55d8ff);
  border: 1px solid rgba(85, 216, 255, 0.4);
  border-radius: 999px;
  padding: 1px 8px;
}

.exploration-search__empty p {
  margin: 0;
  font-size: 12px;
  color: var(--color-muted, rgba(255, 255, 255, 0.55));
}
</style>
