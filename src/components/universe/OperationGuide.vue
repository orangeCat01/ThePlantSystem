<script setup lang="ts">
import { useUniverseStore } from '@/stores/universe.store';

/**
 * 首次操作引导（Phase 2.16 10.2）。
 * 内容：鼠标拖动旋转 / 滚轮缩放 / 点击天体查看详情 / ESC 取消选择。
 * 状态：Pinia 保存 showOperationGuide（禁止 localStorage）。
 */
const store = useUniverseStore();

function onClose(): void {
  store.setShowOperationGuide(false);
}
</script>

<template>
  <aside v-if="store.showOperationGuide" class="operation-guide" aria-label="操作说明">
    <div class="operation-guide__header">
      <h2 class="operation-guide__title">操作引导</h2>
      <button
        class="operation-guide__close"
        type="button"
        aria-label="关闭操作引导"
        data-testid="guide-close"
        @click="onClose"
      >
        ×
      </button>
    </div>
    <ul class="operation-guide__list">
      <li>
        <span class="operation-guide__key">鼠标拖动</span>
        <span>旋转观察太阳系</span>
      </li>
      <li>
        <span class="operation-guide__key">滚轮</span>
        <span>缩放距离</span>
      </li>
      <li>
        <span class="operation-guide__key">点击天体</span>
        <span>查看科普信息</span>
      </li>
      <li>
        <span class="operation-guide__key">ESC</span>
        <span>取消选择</span>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
/* Phase 2.21 五：左侧教学面板（默认隐藏；帮助按钮展开；绝对定位浮动于 Canvas 上方）。 */
.operation-guide {
  position: absolute;
  /* Phase 2.22：左侧教学面板与右侧 Drawer 顶部对齐（让出 56px 导航）。 */
  top: 80px;
  left: 14px;
  z-index: 110;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 260px;
  max-width: calc(100vw - 28px);
  padding: 12px;
  border-radius: 10px;
  background: rgba(10, 16, 32, 0.78);
  border: 1px solid var(--color-line, rgba(158, 176, 204, 0.25));
  color: var(--color-text, #edf4ff);
  backdrop-filter: blur(12px);
}

.operation-guide__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.operation-guide__title {
  margin: 0;
  font-size: 13px;
  color: var(--color-amber, #ffce73);
}

.operation-guide__close {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(60, 90, 160, 0.3);
  border: 1px solid var(--color-line, rgba(158, 176, 204, 0.35));
  color: var(--color-muted, #a7b3c7);
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
}

.operation-guide__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 12px;
}

.operation-guide__list li {
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.operation-guide__key {
  min-width: 64px;
  color: var(--color-cyan, #5ee7df);
  font-weight: 600;
}

.operation-guide__list span:last-child {
  color: var(--color-muted, #a7b3c7);
}
</style>
