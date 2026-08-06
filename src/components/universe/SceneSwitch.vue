<script setup lang="ts">
import type { SceneName } from '@/types/common.types';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUniverseStore } from '@/stores/universe.store';

const router = useRouter();
const store = useUniverseStore();

const options: Array<{ sceneName: SceneName; label: string; path: string }> = [
  { sceneName: 'solar', label: '太阳系', path: '/universe/solar' },
  { sceneName: 'galaxy', label: '银河系', path: '/universe/galaxy' },
];

const disabled = computed(() => store.sceneSwitching || store.loading);

const switchScene = async (sceneName: SceneName, path: string): Promise<void> => {
  if (disabled.value || store.currentScene === sceneName) {
    return;
  }

  await router.push(path);
};
</script>

<template>
  <nav class="scene-switch" aria-label="场景切换">
    <button
      v-for="option in options"
      :key="option.sceneName"
      type="button"
      :class="['scene-switch__button', { 'scene-switch__button--active': store.currentScene === option.sceneName }]"
      :disabled="disabled"
      @click="switchScene(option.sceneName, option.path)"
    >
      {{ option.label }}
    </button>
  </nav>
</template>
