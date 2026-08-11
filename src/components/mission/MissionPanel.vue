<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useUniverseStore } from '@/stores/universe.store';
import { missionRepository } from '@/repositories/MissionRepository';
import { planetRepository } from '@/repositories/PlanetRepository';
import { getApplicationCoordinator } from '@/app/coordinator';

/**
 * 航天任务信息面板（Phase 2.22）。
 * 显示：任务名称 / 机构 / 发射时间 / 目标 / 状态 / 描述 + 时间线（Launch → Encounter → Arrival）。
 * 数据流：Store.selectedMissionId → MissionRepository → 展示。
 * 禁止 import 'three'。
 */
const store = useUniverseStore();
const coordinator = getApplicationCoordinator();
const { selectedMissionId } = storeToRefs(store);

/** 当前选中的航天任务。 */
const mission = computed(() => {
  if (!selectedMissionId.value) {
    return undefined;
  }
  return missionRepository.getMissionById(selectedMissionId.value);
});

/** 目标天体中文名（未知目标显示占位）。 */
const targetName = computed(() => {
  const targetId = mission.value?.targetId;
  if (!targetId) {
    return '—';
  }
  return planetRepository.getById(targetId)?.name ?? targetId;
});

/** 状态中文标签。 */
const statusLabel = computed(() => {
  switch (mission.value?.status) {
    case 'active':
      return '运行中';
    case 'completed':
      return '已完成';
    default:
      return mission.value?.status ?? '—';
  }
});

/** 探测器类型标签。 */
const spacecraftLabel = computed(() => {
  const spacecraft = mission.value?.spacecraft[0];
  if (!spacecraft) {
    return '—';
  }
  switch (spacecraft.type) {
    case 'orbiter':
      return '轨道器';
    case 'lander':
      return '着陆器';
    case 'rover':
      return '巡视器';
    case 'flyby':
      return '飞掠器';
    default:
      return spacecraft.type;
  }
});

function onFollow(): void {
  coordinator.followMission();
}

function onFocus(): void {
  coordinator.focusMission();
}
</script>

<template>
  <section v-if="mission" class="mission-panel">
    <h3 class="mission-panel__title">{{ mission.name }}</h3>

    <dl class="mission-panel__grid">
      <dt>机构</dt>
      <dd>{{ mission.agency }}</dd>
      <dt>发射</dt>
      <dd>{{ mission.launchDate }}</dd>
      <dt>目标</dt>
      <dd>{{ targetName }}</dd>
      <dt>状态</dt>
      <dd>{{ statusLabel }}</dd>
      <dt>探测器</dt>
      <dd>{{ mission.spacecraft[0]?.name ?? '—' }}（{{ spacecraftLabel }}）</dd>
    </dl>

    <p class="mission-panel__desc">{{ mission.description }}</p>

    <ol class="mission-panel__timeline">
      <li
        v-for="entry in mission.timeline"
        :key="entry.date"
        class="mission-panel__timeline-item"
      >
        <span class="mission-panel__timeline-date">{{ entry.date }}</span>
        <span class="mission-panel__timeline-label">{{ entry.label }}</span>
      </li>
    </ol>

    <div class="mission-panel__actions">
      <button class="mission-panel__btn" type="button" data-testid="mission-follow" @click="onFollow">
        跟随探测器
      </button>
      <button class="mission-panel__btn" type="button" data-testid="mission-focus" @click="onFocus">
        聚焦探测器
      </button>
    </div>
  </section>
</template>

<style scoped>
.mission-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(10, 16, 32, 0.85);
  border: 1px solid rgba(255, 200, 120, 0.3);
  color: #dbe6ff;
}

.mission-panel__title {
  margin: 0;
  font-size: 14px;
  color: #ffd28a;
}

.mission-panel__grid {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 4px 8px;
  margin: 0;
  font-size: 12px;
}

.mission-panel__grid dt {
  color: #8fa3c8;
}

.mission-panel__grid dd {
  margin: 0;
}

.mission-panel__desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: #b9c8e6;
}

.mission-panel__timeline {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.mission-panel__timeline-item {
  display: flex;
  gap: 8px;
  font-size: 12px;
}

.mission-panel__timeline-date {
  color: #8fa3c8;
  font-variant-numeric: tabular-nums;
  min-width: 88px;
}

.mission-panel__actions {
  display: flex;
  gap: 8px;
}

.mission-panel__btn {
  flex: 1;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(60, 90, 160, 0.45);
  border: 1px solid rgba(120, 160, 255, 0.35);
  color: #dbe6ff;
  cursor: pointer;
  font-size: 13px;
}
</style>
