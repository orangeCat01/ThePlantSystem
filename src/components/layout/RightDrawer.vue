<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useUniverseStore } from '@/stores/universe.store';

/**
 * 右侧统一抽屉（Phase 2.21）。
 *
 * 布局职责：所有右侧信息/控制收敛为**同一个**抽屉容器
 * （同一个背景 / 同一个边框 / 同一个定位，360px），内部为折叠分组；
 * 禁止多个 absolute 卡片独立漂浮、互相覆盖。
 *
 * - 分组折叠状态：Store.overlayPanels（BaseInfoCard 提供分组头与折叠开关）。
 * - 子卡片透明化：:deep() 移除子组件自带背景/边框/阴影，视觉统一。
 * - 银河模式（八）：透明度进一步降低，突出银河核心与旋臂。
 */
const store = useUniverseStore();
const { currentScene } = storeToRefs(store);

const isGalaxy = computed(() => currentScene.value === 'galaxy');
</script>

<template>
  <aside
    class="right-drawer"
    :class="{ 'right-drawer--galaxy': isGalaxy }"
    aria-label="探索信息抽屉"
  >
    <slot />
  </aside>
</template>

<style scoped>
.right-drawer {
  position: absolute;
  /* Phase 2.22 四：right 20 / top 80（让出 56px 导航），宽度 320px。 */
  top: 80px;
  right: 20px;
  bottom: 56px;
  z-index: 110;
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 320px;
  max-width: calc(100vw - 40px);
  padding: 4px 12px 8px;
  overflow-y: auto;
  overflow-x: hidden;
  border: 1px solid var(--color-line, rgba(80, 120, 180, 0.25));
  border-radius: 12px;
  background: var(--color-panel, rgba(8, 15, 35, 0.75));
  backdrop-filter: blur(14px);
}

/* Phase 2.21 八：银河模式降低 UI 透明度（灰蓝更透，突出核心与旋臂）。 */
.right-drawer--galaxy {
  background: rgba(4, 7, 14, 0.4);
  border-color: rgba(80, 120, 180, 0.12);
}

/* 子组件透明化：抽屉内不再出现「卡片套卡片」，分组由 BaseInfoCard 分隔线区分。 */
.right-drawer :deep(.control-panel),
.right-drawer :deep(.obs-mode),
.right-drawer :deep(.obs-status),
.right-drawer :deep(.astronomy-panel),
.right-drawer :deep(.time-control),
.right-drawer :deep(.planet-panel),
.right-drawer :deep(.star-panel),
.right-drawer :deep(.deep-sky-panel),
.right-drawer :deep(.galaxy-panel) {
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
  backdrop-filter: none;
}

/* 分组标题由 BaseInfoCard 提供，隐藏子组件重复的 h2 标题。 */
.right-drawer :deep(.control-panel h2),
.right-drawer :deep(.obs-mode h2),
.right-drawer :deep(.obs-status h2),
.right-drawer :deep(.astronomy-panel h2),
.right-drawer :deep(.time-control h2),
.right-drawer :deep(.planet-panel__header) {
  display: none;
}

@media (max-width: 900px) {
  .right-drawer {
    width: min(320px, calc(100vw - 28px));
  }
}
</style>
