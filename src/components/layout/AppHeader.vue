<script setup lang="ts">
import { computed } from 'vue';
import { useUniverseStore } from '@/stores/universe.store';

const store = useUniverseStore();
const subtitle = computed(() => (store.currentScene === 'solar' ? '太阳系 MVP 骨架' : '银河系场景骨架'));
</script>

<template>
  <header class="app-header">
    <div>
      <p class="app-header__eyebrow">Galaxy Education Lab</p>
      <h1>银河系科普探索站</h1>
    </div>
    <div class="app-header__status" aria-live="polite">
      <span>{{ subtitle }}</span>
      <strong>{{ store.qualityLevel }}</strong>
    </div>
  </header>
</template>
