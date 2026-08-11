<script setup lang="ts">
import { computed } from 'vue';
import { useUniverseStore } from '@/stores/universe.store';
import { explorationRepository } from '@/repositories/ExplorationRepository';
import { planetRepository } from '@/repositories/PlanetRepository';
import { starRepository } from '@/repositories/StarRepository';
import type { ExplorationTargetType } from '@/types/exploration.types';

/**
 * 探索状态栏（Phase 2.18）。
 *
 * 职责边界：只负责 UI 展示；
 * - 状态来源：useUniverseStore（selectedTargetId / selectedTargetType / starObservationMode）。
 * - 目标详情：ExplorationRepository 解析（禁止直接读 Three.js）。
 * - 距离：恒星 → 光年；行星/卫星 → 距太阳/主星距离（science 数据）。
 */

const store = useUniverseStore();

/** 当前统一目标详情；未选择或未知 ID 时为 undefined。 */
const target = computed(() => {
  const id = store.selectedTargetId;
  if (!id) {
    return undefined;
  }
  return explorationRepository.getById(id);
});

/** 目标类型标签。 */
const typeLabel = computed<string | null>(() => {
  const type: ExplorationTargetType | null = store.selectedTargetType;
  if (!type) {
    return null;
  }
  const labels: Record<ExplorationTargetType, string> = {
    planet: '行星',
    moon: '卫星',
    star: '恒星',
    deepSky: '深空天体',
    spacecraft: '探测器',
  };
  return labels[type];
});

/** 距离展示（恒星 → 光年；行星/卫星 → 距太阳/主星公里数）。 */
const distanceText = computed<string | null>(() => {
  const id = store.selectedTargetId;
  const type = store.selectedTargetType;
  if (!id || !type) {
    return null;
  }
  if (type === 'star') {
    const starConfig = starRepository.getById(id);
    return starConfig ? `${starConfig.distanceLightYears} 光年` : null;
  }
  const config = planetRepository.getById(id);
  if (!config) {
    return null;
  }
  return type === 'moon'
    ? `距主星 ${config.science.distanceFromSunKm.toLocaleString()} km`
    : `距太阳 ${config.science.distanceFromSunKm.toLocaleString()} km`;
});

/** 观察模式标签。 */
const modeLabel = computed(() => {
  const labels: Record<string, string> = {
    SOLAR_SYSTEM: '太阳系',
    STELLAR_VIEW: '恒星观测',
    CONSTELLATION_VIEW: '星座模式',
    FREE_EXPLORATION: '自由探索',
  };
  return labels[store.starObservationMode] ?? store.starObservationMode;
});
</script>

<template>
  <section class="obs-status" aria-label="探索状态">
    <h2>探索状态</h2>
    <dl class="obs-status__facts">
      <div class="obs-status__fact">
        <dt>目标</dt>
        <dd>{{ target?.name ?? '无' }}</dd>
      </div>
      <div class="obs-status__fact">
        <dt>类型</dt>
        <dd>{{ typeLabel ?? '—' }}</dd>
      </div>
      <div class="obs-status__fact">
        <dt>距离</dt>
        <dd>{{ distanceText ?? '—' }}</dd>
      </div>
      <div class="obs-status__fact">
        <dt>模式</dt>
        <dd>{{ modeLabel }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.obs-status {
  border: 1px solid var(--color-line, rgba(255, 255, 255, 0.14));
  border-radius: 12px;
  background: var(--color-panel, rgba(10, 14, 24, 0.72));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(18px);
  padding: 14px 16px;
}

.obs-status h2 {
  margin: 0 0 10px;
  font-size: 15px;
}

.obs-status__facts {
  display: grid;
  gap: 6px;
  margin: 0;
}

.obs-status__fact {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
}

.obs-status__fact dt {
  color: var(--color-muted, rgba(255, 255, 255, 0.55));
}

.obs-status__fact dd {
  margin: 0;
  font-weight: 600;
  text-align: right;
}
</style>
