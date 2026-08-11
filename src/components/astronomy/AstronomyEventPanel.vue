<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useUniverseStore } from '@/stores/universe.store';
import { getApplicationCoordinator } from '@/app/coordinator';
import { planetRepository } from '@/repositories/PlanetRepository';
import { ASTRONOMY_EVENT_TYPE_LABELS } from '@/astronomy/events/astronomy-event.types';
import type { AstronomyEvent, AstronomyEventsResult } from '@/astronomy/events/astronomy-event.types';

/**
 * 天文事件面板（Phase 2.16）。
 *
 * 职责边界：只负责 UI 展示与事件交互；
 * - 事件数据：ApplicationCoordinator.getAstronomyEvents()（UI 不直接调用计算模块）。
 * - 事件跳转：ApplicationCoordinator.focusAstronomyEvent()（设置日期 + 聚焦 + 高亮 + 面板）。
 * - 开关：ApplicationCoordinator.setAstronomyEventsEnabled()。
 * - 禁止 import three；禁止在组件中写天文计算。
 */

const store = useUniverseStore();
const coordinator = getApplicationCoordinator();

/** 事件查询结果（Coordinator 桥接获取；日期/开关变化时刷新，不每帧轮询）。 */
const eventsResult = ref<AstronomyEventsResult | null>(null);

/** 合并展示列表：当前事件优先，随后未来事件（按日期升序）。 */
const visibleEvents = computed<readonly AstronomyEvent[]>(() => {
  const result = eventsResult.value;
  if (!result) {
    return [];
  }
  return [...result.currentEvents, ...result.upcomingEvents];
});

const refreshEvents = (): void => {
  eventsResult.value = coordinator.getAstronomyEvents();
  // 同步当前展示的事件 ID 到 Store（只保存可序列化 id）。
  if (eventsResult.value) {
    store.setVisibleAstronomyEvents(visibleEvents.value.map((event) => event.id));
  } else {
    store.setVisibleAstronomyEvents([]);
  }
};

watch(
  () => [store.astronomyEventsEnabled],
  refreshEvents,
  { immediate: true },
);

/** 事件类型中文标签（纯数据映射）。 */
const typeLabel = (type: AstronomyEvent['type']): string =>
  ASTRONOMY_EVENT_TYPE_LABELS[type] ?? type;

/** 相关天体中文名（来自数据层；未知 ID 原样显示）。 */
const relatedBodiesText = (event: AstronomyEvent): string => {
  const names = event.relatedBodies.map((id) => planetRepository.getById(id)?.name ?? id);
  return names.join('、');
};

/** 重要程度徽标类名。 */
const importanceClass = (importance: AstronomyEvent['importance']): string =>
  `astronomy-event__badge--${importance}`;

const toggleEventsEnabled = (enabled: boolean): void => {
  coordinator.setAstronomyEventsEnabled(enabled);
};

const handleEventClick = (event: AstronomyEvent): void => {
  void coordinator.focusAstronomyEvent(event);
};
</script>

<template>
  <section class="astronomy-event" aria-label="天文事件面板">
    <div class="astronomy-event__header">
      <h2>近期天文事件</h2>
      <label class="astronomy-event__toggle">
        <input
          type="checkbox"
          :checked="store.astronomyEventsEnabled"
          @change="toggleEventsEnabled(($event.target as HTMLInputElement).checked)"
        />
        <span>启用</span>
      </label>
    </div>

    <div v-if="!store.astronomyEventsEnabled" class="astronomy-event__empty">
      <p>天文事件已停用。</p>
    </div>
    <div v-else-if="visibleEvents.length === 0" class="astronomy-event__empty">
      <p>近期暂无已知天文事件。</p>
    </div>
    <ol v-else class="astronomy-event__list">
      <li
        v-for="event in visibleEvents"
        :key="event.id"
        class="astronomy-event__item"
        :class="`astronomy-event__item--${event.type}`"
      >
        <button type="button" class="astronomy-event__card" @click="handleEventClick(event)">
          <header class="astronomy-event__card-header">
            <span class="astronomy-event__date">{{ event.date }}</span>
            <span class="astronomy-event__badge" :class="importanceClass(event.importance)">
              {{ typeLabel(event.type) }}
            </span>
          </header>
          <strong class="astronomy-event__title">{{ event.title }}</strong>
          <p class="astronomy-event__description">{{ event.description }}</p>
          <footer class="astronomy-event__meta">
            相关天体：{{ relatedBodiesText(event) }}
          </footer>
        </button>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.astronomy-event {
  border: 1px solid var(--color-line, rgba(255, 255, 255, 0.14));
  border-radius: 12px;
  background: var(--color-panel, rgba(10, 14, 24, 0.72));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(18px);
  padding: 14px 16px;
}

.astronomy-event__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.astronomy-event__header h2 {
  margin: 0;
  font-size: 15px;
}

.astronomy-event__toggle {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--color-muted, rgba(255, 255, 255, 0.55));
  cursor: pointer;
}

.astronomy-event__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 40vh;

}

.astronomy-event__card {
  width: 100%;
  border: 1px solid var(--color-line, rgba(255, 255, 255, 0.12));
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  text-align: left;
  padding: 10px 12px;
  cursor: pointer;
}

.astronomy-event__card:hover {
  background: rgba(255, 255, 255, 0.09);
  border-color: rgba(85, 216, 255, 0.4);
}

.astronomy-event__card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.astronomy-event__date {
  font-size: 12px;
  color: var(--color-muted, rgba(255, 255, 255, 0.55));
  font-variant-numeric: tabular-nums;
}

.astronomy-event__badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.astronomy-event__badge--minor {
  color: rgba(255, 255, 255, 0.7);
}

.astronomy-event__badge--normal {
  color: var(--color-cyan, #55d8ff);
  border-color: rgba(85, 216, 255, 0.5);
}

.astronomy-event__badge--major {
  color: #ffb35c;
  border-color: rgba(255, 179, 92, 0.6);
}

.astronomy-event__title {
  display: block;
  font-size: 14px;
  margin-bottom: 4px;
}

.astronomy-event__description {
  margin: 0 0 6px;
  font-size: 12px;
  color: var(--color-muted, rgba(255, 255, 255, 0.7));
}

.astronomy-event__meta {
  font-size: 11px;
  color: var(--color-muted, rgba(255, 255, 255, 0.5));
}

.astronomy-event__empty {
  padding: 10px 0;
}

.astronomy-event__empty p {
  margin: 0;
  font-size: 13px;
  color: var(--color-muted, rgba(255, 255, 255, 0.55));
}
</style>
