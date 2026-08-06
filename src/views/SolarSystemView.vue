<script setup lang="ts">
import { onMounted } from 'vue';
import { useUniverseStore } from '@/stores/universe.store';

const store = useUniverseStore();

onMounted(() => {
  store.setCurrentScene('solar');
});
</script>

<template>
  <section class="scene-caption scene-caption--solar" aria-label="太阳系页面状态">
    <span>Solar Skeleton</span>
    <h2>太阳系探索入口</h2>
    <p>基础场景、Canvas 宿主和生命周期已经就绪；真实行星将在后续阶段接入。</p>
  </section>
</template>
