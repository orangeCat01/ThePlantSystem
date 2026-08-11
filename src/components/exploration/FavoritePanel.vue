<script setup lang="ts">
import { computed } from 'vue';
import { useUniverseStore } from '@/stores/universe.store';
import { explorationRepository } from '@/repositories/ExplorationRepository';
import { getApplicationCoordinator } from '@/app/coordinator';
import type { ExplorationTarget, ExplorationTargetType } from '@/types/exploration.types';

/**
 * 探索收藏与最近观察面板（Phase 2.18）。
 *
 * 职责边界：只负责 UI 展示与操作；
 * - 数据：来自 Pinia（favoriteTargets / recentTargets，只保存 id）。
 * - 目标详情：ExplorationRepository 解析（禁止直接读 Three.js）。
 * - 点击定位：ApplicationCoordinator.focusTarget()；取消收藏：toggleFavorite()。
 * - 最近观察：最多 20 条，去重置顶，刷新页面不持久化（禁止 localStorage）。
 */

const store = useUniverseStore();
const coordinator = getApplicationCoordinator();

const TYPE_LABELS: Record<ExplorationTargetType, string> = {
  planet: '行星',
  moon: '卫星',
  star: '恒星',
  deepSky: '深空天体',
  spacecraft: '探测器',
};

/** 收藏目标详情列表（未知 id 安全过滤）。 */
const favoriteTargets = computed<readonly ExplorationTarget[]>(() =>
  store.favoriteTargets
    .map((id) => explorationRepository.getById(id))
    .filter((target): target is ExplorationTarget => target !== undefined),
);

/** 最近观察目标详情列表（未知 id 安全过滤）。 */
const recentTargets = computed<readonly ExplorationTarget[]>(() =>
  store.recentTargets
    .map((id) => explorationRepository.getById(id))
    .filter((target): target is ExplorationTarget => target !== undefined),
);

const focusTarget = (id: string): void => {
  void coordinator.focusTarget(id);
};

const toggleFavorite = (id: string): void => {
  coordinator.toggleFavorite(id);
};
</script>

<template>
  <section class="favorite-panel" aria-label="探索收藏与最近观察">
    <h2>收藏</h2>
    <ul v-if="favoriteTargets.length > 0" class="favorite-panel__list">
      <li v-for="target in favoriteTargets" :key="target.id">
        <button type="button" class="favorite-panel__item" @click="focusTarget(target.id)">
          <span class="favorite-panel__name">{{ target.name }}</span>
          <span class="favorite-panel__type">{{ TYPE_LABELS[target.type] }}</span>
        </button>
        <button
          type="button"
          class="favorite-panel__remove"
          :aria-label="`取消收藏 ${target.name}`"
          @click="toggleFavorite(target.id)"
        >
          ✕
        </button>
      </li>
    </ul>
    <p v-else class="favorite-panel__empty">暂无收藏。点击搜索结果或天体后可通过面板收藏。</p>

    <h2 class="favorite-panel__section-title">最近观察</h2>
    <ul v-if="recentTargets.length > 0" class="favorite-panel__list">
      <li v-for="target in recentTargets" :key="target.id">
        <button type="button" class="favorite-panel__item" @click="focusTarget(target.id)">
          <span class="favorite-panel__name">{{ target.name }}</span>
          <span class="favorite-panel__type">{{ TYPE_LABELS[target.type] }}</span>
        </button>
      </li>
    </ul>
    <p v-else class="favorite-panel__empty">暂无观察记录。</p>
  </section>
</template>

<style scoped>
.favorite-panel {
  border: 1px solid var(--color-line, rgba(255, 255, 255, 0.14));
  border-radius: 12px;
  background: var(--color-panel, rgba(10, 14, 24, 0.72));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(18px);
  padding: 14px 16px;
}

.favorite-panel h2 {
  margin: 0 0 10px;
  font-size: 15px;
}

.favorite-panel__section-title {
  margin-top: 14px !important;
}

.favorite-panel__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 180px;

}

.favorite-panel__list li {
  display: flex;
  align-items: center;
  gap: 6px;
}

.favorite-panel__item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid var(--color-line, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  padding: 5px 10px;
  font-size: 13px;
  cursor: pointer;
}

.favorite-panel__item:hover {
  background: rgba(85, 216, 255, 0.12);
}

.favorite-panel__type {
  font-size: 11px;
  color: var(--color-muted, rgba(255, 255, 255, 0.6));
}

.favorite-panel__remove {
  border: 1px solid var(--color-line, rgba(255, 255, 255, 0.14));
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--color-muted, rgba(255, 255, 255, 0.6));
  width: 26px;
  height: 26px;
  font-size: 12px;
  cursor: pointer;
}

.favorite-panel__remove:hover {
  color: #ff6b6b;
  border-color: rgba(255, 107, 107, 0.5);
}

.favorite-panel__empty {
  margin: 0;
  font-size: 12px;
  color: var(--color-muted, rgba(255, 255, 255, 0.55));
}
</style>
