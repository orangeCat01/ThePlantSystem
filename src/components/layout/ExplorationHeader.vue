<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import SceneSwitch from '@/components/universe/SceneSwitch.vue';
import { useUniverseStore } from '@/stores/universe.store';

/**
 * 顶部探索导航（Phase 2.22 三）。
 *
 * 位置：top:0 / left:0 / right:0，高度 56px，半透明（不遮挡 Canvas 主体）。
 * 结构：左侧品牌（Galaxy Education Lab / 银河系科普探索站）+ 右侧场景切换。
 * 银河模式（八）：整体透明度进一步降低，突出粒子视觉。
 */
const store = useUniverseStore();
const { currentScene } = storeToRefs(store);

const isGalaxy = computed(() => currentScene.value === 'galaxy');
</script>

<template>
  <header class="exploration-header" :class="{ 'exploration-header--galaxy': isGalaxy }">
    <div class="exploration-header__brand">
      <p class="exploration-header__eyebrow">Galaxy Education Lab</p>
      <h1 class="exploration-header__title">银河系科普探索站</h1>
    </div>
    <div class="exploration-header__nav">
      <SceneSwitch />
    </div>
  </header>
</template>

<style scoped>
.exploration-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 130;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 56px;
  padding: 0 20px;
  background: rgba(5, 10, 25, 0.55);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-line, rgba(80, 120, 180, 0.25));
  pointer-events: none;
}

.exploration-header > * {
  pointer-events: auto;
}

.exploration-header__brand {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.exploration-header__eyebrow {
  margin: 0;
  color: var(--color-cyan, #42d9ff);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

.exploration-header__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.2;
  color: var(--color-text, #edf4ff);
  white-space: nowrap;
}

.exploration-header__nav {
  display: flex;
  align-items: center;
}

/* 银河模式：更透明，突出银河粒子。 */
.exploration-header--galaxy {
  background: rgba(4, 7, 14, 0.35);
}

@media (max-width: 720px) {
  .exploration-header__eyebrow {
    display: none;
  }
}
</style>
