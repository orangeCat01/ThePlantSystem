<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useUniverseStore } from '@/stores/universe.store';
import { galaxyRepository } from '@/repositories/GalaxyRepository';
import { getApplicationCoordinator } from '@/app/coordinator';

/**
 * 银河系信息面板（Phase 2.18 / 2.19）。
 * - 总览模式（galaxySelectedId === 'galaxy'）：银河基础数据 + 科学信息。
 * - 对象模式（'core' / 'arm-1'..'arm-4'）：当前选择对象详情
 *   （银河中心：黑洞区域/核心说明；旋臂：名称/结构/恒星形成区域说明）+ 聚焦按钮。
 * 数据来源：GalaxyRepository（禁止读取 Three 对象）。
 */
const store = useUniverseStore();
const coordinator = getApplicationCoordinator();
const { galaxySelectedId, galaxyPanelVisible, currentScene } = storeToRefs(store);

/** 当前选择的银河对象（数据层查询）。 */
const selectedObject = computed(() => {
  const id = galaxySelectedId.value;
  if (!id || id === 'galaxy') {
    return undefined;
  }
  return galaxyRepository.getSelectableObjectById(id);
});

/** 银河总览配置。 */
const galaxy = computed(() => {
  if (galaxySelectedId.value === 'galaxy') {
    return galaxyRepository.getById('galaxy');
  }
  return undefined;
});

/** 仅在银河场景且面板可见时展示。 */
const visible = computed(
  () =>
    currentScene.value === 'galaxy' &&
    galaxyPanelVisible.value &&
    (selectedObject.value !== undefined || galaxy.value !== undefined),
);

/** 总览字段格式化。 */
const diameterText = computed(() => {
  const value = galaxy.value?.diameterLightYears;
  if (value === undefined) {
    return '—';
  }
  return value >= 10000 ? `约 ${(value / 10000).toFixed(0)} 万光年` : `${value.toFixed(0)} 光年`;
});

const ageText = computed(() => {
  const value = galaxy.value?.ageYears;
  if (value === undefined) {
    return '—';
  }
  return `约 ${(value / 1e9).toFixed(0)} 亿年`;
});

const structureText = computed(() => {
  const structure = galaxy.value?.structure;
  if (!structure) {
    return '—';
  }
  return `${structure.barred ? '棒旋' : '旋涡'}星系 · ${structure.armCount} 条主要旋臂`;
});

/** 对象类型标签（Phase 2.19）。 */
const objectTypeText = computed(() => {
  switch (selectedObject.value?.type) {
    case 'core':
      return '银河中心 · 超大质量黑洞区域';
    case 'spiral-arm':
      return '旋臂 · 恒星形成区';
    case 'bar':
      return '银河棒';
    default:
      return '银河结构';
  }
});

function onClose(): void {
  coordinator.clearGalaxySelection();
}

function onFocus(): void {
  const id = galaxySelectedId.value;
  if (id && id !== 'galaxy') {
    void coordinator.focusGalaxyObject(id);
  }
}
</script>

<template>
  <section v-if="visible" class="galaxy-panel" data-testid="galaxy-panel">
    <div class="galaxy-panel__header">
      <h3 class="galaxy-panel__title">
        {{ selectedObject?.displayName ?? galaxy?.displayName ?? '银河系' }}
      </h3>
      <button
        class="galaxy-panel__close"
        type="button"
        aria-label="关闭银河信息面板"
        data-testid="galaxy-panel-close"
        @click="onClose"
      >
        ×
      </button>
    </div>

    <!-- 对象模式（Phase 2.19）：核心 / 旋臂详情 -->
    <template v-if="selectedObject">
      <dl class="galaxy-panel__grid">
        <dt>类型</dt>
        <dd>{{ objectTypeText }}</dd>
      </dl>
      <p class="galaxy-panel__desc" data-testid="galaxy-object-desc">
        {{ selectedObject.description }}
      </p>
      <button
        class="galaxy-panel__focus"
        type="button"
        data-testid="galaxy-focus"
        @click="onFocus"
      >
        聚焦{{ selectedObject.displayName }}
      </button>
    </template>

    <!-- 总览模式（Phase 2.18）：银河基础数据 -->
    <template v-else>
      <dl class="galaxy-panel__grid">
        <dt>类型</dt>
        <dd>{{ galaxy?.type ?? '—' }}</dd>
        <dt>直径</dt>
        <dd>{{ diameterText }}</dd>
        <dt>恒星数量</dt>
        <dd>{{ galaxy?.estimatedStarCount ?? '—' }}</dd>
        <dt>年龄</dt>
        <dd>{{ ageText }}</dd>
        <dt>结构</dt>
        <dd>{{ structureText }}</dd>
      </dl>

      <p class="galaxy-panel__desc">{{ galaxy?.description }}</p>
      <p class="galaxy-panel__structure">{{ galaxy?.structure.description }}</p>

      <h4 class="galaxy-panel__section">形成历史</h4>
      <p class="galaxy-panel__text">{{ galaxy?.science.formation }}</p>

      <h4 class="galaxy-panel__section">环境特征</h4>
      <p class="galaxy-panel__text">{{ galaxy?.science.environment }}</p>

      <h4 class="galaxy-panel__section">趣味知识</h4>
      <p class="galaxy-panel__text">{{ galaxy?.science.interestingFacts }}</p>
    </template>
  </section>
</template>

<style scoped>
.galaxy-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(10, 16, 32, 0.85);
  border: 1px solid rgba(160, 200, 255, 0.3);
  color: var(--color-text, #dbe6ff);
}

.galaxy-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.galaxy-panel__title {
  margin: 0;
  font-size: 14px;
  color: var(--color-amber, #ffd28a);
}

.galaxy-panel__close {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(60, 90, 160, 0.4);
  border: 1px solid rgba(120, 160, 255, 0.35);
  color: var(--color-text, #dbe6ff);
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
}

.galaxy-panel__grid {
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 4px 8px;
  margin: 0;
  font-size: 12px;
}

.galaxy-panel__grid dt {
  color: #8fa3c8;
}

.galaxy-panel__grid dd {
  margin: 0;
}

.galaxy-panel__desc,
.galaxy-panel__structure,
.galaxy-panel__text {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--color-muted, #b9c8e6);
}

.galaxy-panel__structure {
  color: var(--color-cyan, #9fc6ff);
}

.galaxy-panel__section {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--color-amber, #ffd28a);
}

.galaxy-panel__focus {
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(60, 90, 160, 0.45);
  border: 1px solid rgba(120, 160, 255, 0.35);
  color: var(--color-text, #dbe6ff);
  cursor: pointer;
  font-size: 13px;
}
</style>
