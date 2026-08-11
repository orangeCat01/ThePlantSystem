<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useUniverseStore } from '@/stores/universe.store';
import { getApplicationCoordinator } from '@/app/coordinator';

/**
 * 加载界面（Phase 2.16 FR-003）。
 * 显示：项目名称 / 加载提示 / 加载进度 / 加载失败提示 / 重新加载入口。
 * 数据流：Store（loading / loadingProgress / loadingMessage / loadingErrors）→ 展示；
 * 「重新加载」→ ApplicationCoordinator.reloadScene()。
 * 不影响 Canvas 生命周期（加载完成 v-if 卸载，不持有 Three 对象）。
 */
const store = useUniverseStore();
const coordinator = getApplicationCoordinator();
const { loading, loadingProgress, loadingMessage, loadingErrors, loadingTotal, loadingLoaded } =
  storeToRefs(store);

/** 是否显示加载界面：加载中 或 尚未完成 100%。 */
const visible = computed(() => loading.value || loadingProgress.value < 100);

/** 进度百分比文本（0-100）。 */
const progressText = computed(() => `${Math.round(loadingProgress.value)}%`);

/** 失败提示（部分资源加载失败；列出失败天体名）。 */
const hasErrors = computed(() => loadingErrors.value.length > 0);

/** 加载详情（已完成/总数）。 */
const countsText = computed(() => `${loadingLoaded.value} / ${loadingTotal.value}`);

function onReload(): void {
  void coordinator.reloadScene();
}
</script>

<template>
  <section v-if="visible" class="loading-screen" data-testid="loading-screen">
    <div class="loading-screen__card">
      <h1 class="loading-screen__title">银河系科普探索站</h1>
      <p class="loading-screen__message">{{ loadingMessage || '加载太阳系资源…' }}</p>

      <div class="loading-screen__bar" role="progressbar" :aria-valuenow="loadingProgress">
        <div class="loading-screen__bar-fill" :style="{ width: progressText }" />
      </div>

      <div class="loading-screen__meta">
        <span class="loading-screen__count">{{ countsText }}</span>
        <span class="loading-screen__percent">{{ progressText }}</span>
      </div>

      <p v-if="hasErrors" class="loading-screen__error" data-testid="loading-errors">
        部分资源加载失败（{{ loadingErrors.length }}）：{{ loadingErrors.join('、') }}
      </p>

      <button
        v-if="hasErrors"
        class="loading-screen__reload"
        type="button"
        data-testid="loading-reload"
        @click="onReload"
      >
        重新加载
      </button>
    </div>
  </section>
</template>

<style scoped>
.loading-screen {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at 50% 40%, rgba(18, 28, 58, 0.96), rgba(4, 8, 20, 0.98));
  color: var(--color-text, #dbe6ff);
}

.loading-screen__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: min(420px, 82%);
  padding: 32px 28px;
  border-radius: 14px;
  background: rgba(12, 20, 42, 0.9);
  border: 1px solid rgba(120, 160, 255, 0.3);
  box-shadow: 0 0 40px rgba(80, 130, 255, 0.15);
}

.loading-screen__title {
  margin: 0;
  font-size: 22px;
  letter-spacing: 2px;
  color: var(--color-amber, #ffd28a);
}

.loading-screen__message {
  margin: 0;
  font-size: 13px;
  color: #9fb4dd;
}

.loading-screen__bar {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: rgba(60, 90, 160, 0.35);
  overflow: hidden;
}

.loading-screen__bar-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, #4a7dff, var(--color-cyan, #7ec8ff));
  transition: width 0.2s linear;
}

.loading-screen__meta {
  display: flex;
  justify-content: space-between;
  width: 100%;
  font-size: 12px;
  color: #8fa3c8;
  font-variant-numeric: tabular-nums;
}

.loading-screen__error {
  margin: 0;
  font-size: 12px;
  color: #ff9d8a;
}

.loading-screen__reload {
  padding: 8px 22px;
  border-radius: 8px;
  background: rgba(230, 140, 60, 0.35);
  border: 1px solid rgba(255, 190, 110, 0.5);
  color: var(--color-amber, #ffd28a);
  cursor: pointer;
  font-size: 13px;
}
</style>
