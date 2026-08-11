<script setup lang="ts">
import { computed } from 'vue';
import { RouterView } from 'vue-router';
import { storeToRefs } from 'pinia';
import ExplorationHeader from '@/components/layout/ExplorationHeader.vue';
import SceneViewport from '@/components/layout/SceneViewport.vue';
import RightDrawer from '@/components/layout/RightDrawer.vue';
import LoadingScreen from '@/components/layout/LoadingScreen.vue';
import OperationGuide from '@/components/universe/OperationGuide.vue';
import ObservationStatus from '@/components/exploration/ObservationStatus.vue';
import ObservationModeSwitch from '@/components/star/ObservationModeSwitch.vue';
import UniverseControlPanel from '@/components/UniverseControlPanel.vue';
import SolarTimeControl from '@/components/solar/SolarTimeControl.vue';
import PlanetPanel from '@/components/planet/PlanetPanel.vue';
import SolarObjectPanel from '@/components/solar/SolarObjectPanel.vue';
import StarPanel from '@/components/star/StarPanel.vue';
import DeepSkyPanel from '@/components/deepsky/DeepSkyPanel.vue';
import GalaxyPanel from '@/components/galaxy/GalaxyPanel.vue';
import BaseInfoCard from '@/components/overlay/BaseInfoCard.vue';
import { OVERLAY_PANEL_KEYS } from '@/app/OverlayManager';
import { useUniverseStore } from '@/stores/universe.store';

/**
 * 全屏探索界面（Phase 2.22 重构）。
 *
 * 布局：全屏 Canvas 为主体 + 悬浮式探索 UI（全部 overlay，不挤压场景）：
 *   universe-view
 *     └── SceneViewport（全屏 Canvas）
 *         ├── ExplorationHeader   // 顶部导航 56px（品牌 + 场景切换，半透明）
 *         ├── RightDrawer         // 右侧统一抽屉 320px（SceneInfo / SimulationControl / SelectionPanel）
 *         ├── hud-bottom          // 左下角帮助按钮（展开教学面板）
 *         └── OperationGuide      // 教学面板（默认隐藏）
 *
 * 禁止多个 absolute 卡片独立漂浮；右侧所有卡片收敛到同一 Drawer。
 * Phase 2.22：天文时间模块已删除（drawer 由四组收敛为三组）。
 */
const store = useUniverseStore();
const { currentScene, showOperationGuide } = storeToRefs(store);

/** 银河系场景：隐藏太阳系相关分组（场景信息/模拟控制），粒子视觉优先。 */
const isGalaxy = computed(() => currentScene.value === 'galaxy');

/** 是否选中了任何天体（银河臂/恒星/深空/行星/卫星/小天体/银河核心）→ 动态显示「天体信息」分组。 */
const hasSelection = computed(
  () =>
    store.selectedTargetId !== null ||
    store.selectedSolarObjectId !== null ||
    store.galaxySelectedId !== null,
);

/** 太阳系 Drawer 是否有可见分组（场景信息/模拟控制任一未隐藏，或选中天体）。 */
const hasSolarDrawerContent = computed(
  () =>
    !store.hiddenDrawerSections.observation ||
    !store.hiddenDrawerSections.simulation ||
    hasSelection.value,
);

const toggleGuide = (): void => {
  store.setShowOperationGuide(!showOperationGuide.value);
};
</script>

<template>
  <main class="universe-view">
    <!-- 全屏 Canvas 层（视觉主体） -->
    <SceneViewport>
      <!-- 顶部导航（Phase 2.22 三） -->
      <ExplorationHeader />

      <!-- 右侧统一抽屉（320px；全部关闭后整栏隐藏；银河系隐藏太阳系分组） -->
      <RightDrawer v-if="isGalaxy ? hasSelection : hasSolarDrawerContent">
        <BaseInfoCard
          v-if="!isGalaxy && !store.hiddenDrawerSections.observation"
          title="场景信息"
          :panel-key="OVERLAY_PANEL_KEYS.observation"
          closable
          hidden-key="observation"
        >
          <ObservationStatus />
          <ObservationModeSwitch />
        </BaseInfoCard>
        <BaseInfoCard
          v-if="!isGalaxy && !store.hiddenDrawerSections.simulation"
          title="模拟控制"
          :panel-key="OVERLAY_PANEL_KEYS.simulation"
          closable
          hidden-key="simulation"
        >
          <UniverseControlPanel />
          <SolarTimeControl />
        </BaseInfoCard>
        <BaseInfoCard v-if="hasSelection" title="天体信息" :panel-key="OVERLAY_PANEL_KEYS.planetInfo">
          <PlanetPanel />
          <SolarObjectPanel />
          <StarPanel />
          <DeepSkyPanel />
          <GalaxyPanel />
        </BaseInfoCard>
      </RightDrawer>

      <!-- 左下角工具栏（帮助按钮 + 已隐藏分组恢复入口） -->
      <div class="hud-bottom">
        <button
          class="hud-bottom__help"
          type="button"
          data-testid="help-toggle"
          :aria-expanded="showOperationGuide"
          @click="toggleGuide"
        >
          {{ showOperationGuide ? '收起帮助' : '帮助' }}
        </button>
        <template v-if="!isGalaxy && (store.hiddenDrawerSections.observation || store.hiddenDrawerSections.simulation)">
          <span class="hud-bottom__restore-label">已隐藏</span>
          <button
            v-if="store.hiddenDrawerSections.observation"
            class="hud-bottom__restore"
            type="button"
            data-testid="drawer-restore-observation"
            @click="store.setDrawerSectionHidden('observation', false)"
          >
            场景信息
          </button>
          <button
            v-if="store.hiddenDrawerSections.simulation"
            class="hud-bottom__restore"
            type="button"
            data-testid="drawer-restore-simulation"
            @click="store.setDrawerSectionHidden('simulation', false)"
          >
            模拟控制
          </button>
        </template>
      </div>

      <!-- 教学面板（默认隐藏，帮助按钮展开） -->
      <OperationGuide />
    </SceneViewport>

    <LoadingScreen />
    <RouterView />
  </main>
</template>

<style scoped>
.universe-view {
  position: fixed;
  inset: 0;
  overflow: hidden;
}

/* 左下角恢复入口（drawer 外：全部关闭后仍可达）。 */
.hud-bottom__restore-label {
  align-self: center;
  font-size: 12px;
  color: var(--color-muted, #9ba8c7);
  pointer-events: auto;
}

.hud-bottom__restore {
  min-height: 34px;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--color-amber, #f4c95d);
  border-color: var(--color-line, rgba(80, 120, 180, 0.25));
  background: rgba(8, 15, 35, 0.6);
  cursor: pointer;
  backdrop-filter: blur(10px);
}

.hud-bottom__restore:hover {
  border-color: var(--color-cyan, #42d9ff);
}
</style>
