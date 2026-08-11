<script setup lang="ts">
import { computed } from 'vue';
import { useUniverseStore } from '@/stores/universe.store';
import { planetRepository } from '@/repositories/PlanetRepository';
import { missionRepository } from '@/repositories/MissionRepository';

const store = useUniverseStore();

/** 当前选中的天体配置；未选择或未知 ID 时为 undefined。 */
const planet = computed(() => {
  const id = store.selectedPlanetId;
  if (!id) {
    return undefined;
  }
  return planetRepository.getById(id);
});

/** 当前选中天体的探测任务（Repository → 组件；Store 不保存任务）。 */
const missions = computed(() => {
  const id = store.selectedPlanetId;
  if (!id) {
    return [];
  }
  return missionRepository.getByPlanetId(id);
});

/** 面板是否展示详情（已选择且能找到配置）。 */
const hasPlanet = computed(() => store.panelVisible && planet.value !== undefined);

/** 固定小数位展示（如 6371），缺失返回 null。 */
const toFixed = (value: number | undefined, digits = 0): string | null =>
  value === undefined || !Number.isFinite(value) ? null : value.toFixed(digits);

/** 文本展示（缺失返回 null）。 */
const textOrNull = (value: string | undefined): string | null => (value ? value : null);

/** 质量科学计数法展示（如 5.972e+24 kg）。 */
const massDisplay = computed(() => {
  const massKg = planet.value?.science.massKg;
  return massKg === undefined ? null : `${massKg.toExponential(3)} kg`;
});

/** 物理参数事实行（Phase 2.21 三：标签/数值/单位 三元组，单位独立 span 避免换行）。 */
interface PhysicalRow {
  readonly label: string;
  readonly value: string | null;
  readonly unit: string;
}

/** 物理参数展示行（Phase 2.14.1；缺失字段 value 为 null，UI 显示「暂无数据」）。 */
const physicalRows = computed<readonly PhysicalRow[]>(() => {
  const data = planet.value?.sciencePhysical;
  const temperature = data?.temperatureRange;
  return [
    {
      label: '质量',
      value: data?.massKg !== undefined ? data.massKg.toExponential(3) : null,
      unit: 'kg',
    },
    {
      label: '半径',
      value: data?.radiusKm !== undefined ? toFixed(data.radiusKm) : null,
      unit: 'km',
    },
    {
      label: '重力',
      value: data?.gravity !== undefined ? toFixed(data.gravity, 2) : null,
      unit: 'm/s²',
    },
    {
      label: '密度',
      value: data?.density !== undefined ? toFixed(data.density, 3) : null,
      unit: 'g/cm³',
    },
    {
      label: '逃逸速度',
      value: data?.escapeVelocity !== undefined ? toFixed(data.escapeVelocity, 2) : null,
      unit: 'km/s',
    },
    {
      label: '温度',
      value: temperature !== undefined ? `${temperature.min} ~ ${temperature.max}` : null,
      unit: '℃',
    },
    { label: '大气', value: textOrNull(data?.atmosphere), unit: '' },
    { label: '年龄', value: textOrNull(data?.age), unit: '' },
  ];
});

/**
 * 质量对比条数（log10 缩放，0~1）。
 * 以 log10(质量) 在 22~27 区间做演示性映射：
 * 月球（约 7.35e22）约 2 格、地球（约 5.97e24）约 6 格、木星（约 1.90e27）满格。
 * 禁止直接按线性长度展示巨大数字。
 */
function calculateMassRatio(massKg: number): number {
  const logMass = Math.log10(massKg);
  return Math.min(Math.max((logMass - 22) / 5, 0), 1);
}

const massRatio = computed(() => {
  const massKg = planet.value?.science.massKg;
  return massKg === undefined ? 0 : calculateMassRatio(massKg);
});

const massBarCount = computed(() => Math.round(massRatio.value * 10));

const MASS_BAR_TOTAL = 10;
</script>

<template>
  <Transition name="planet-panel">
  <aside
    v-if="hasPlanet && planet"
    class="planet-panel"
    aria-label="天体信息面板"
  >
    <div class="planet-panel__header">
      <h2>天体信息</h2>
      <button type="button" :disabled="!store.panelVisible" @click="store.closePlanetPanel()">
        关闭
      </button>
    </div>

    <div v-if="hasPlanet && planet" class="planet-panel__content">
      <header class="planet-panel__title">
        <span class="planet-panel__name">{{ planet.name }}</span>
        <span class="planet-panel__english">{{ planet.englishName }}</span>
      </header>

      <section class="planet-panel__section" aria-label="基础数据">
        <h3>基础数据</h3>
        <dl class="planet-panel__facts">
          <div class="planet-panel__fact">
            <dt>直径</dt>
            <dd>
              <span class="fact-value">{{ planet.science.diameterKm }}</span>
              <span class="fact-unit">km</span>
            </dd>
          </div>
          <div class="planet-panel__fact">
            <dt>距离太阳</dt>
            <dd>
              <span class="fact-value">{{ planet.science.distanceFromSunKm }}</span>
              <span class="fact-unit">km</span>
            </dd>
          </div>
          <div class="planet-panel__fact">
            <dt>公转周期</dt>
            <dd>
              <span class="fact-value">{{ planet.science.revolutionPeriodDays }}</span>
              <span class="fact-unit">天</span>
            </dd>
          </div>
          <div class="planet-panel__fact">
            <dt>自转周期</dt>
            <dd>
              <span class="fact-value">{{ planet.science.rotationPeriodHours }}</span>
              <span class="fact-unit">小时</span>
            </dd>
          </div>
          <div class="planet-panel__fact">
            <dt>卫星数量</dt>
            <dd>
              <span class="fact-value">{{ planet.science.satelliteCount }}</span>
              <span class="fact-unit">颗</span>
            </dd>
          </div>
        </dl>
      </section>

      <section class="planet-panel__section" aria-label="温度范围">
        <h3>温度</h3>
        <div class="temperature-bar">
          <span class="temperature-bar__label">{{ planet.science.temperatureMinCelsius }}℃</span>
          <div class="temperature-bar__track" aria-hidden="true" />
          <span class="temperature-bar__label">{{ planet.science.temperatureMaxCelsius }}℃</span>
        </div>
      </section>

      <section class="planet-panel__section" aria-label="质量对比">
        <h3>质量（对数尺度）</h3>
        <div v-if="massDisplay" class="mass-compare">
          <div class="mass-compare__bars" aria-hidden="true">
            <span
              v-for="index in MASS_BAR_TOTAL"
              :key="index"
              class="mass-compare__bar"
              :class="{ 'mass-compare__bar--active': index <= massBarCount }"
            />
          </div>
          <p class="mass-compare__value">{{ massDisplay }}</p>
        </div>
        <p v-else class="planet-panel__missing">暂无质量数据。</p>
      </section>

      <section class="planet-panel__section" aria-label="物理参数">
        <h3>物理参数</h3>
        <dl class="planet-panel__facts">
          <div v-for="row in physicalRows" :key="row.label" class="planet-panel__fact">
            <dt>{{ row.label }}</dt>
            <dd v-if="row.value">
              <span class="fact-value">{{ row.value }}</span>
              <span v-if="row.unit" class="fact-unit">{{ row.unit }}</span>
            </dd>
            <dd v-else class="fact-missing">暂无数据</dd>
          </div>
        </dl>
      </section>

      <section class="planet-panel__section" aria-label="形成与环境">
        <h3>形成历史</h3>
        <p>{{ planet.education.formation }}</p>
        <h3>环境</h3>
        <p>{{ planet.education.environment }}</p>
        <h3>科学意义</h3>
        <p>{{ planet.education.scientificMeaning }}</p>
      </section>

      <section v-if="planet.education.explorationTimeline.length > 0" class="planet-panel__section" aria-label="探索历史">
        <h3>探索历史</h3>
        <ol class="timeline">
          <li v-for="(entry, index) in planet.education.explorationTimeline" :key="index" class="timeline__item">
            <strong class="timeline__year">{{ entry.year }}</strong>
            <span class="timeline__title">{{ entry.title }}</span>
            <p class="timeline__description">{{ entry.description }}</p>
          </li>
        </ol>
      </section>

      <section v-if="planet.education.funFacts.length > 0" class="planet-panel__section" aria-label="趣味知识">
        <h3>趣味知识</h3>
        <ul class="fun-facts">
          <li v-for="(fact, index) in planet.education.funFacts" :key="index">{{ fact }}</li>
        </ul>
      </section>

      <section v-if="missions.length > 0" class="planet-panel__section" aria-label="探测任务">
        <h3>探测任务</h3>
        <ol class="timeline">
          <li v-for="mission in missions" :key="mission.id" class="timeline__item">
            <strong class="timeline__year">{{ mission.year }}</strong>
            <span class="timeline__title">{{ mission.name }}</span>
            <p class="timeline__description">{{ mission.agency }}</p>
            <p class="timeline__description">{{ mission.description }}</p>
          </li>
        </ol>
      </section>

      <p class="planet-panel__description">{{ planet.description }}</p>
    </div>
  </aside>
  </Transition>
</template>

<style scoped>
.planet-panel__content {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-height: 56vh;
  padding-top: 12px;
  /* Phase 2.22 七：仅 PlanetPanel 允许内部滚动；其余卡片 overflow:hidden。 */
  overflow-y: auto;
  overflow-x: hidden;
}

/* Phase 2.22 五：进入动画（淡入 + 右滑 20px → 0），退出淡出。 */
.planet-panel-enter-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.planet-panel-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.planet-panel-leave-active {
  transition: opacity 0.2s ease;
}

.planet-panel-leave-to {
  opacity: 0;
}

.planet-panel__title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  border-bottom: 1px solid var(--color-line, rgba(255, 255, 255, 0.12));
  padding-bottom: 10px;
}

.planet-panel__name {
  font-size: 22px;
  font-weight: 700;
}

.planet-panel__english {
  color: var(--color-muted, rgba(255, 255, 255, 0.55));
  font-size: 13px;
}

.planet-panel__section h3 {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--color-muted, rgba(255, 255, 255, 0.55));
}

.planet-panel__section p {
  margin: 0 0 10px;
}

.planet-panel__facts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 0;
}

/* Phase 2.21 三：两列数据卡片（标签 / 数值 / 单位；单位独立 span，禁止换行）。 */
.planet-panel__fact {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--color-line, rgba(158, 176, 204, 0.16));
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}

.planet-panel__fact dt {
  color: var(--color-muted, rgba(255, 255, 255, 0.55));
  font-size: 11px;
}

.planet-panel__fact dd {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin: 0;
  font-weight: 600;
  font-size: 13px;
}

.fact-value {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.fact-unit {
  flex-shrink: 0;
  color: var(--color-muted, rgba(255, 255, 255, 0.55));
  font-size: 11px;
  font-weight: 400;
  white-space: nowrap;
}

.fact-missing {
  color: var(--color-muted, rgba(255, 255, 255, 0.55));
  font-weight: 400;
}

.temperature-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.temperature-bar__label {
  min-width: 52px;
  font-size: 13px;
  font-weight: 600;
}

.temperature-bar__track {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(90deg, #3aa0ff, #ff6a3d);
}

.mass-compare__bars {
  display: flex;
  gap: 3px;
}

.mass-compare__bar {
  flex: 1;
  height: 8px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.12);
}

.mass-compare__bar--active {
  background: var(--color-cyan, #55d8ff);
}

.mass-compare__value {
  margin: 6px 0 0;
  font-size: 13px;
  font-weight: 600;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.timeline__item {
  position: relative;
  padding-left: 14px;
}

.timeline__item::before {
  content: '';
  position: absolute;
  top: 6px;
  left: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-cyan, #55d8ff);
}

.timeline__year {
  display: inline-block;
  margin-right: 8px;
  color: var(--color-cyan, #55d8ff);
  font-size: 13px;
}

.timeline__title {
  font-weight: 600;
}

.timeline__description {
  margin: 2px 0 0;
  font-size: 13px;
}

.fun-facts {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding-left: 18px;
}

.planet-panel__description {
  border-top: 1px solid var(--color-line, rgba(255, 255, 255, 0.12));
  padding-top: 10px;
  font-size: 13px;
}

.planet-panel__missing {
  margin: 0;
}

.planet-panel__empty {
  padding-top: 12px;
}

.planet-panel__empty p {
  margin: 0;
}
</style>
