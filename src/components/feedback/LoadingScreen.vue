<script setup lang="ts">
import { computed } from 'vue';
import { useUniverseStore } from '@/stores/universe.store';

const store = useUniverseStore();
const visible = computed(() => store.loading || store.sceneSwitching);
</script>

<template>
  <div v-if="visible" class="loading-screen" role="status" aria-live="polite">
    <div class="loading-screen__panel">
      <span class="loading-screen__pulse" />
      <p>{{ store.loadingMessage || '正在准备宇宙场景骨架' }}</p>
      <div class="loading-screen__bar" aria-hidden="true">
        <span :style="{ width: `${store.loadingProgress}%` }" />
      </div>
    </div>
  </div>
</template>
