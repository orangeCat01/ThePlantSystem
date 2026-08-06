<script setup lang="ts">
import { computed } from 'vue';
import { useUniverseStore } from '@/stores/universe.store';

const store = useUniverseStore();
const panelTitle = computed(() => (store.selectedPlanetId ? '天体信息' : '信息面板占位'));
</script>

<template>
  <aside class="planet-panel" aria-label="天体信息面板">
    <div class="planet-panel__header">
      <h2>{{ panelTitle }}</h2>
      <button type="button" :disabled="!store.panelVisible" @click="store.closePlanetPanel()">关闭</button>
    </div>
    <p v-if="store.selectedPlanetId">当前选中：{{ store.selectedPlanetId }}</p>
    <p v-else>当前没有选中天体。Phase 1 不包含天体拾取和科普数据。</p>
  </aside>
</template>
