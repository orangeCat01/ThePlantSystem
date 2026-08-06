<script setup lang="ts">
import { onMounted } from 'vue';
import { useUniverseStore } from '@/stores/universe.store';

const store = useUniverseStore();

onMounted(() => {
  store.setCurrentScene('galaxy');
});
</script>

<template>
  <section class="scene-caption scene-caption--galaxy" aria-label="银河系页面状态">
    <span>Galaxy Skeleton</span>
    <h2>银河系探索入口</h2>
    <p>当前仅显示少量静态测试点，用于验证场景切换流程，不包含银河旋臂算法。</p>
  </section>
</template>
