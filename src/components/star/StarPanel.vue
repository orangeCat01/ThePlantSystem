<script setup lang="ts">
import { computed } from 'vue';
import { useUniverseStore } from '@/stores/universe.store';
import { starRepository } from '@/repositories/StarRepository';
import { getApplicationCoordinator } from '@/app/coordinator';

/**
 * 恒星信息面板（Phase 2.17）。
 *
 * 职责边界：只负责 UI 展示；
 * - 数据来源：StarRepository（配置驱动；禁止直接读取 Three.js 对象）。
 * - 选择状态：useUniverseStore.selectedStarId。
 * - 关闭：ApplicationCoordinator.clearStarSelection()。
 */

const store = useUniverseStore();
const coordinator = getApplicationCoordinator();

/** 当前选中的恒星配置；未选择或未知 ID 时为 undefined。 */
const star = computed(() => {
  const id = store.selectedStarId;
  if (!id) {
    return undefined;
  }
  return starRepository.getById(id);
});

/** 所属星座名称（来自数据层；未知星座显示 ID）。 */
const constellationName = computed(() => {
  const constellationId = star.value?.constellation;
  if (!constellationId) {
    return null;
  }
  return starRepository.getConstellationById(constellationId)?.name ?? constellationId;
});

/** 物理参数展示值（Phase 2.19；缺失字段为 null，UI 显示「暂无数据」）。 */
const physical = computed(() => {
  const data = star.value?.physical;
  return {
    massDisplay: data?.massSolar !== undefined ? `${data.massSolar} 太阳质量` : null,
    radiusDisplay: data?.radiusSolar !== undefined ? `${data.radiusSolar} 太阳半径` : null,
    temperatureDisplay: data?.temperatureK !== undefined ? `${data.temperatureK} K` : null,
    luminosityDisplay:
      data?.luminositySolar !== undefined ? `${data.luminositySolar} 太阳光度` : null,
  };
});

const closePanel = (): void => {
  coordinator.clearStarSelection();
};
</script>

<template>
  <aside v-if="star" class="star-panel" aria-label="恒星信息面板">
    <div class="star-panel__header">
      <h2>恒星信息</h2>
      <button type="button" class="star-panel__close" @click="closePanel">关闭</button>
    </div>

    <div class="star-panel__content">
      <header class="star-panel__title">
        <span class="star-panel__name">{{ star.name }}</span>
        <span class="star-panel__english">{{ star.englishName }}</span>
      </header>

      <dl class="star-panel__facts">
        <div class="star-panel__fact">
          <dt>距离</dt>
          <dd>{{ star.distanceLightYears }} 光年</dd>
        </div>
        <div class="star-panel__fact">
          <dt>光谱类型</dt>
          <dd>{{ star.spectralType }}</dd>
        </div>
        <div class="star-panel__fact">
          <dt>星座</dt>
          <dd>{{ constellationName }}</dd>
        </div>
        <div class="star-panel__fact">
          <dt>视星等</dt>
          <dd>{{ star.magnitude }}</dd>
        </div>
        <div class="star-panel__fact">
          <dt>赤经</dt>
          <dd>{{ star.position.rightAscension.toFixed(2) }}°</dd>
        </div>
        <div class="star-panel__fact">
          <dt>赤纬</dt>
          <dd>{{ star.position.declination.toFixed(2) }}°</dd>
        </div>
      </dl>

      <section class="star-panel__section" aria-label="物理参数">
        <h3>物理参数</h3>
        <dl class="star-panel__facts">
          <div class="star-panel__fact">
            <dt>质量</dt>
            <dd>{{ physical.massDisplay ?? '暂无数据' }}</dd>
          </div>
          <div class="star-panel__fact">
            <dt>半径</dt>
            <dd>{{ physical.radiusDisplay ?? '暂无数据' }}</dd>
          </div>
          <div class="star-panel__fact">
            <dt>表面温度</dt>
            <dd>{{ physical.temperatureDisplay ?? '暂无数据' }}</dd>
          </div>
          <div class="star-panel__fact">
            <dt>光度</dt>
            <dd>{{ physical.luminosityDisplay ?? '暂无数据' }}</dd>
          </div>
        </dl>
      </section>

      <p class="star-panel__description">{{ star.description }}</p>
    </div>
  </aside>
</template>

<style scoped>
.star-panel {
  border: 1px solid rgba(85, 216, 255, 0.35);
  border-radius: 12px;
  background: var(--color-panel, rgba(10, 14, 24, 0.82));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(18px);
  padding: 14px 16px;
}

.star-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.star-panel__header h2 {
  margin: 0;
  font-size: 15px;
}

.star-panel__close {
  border: 1px solid var(--color-line, rgba(255, 255, 255, 0.2));
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  padding: 4px 10px;
  cursor: pointer;
}

.star-panel__title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  border-bottom: 1px solid var(--color-line, rgba(255, 255, 255, 0.12));
  padding-bottom: 10px;
  margin-bottom: 10px;
}

.star-panel__name {
  font-size: 20px;
  font-weight: 700;
}

.star-panel__english {
  color: var(--color-muted, rgba(255, 255, 255, 0.55));
  font-size: 13px;
}

.star-panel__facts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 14px;
  margin: 0 0 10px;
}

.star-panel__fact {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.star-panel__fact dt {
  color: var(--color-muted, rgba(255, 255, 255, 0.55));
}

.star-panel__fact dd {
  margin: 0;
  font-weight: 600;
  text-align: right;
}

.star-panel__description {
  margin: 0;
  font-size: 13px;
}

.star-panel__section h3 {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--color-muted, rgba(255, 255, 255, 0.75));
}

.star-panel__section {
  border-top: 1px solid var(--color-line, rgba(255, 255, 255, 0.12));
  padding-top: 10px;
  margin-bottom: 10px;
}
</style>
