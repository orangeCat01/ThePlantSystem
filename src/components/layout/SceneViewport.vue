<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import type { SceneName } from '@/types/common.types';
import { AppLifecycle } from '@/app/AppLifecycle';
import { getApplicationCoordinator } from '@/app/coordinator';
import { useUniverseStore } from '@/stores/universe.store';

const store = useUniverseStore();
const route = useRoute();
const hostElement = ref<HTMLElement | null>(null);
const initialized = ref(false);
// 共享协调器实例：UniverseControlPanel 等组件通过同一实例下发命令。
const coordinator = getApplicationCoordinator();
const lifecycle = new AppLifecycle(coordinator);
let resizeObserver: ResizeObserver | null = null;

const resizeToHost = (): void => {
  const host = hostElement.value;
  if (!host) {
    return;
  }

  coordinator.resize(host.clientWidth, host.clientHeight);
};

/** ESC 取消当前天体选择（Phase 2.13.2；UI 层监听 window，Three.js 层不添加 window 监听）。 */
const handleWindowKeyDown = (event: KeyboardEvent): void => {
  if (event.key !== 'Escape') {
    return;
  }
  void coordinator.clearPlanetSelection();
};

/**
 * WebGL 可用性检测（Phase 2.16 FR-012 基础检测）：
 * 不可用时显示提示而非白屏（不创建渲染器 / Canvas）。
 */
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')),
    );
  } catch {
    return false;
  }
}

const webglUnavailable = ref(false);

onMounted(async () => {
  const host = hostElement.value;
  if (!host || initialized.value) {
    return;
  }

  // WebGL 不可用：直接提示，不初始化（避免白屏 / 渲染器创建异常）。
  if (!isWebGLAvailable()) {
    webglUnavailable.value = true;
    store.setError({
      code: 'WEBGL_UNAVAILABLE',
      message: '当前浏览器不支持WebGL，请更换浏览器',
      recoverable: false,
      source: 'SceneViewport',
    });
    return;
  }

  try {
    // Phase 2.20.1 修复：按当前路由 meta.sceneName 初始化初始场景，
    // 刷新 /universe/galaxy 时直接进入银河系（不依赖子路由 onMounted 时序）。
    const routeScene = route.meta.sceneName as SceneName | undefined;
    await coordinator.initialize(host, routeScene === 'galaxy' ? 'galaxy' : 'solar');
    initialized.value = true;
    lifecycle.register();
    resizeObserver = new ResizeObserver(resizeToHost);
    resizeObserver.observe(host);
    resizeToHost();
    window.addEventListener('keydown', handleWindowKeyDown);
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
  window.removeEventListener('keydown', handleWindowKeyDown);
  resizeObserver?.disconnect();
  resizeObserver = null;
  lifecycle.unregister();
  coordinator.destroy();
});
</script>

<template>
  <section class="scene-viewport" aria-label="三维场景视口">
    <div ref="hostElement" class="scene-viewport__host" />
    <p v-if="webglUnavailable" class="scene-viewport__webgl-error">
      当前浏览器不支持WebGL，请更换浏览器
    </p>
    <slot />
  </section>
</template>

<style scoped>
.scene-viewport__webgl-error {
  margin: 0;
  color: #ff9d8a;
  font-size: 13px;
}
</style>
