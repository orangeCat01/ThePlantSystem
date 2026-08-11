<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useUniverseStore } from '@/stores/universe.store';
import { missionRepository } from '@/repositories/MissionRepository';
import { getApplicationCoordinator } from '@/app/coordinator';

/**
 * 航天任务控制面板（Phase 2.22）。
 * 控制：任务选择 / 播放 / 暂停 / 速度（1× 10× 100× 1000×）；显示当前任务时间。
 * 数据流：UI → Coordinator → Store → MissionController（时间由 MissionClock 推进）。
 * 禁止 import 'three'。
 */
const store = useUniverseStore();
const coordinator = getApplicationCoordinator();
const { selectedMissionId, missionPlaying, missionSpeed, missionDate } = storeToRefs(store);

/** 可选任务列表。 */
const missions = missionRepository.getAllMissions();

/** 速度档位。 */
const SPEED_OPTIONS: readonly number[] = [1, 10, 100, 1000];

function onSelect(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  if (value) {
    coordinator.selectMission(value);
  }
}

function onTogglePlay(): void {
  if (missionPlaying.value) {
    coordinator.pauseMission();
  } else {
    coordinator.playMission();
  }
}

function onSpeed(speed: number): void {
  coordinator.setMissionSpeed(speed);
}
</script>

<template>
  <section class="mission-control">
    <h3 class="mission-control__title">🚀 航天任务</h3>

    <select
      class="mission-control__select"
      :value="selectedMissionId ?? ''"
      data-testid="mission-select"
      @change="onSelect"
    >
      <option value="" disabled>选择任务…</option>
      <option v-for="mission in missions" :key="mission.id" :value="mission.id">
        {{ mission.name }}
      </option>
    </select>

    <div class="mission-control__row">
      <span class="mission-control__label">任务时间</span>
      <span class="mission-control__date" data-testid="mission-date">{{ missionDate }}</span>
    </div>

    <div class="mission-control__row">
      <span class="mission-control__label">速度</span>
      <div class="mission-control__speeds" role="group">
        <button
          v-for="speed in SPEED_OPTIONS"
          :key="speed"
          type="button"
          class="mission-control__speed"
          :class="{ 'is-active': missionSpeed === speed }"
          :aria-pressed="missionSpeed === speed"
          @click="onSpeed(speed)"
        >
          {{ speed }}×
        </button>
      </div>
    </div>

    <button
      class="mission-control__toggle"
      type="button"
      :disabled="!selectedMissionId"
      :class="{ 'is-on': missionPlaying }"
      data-testid="mission-play"
      @click="onTogglePlay"
    >
      {{ missionPlaying ? '暂停' : '播放' }}
    </button>
  </section>
</template>

<style scoped>
.mission-control {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(10, 16, 32, 0.85);
  border: 1px solid rgba(255, 200, 120, 0.25);
  color: #dbe6ff;
}

.mission-control__title {
  margin: 0;
  font-size: 14px;
  color: #ffd28a;
}

.mission-control__select {
  padding: 4px 6px;
  border-radius: 6px;
  background: rgba(20, 30, 56, 0.9);
  border: 1px solid rgba(120, 160, 255, 0.3);
  color: #dbe6ff;
  font-size: 12px;
}

.mission-control__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mission-control__label {
  width: 56px;
  font-size: 12px;
  color: #8fa3c8;
}

.mission-control__date {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: #ffd28a;
}

.mission-control__speeds {
  display: flex;
  gap: 4px;
}

.mission-control__speed {
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(60, 90, 160, 0.4);
  border: 1px solid rgba(120, 160, 255, 0.3);
  color: #dbe6ff;
  cursor: pointer;
  font-size: 11px;
}

.mission-control__speed.is-active {
  background: rgba(230, 140, 60, 0.4);
  border-color: rgba(255, 190, 110, 0.5);
  color: #ffd28a;
}

.mission-control__toggle {
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(60, 90, 160, 0.45);
  border: 1px solid rgba(120, 160, 255, 0.35);
  color: #dbe6ff;
  cursor: pointer;
  font-size: 13px;
}

.mission-control__toggle:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.mission-control__toggle.is-on {
  background: rgba(230, 140, 60, 0.4);
  border-color: rgba(255, 190, 110, 0.5);
  color: #ffd28a;
}
</style>
