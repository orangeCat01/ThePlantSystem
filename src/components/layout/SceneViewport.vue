<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ApplicationCoordinator } from '@/app/ApplicationCoordinator';
import { AppLifecycle } from '@/app/AppLifecycle';
import { useUniverseStore } from '@/stores/universe.store';

const store = useUniverseStore();
const hostElement = ref<HTMLElement | null>(null);
const initialized = ref(false);
const coordinator = new ApplicationCoordinator({ initialScene: store.currentScene });
const lifecycle = new AppLifecycle(coordinator);
let resizeObserver: ResizeObserver | null = null;

const statusText = computed(() => {
  if (store.error) {
    return '场景初始化需要处理';
  }

  if (store.animationPaused) {
    return '页面已暂停渲染';
  }

  return store.currentScene === 'solar' ? '太阳系场景骨架已经挂载' : '银河系场景骨架已经挂载';
});

const resizeToHost = (): void => {
  const host = hostElement.value;
  if (!host) {
    return;
  }

  coordinator.resize(host.clientWidth, host.clientHeight);
};

onMounted(async () => {
  const host = hostElement.value;
  if (!host || initialized.value) {
    return;
  }

  try {
    await coordinator.initialize(host);
    initialized.value = true;
    lifecycle.register();
    resizeObserver = new ResizeObserver(resizeToHost);
    resizeObserver.observe(host);
    resizeToHost();
  } catch (error) {
    const message = error instanceof Error ? error.message : '场景初始化失败。';
    store.setError({
      code: 'SCENE_VIEWPORT_INIT_FAILED',
      message,
      recoverable: true,
      source: 'SceneViewport',
    });
  }
});

watch(
  () => store.currentScene,
  async (sceneName) => {
    if (!initialized.value) {
      return;
    }

    await coordinator.switchScene(sceneName);
  },
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  lifecycle.unregister();
  coordinator.destroy();
});
</script>

<template>
  <section class="scene-viewport" aria-label="三维场景视口">
    <div ref="hostElement" class="scene-viewport__host" />
    <div class="scene-viewport__overlay">
      <p>{{ statusText }}</p>
      <span>Canvas Host / Phase 1</span>
    </div>
    <slot />
  </section>
</template>
