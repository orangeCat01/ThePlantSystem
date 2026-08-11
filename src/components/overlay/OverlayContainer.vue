<script setup lang="ts">
/**
 * 全屏探索界面悬浮层容器（Phase 2.20）。
 *
 * 布局分区：
 * - top：顶部条（标题 / 场景切换 / 观测状态）。
 * - left：左侧辅助（操作引导 / 搜索 / 观察模式）。
 * - right：右侧信息与控制卡（主内容区，可滚动）。
 * - bottom：底部卡（任务详情等）。
 *
 * 交互层级：容器 pointer-events: none（不拦截 Canvas 的 Three 交互），
 * 卡片区 pointer-events: auto（UI 点击不穿透 Canvas）。
 * 样式由全局 exploration-overlay 系列类提供（见 styles/global.scss）。
 */
</script>

<template>
  <div class="exploration-overlay">
    <div class="exploration-overlay__top">
      <slot name="top" />
    </div>
    <div class="exploration-overlay__left">
      <slot name="left" />
    </div>
    <div class="exploration-overlay__right">
      <slot name="right" />
    </div>
    <div class="exploration-overlay__bottom">
      <slot name="bottom" />
    </div>
  </div>
</template>

<style scoped>
.exploration-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  pointer-events: none;
}

.exploration-overlay__top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px 0;
  pointer-events: none;
}

.exploration-overlay__top > * {
  pointer-events: auto;
}

.exploration-overlay__left {
  position: absolute;
  top: 96px;
  left: 16px;
  bottom: 56px;
  width: min(300px, 26vw);
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: visible;
  pointer-events: auto;
  scrollbar-width: thin;
}

.exploration-overlay__right {
  position: absolute;
  top: 96px;
  right: 16px;
  bottom: 56px;
  /* Phase 2.20.2：右栏收窄（280~340px），避免大面积遮挡 Canvas。 */
  width: min(320px, 28vw);
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: visible;
  pointer-events: auto;
  scrollbar-width: thin;
}

.exploration-overlay__bottom {
  position: absolute;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  width: min(560px, calc(100vw - 32px));
  max-height: 34vh;
  overflow: visible;
  pointer-events: auto;
  scrollbar-width: thin;
}

/* Tablet 窄屏：侧栏收窄、覆盖宽度自适应。 */
@media (max-width: 900px) {
  .exploration-overlay__left {
    width: min(260px, 34vw);
  }

  .exploration-overlay__right {
    width: min(300px, 38vw);
  }
}
</style>
