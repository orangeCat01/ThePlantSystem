<script setup lang="ts">
import { useUniverseStore } from '@/stores/universe.store';

/**
 * 全屏 UI 基础信息卡（Phase 2.20）。
 *
 * 作为所有 Overlay 卡片的基础容器：
 * - title：卡片标题（标题栏显示）。
 * - panelKey：折叠状态键（Store.overlayPanels[panelKey]）。
 * - position：预留布局位置标记（top / left / right / bottom；本阶段不参与样式计算）。
 * - slot：卡片内容（内部组件的自身显隐逻辑不受影响）。
 *
 * 折叠：标题栏按钮切换 Store 状态（不引入本地状态，刷新保持布局一致）。
 */
const props = defineProps<{
  title: string;
  panelKey: string;
  position?: 'top' | 'left' | 'right' | 'bottom';
  /** Phase 2.22：是否可完全关闭（显示 × 按钮，点击后分组从 Drawer 移除）。 */
  closable?: boolean;
  /** 关闭状态键（Store.hiddenDrawerSections[key]）。 */
  hiddenKey?: string;
}>();

const store = useUniverseStore();

const isCollapsed = (key: string): boolean => store.overlayPanels[key] === false;

function onToggle(key: string): void {
  store.toggleOverlayPanel(key);
}

function onClose(): void {
  if (props.hiddenKey !== undefined) {
    store.setDrawerSectionHidden(props.hiddenKey, true);
  }
}
</script>

<template>
  <section
    class="base-info-card"
    :class="{ 'base-info-card--collapsed': isCollapsed(panelKey) }"
    :data-panel-key="panelKey"
  >
    <header class="base-info-card__header">
      <h3 class="base-info-card__title">{{ title }}</h3>
      <button
        class="base-info-card__toggle"
        type="button"
        :aria-label="isCollapsed(panelKey) ? `展开${title}` : `收起${title}`"
        :data-testid="`overlay-toggle-${panelKey}`"
        @click="onToggle(panelKey)"
      >
        {{ isCollapsed(panelKey) ? '▸' : '▾' }}
      </button>
      <button
        v-if="closable"
        class="base-info-card__close"
        type="button"
        aria-label="隐藏面板"
        :data-testid="`drawer-close-${panelKey}`"
        @click="onClose"
      >
        ×
      </button>
    </header>
    <div v-show="!isCollapsed(panelKey)" class="base-info-card__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
/* Phase 2.21：BaseInfoCard 作为右侧抽屉内的折叠分组（统一由 RightDrawer 提供背景/边框）。 */
.base-info-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 2px;
  border-bottom: 1px solid var(--color-line, rgba(158, 176, 204, 0.16));
  color: var(--color-text, #edf4ff);
}

.base-info-card:last-child {
  border-bottom: none;
}

.base-info-card--collapsed {
  padding-bottom: 8px;
}

.base-info-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.base-info-card__title {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--color-amber, #ffce73);
}

.base-info-card__toggle {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: rgba(60, 90, 160, 0.25);
  border: 1px solid var(--color-line, rgba(158, 176, 204, 0.3));
  color: var(--color-muted, #a7b3c7);
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
}

.base-info-card__toggle:hover {
  border-color: var(--color-cyan, #42d9ff);
  color: var(--color-cyan, #42d9ff);
}

.base-info-card__close {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: rgba(60, 90, 160, 0.25);
  border: 1px solid var(--color-line, rgba(80, 120, 180, 0.3));
  color: var(--color-muted, #9ba8c7);
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
}

.base-info-card__close:hover {
  border-color: var(--color-amber, #f4c95d);
  color: var(--color-amber, #f4c95d);
}

/* Phase 2.22 七：分组内容禁止内部滚动（自然高度；仅 PlanetPanel 允许滚动）。 */
.base-info-card__body {
  overflow: hidden;
}
</style>
