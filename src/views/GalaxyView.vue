<script setup lang="ts">
import { onMounted } from 'vue';
import { useUniverseStore } from '@/stores/universe.store';

// 银河系路由页（Phase 2.20.1：不再渲染标题卡，仅负责场景状态同步；
// 全局标题统一由 AppHeader 提供）。
const store = useUniverseStore();

onMounted(() => {
  store.setCurrentScene('galaxy');
});
</script>

<template>
  <!-- 银河系场景挂载点（无内容；Canvas 由 SceneViewport 全屏渲染） -->
</template>
