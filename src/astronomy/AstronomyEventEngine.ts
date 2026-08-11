import type { SimulationTimeState } from './astronomy.types';
import { dateToJulianDay, julianDayToDate } from './JulianDate';
import { calculateSolarPosition, type MutableSolarPositionData } from './calculators/SolarPositionCalculator';
import { calculateMoonEclipticPosition, type MutableMoonEclipticPosition } from './calculators/MoonPositionCalculator';
import {
  calculatePlanetHeliocentricLongitude,
  normalizedAngularDifference,
  PLANET_IDS,
} from './calculators/PlanetPositionCalculator';
import type {
  AstronomyEvent,
  AstronomyEventsResult,
  AstronomyEventType,
} from './events/astronomy-event.types';
import { astronomyEventRepository, type AstronomyEventRepository } from '@/repositories/AstronomyEventRepository';

/** 未来事件扫描天数（含当天，共 31 天窗口）。 */
const SCAN_HORIZON_DAYS = 30;
/** 日食检测：日月黄经差阈值（度）。 */
const ECLIPSE_LONGITUDE_THRESHOLD = 2.5;
/** 日食检测：中心食（total）月球黄纬阈值（度）。 */
const SOLAR_TOTAL_LATITUDE = 0.9;
/** 月食检测：月球黄纬阈值（度）；中心食（total）阈值更小。 */
const LUNAR_PARTIAL_LATITUDE = 1.2;
const LUNAR_TOTAL_LATITUDE = 0.6;
/** 冲日检测：行星与地球黄经差相对 180° 的阈值（度）。
 * 简化平均根数未含摄动项，误差约 2°~4°，阈值放宽到 6°（约 ±6 天窗口）。 */
const OPPOSITION_THRESHOLD = 6;
/** 合相检测：两天体黄经差阈值（度）。 */
const CONJUNCTION_THRESHOLD = 4;
/** 参与冲日检测的外行星（任务要求 Mars / Jupiter / Saturn）。 */
const OPPOSITION_PLANETS: readonly string[] = ['mars', 'jupiter', 'saturn'];

/** 事件日期排序（升序）。 */
function compareByDate(a: AstronomyEvent, b: AstronomyEvent): number {
  return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
}

/**
 * 天文事件引擎（Phase 2.16）。
 *
 * 职责：基于模拟时间计算天文事件：
 * - 动态事件：日食 / 月食（新月/满月 + 月球黄纬节点条件）、
 *   行星冲日（外行星太阳角距 180°）、行星合相（两天体黄经接近）。
 * - 静态事件：合并 AstronomyEventRepository（流星雨 / 特殊天象 / 人工核验事件）。
 *
 * 设计约束：
 * - update 每帧由 SolarScene 调用；按「整数日变化」缓存扫描结果
 *   （每模拟天最多重扫一次未来 30 天窗口，避免每帧全量计算）。
 * - 扫描使用复用状态对象（不创建每帧对象；扫描期局部数组为一次性分配）。
 * - 输出 { currentEvents, upcomingEvents }，按日期升序。
 * - 与静态事件合并时静态优先（人工校验日期精度高）；同类型日期差 ≤ 2 天判重。
 * - 禁止依赖 Vue / Pinia / Three.js；不使用 Date.now()。
 */
export class AstronomyEventEngine {
  private readonly repository: AstronomyEventRepository;
  private readonly moonPosition: MutableMoonEclipticPosition = { longitude: 0, latitude: 0 };
  private readonly solarPosition: MutableSolarPositionData = { longitude: 0, latitude: 0, distance: 1 };
  private currentEvents: readonly AstronomyEvent[] = [];
  private upcomingEvents: readonly AstronomyEvent[] = [];
  private lastScanDay = Number.NaN;
  private enabled = true;

  constructor(repository: AstronomyEventRepository = astronomyEventRepository) {
    this.repository = repository;
  }

  /** 每帧更新：整数日变化时重扫未来事件窗口。 */
  update(simulationTime: SimulationTimeState): void {
    if (!this.enabled || !simulationTime || !Number.isFinite(simulationTime.julianDay)) {
      return;
    }

    const day = Math.floor(simulationTime.julianDay);
    if (day !== this.lastScanDay) {
      this.scan(day);
      this.lastScanDay = day;
    }
  }

  /** 启用 / 禁用事件计算（禁用时保持最后一次结果）。 */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled && Number.isNaN(this.lastScanDay)) {
      // 下次 update 会触发首次扫描。
      this.lastScanDay = Number.NaN;
    }
  }

  /** 当前是否启用。 */
  isEnabled(): boolean {
    return this.enabled;
  }

  /** 当前与未来事件（按日期升序；禁用时返回最后计算结果）。 */
  getEvents(): AstronomyEventsResult {
    return {
      currentEvents: this.currentEvents,
      upcomingEvents: this.upcomingEvents,
    };
  }

  /** 扫描窗口：以扫描日（整数 JD）为当天，扫描未来 SCAN_HORIZON_DAYS 天。 */
  private scan(scanJulianDay: number): void {
    const dynamicCurrent: AstronomyEvent[] = [];
    const dynamicUpcoming: AstronomyEvent[] = [];

    for (let offset = 0; offset <= SCAN_HORIZON_DAYS; offset += 1) {
      // 每日代表时刻：该日正午（0h 约定下避免跨日边界抖动）。
      const dayJulianDay = scanJulianDay + offset + 0.5;
      const events = this.computeDayEvents(dayJulianDay);
      if (events.length === 0) {
        continue;
      }
      const bucket = offset === 0 ? dynamicCurrent : dynamicUpcoming;
      bucket.push(...events);
    }

    // 合相同一对（如金星-木星）跨相邻日期只报告一次：合并整个窗口去重后重新分桶。
    const allDynamic = this.dedupeConjunctions([...dynamicCurrent, ...dynamicUpcoming]);
    const scanDate = julianDayToDate(scanJulianDay + 0.5);
    const dedupedCurrent = allDynamic.filter((event) => event.date === scanDate);
    const dedupedUpcoming = allDynamic.filter((event) => event.date !== scanDate);

    // 合并静态事件（静态优先：同类型日期差 ≤ 2 天时丢弃动态重复项）。
    const staticEvents = this.collectStaticEvents(scanJulianDay);
    this.currentEvents = this.mergeEvents(dedupedCurrent, staticEvents.current);
    this.upcomingEvents = this.mergeEvents(dedupedUpcoming, staticEvents.upcoming);
  }

  /** 合相去重：同一对行星在扫描窗口内只保留最早一次（避免连续多天重复上报）。 */
  private dedupeConjunctions(events: readonly AstronomyEvent[]): AstronomyEvent[] {
    const seenPairs = new Set<string>();
    const result: AstronomyEvent[] = [];
    for (const event of events) {
      if (event.type !== 'conjunction') {
        result.push(event);
        continue;
      }
      const pairKey = [...event.relatedBodies].sort().join('-');
      if (seenPairs.has(pairKey)) {
        continue;
      }
      seenPairs.add(pairKey);
      result.push(event);
    }
    return result;
  }

  /** 收集窗口内的静态事件（按日期分桶）。 */
  private collectStaticEvents(scanJulianDay: number): {
    current: readonly AstronomyEvent[];
    upcoming: readonly AstronomyEvent[];
  } {
    const today = julianDayToDate(scanJulianDay + 0.5);
    const todayJd = dateToJulianDay(today);
    const current: AstronomyEvent[] = [];
    const upcoming: AstronomyEvent[] = [];

    for (const event of this.repository.getAll()) {
      const eventJd = dateToJulianDay(event.date);
      if (!Number.isFinite(eventJd)) {
        continue;
      }
      const diffDays = Math.round(eventJd - todayJd);
      if (diffDays === 0) {
        current.push(event);
      } else if (diffDays > 0 && diffDays <= SCAN_HORIZON_DAYS) {
        upcoming.push(event);
      }
    }
    return { current, upcoming };
  }

  /** 合并动态与静态事件（静态优先去重：同类型且日期差 ≤ 2 天时保留静态）。 */
  private mergeEvents(
    dynamic: readonly AstronomyEvent[],
    fixed: readonly AstronomyEvent[],
  ): readonly AstronomyEvent[] {
    const merged = [...dynamic];
    for (const fixedEvent of fixed) {
      const fixedJd = dateToJulianDay(fixedEvent.date);
      const duplicated = dynamic.some((dynamicEvent) => {
        if (dynamicEvent.type !== fixedEvent.type) {
          return false;
        }
        const dynamicJd = dateToJulianDay(dynamicEvent.date);
        return (
          Number.isFinite(fixedJd) &&
          Number.isFinite(dynamicJd) &&
          Math.abs(dynamicJd - fixedJd) <= 2
        );
      });
      if (!duplicated) {
        merged.push(fixedEvent);
      }
    }
    return merged.sort(compareByDate);
  }

  /** 计算某一天的全部动态事件（复用状态对象，不创建每帧对象）。 */
  private computeDayEvents(dayJulianDay: number): AstronomyEvent[] {
    const events: AstronomyEvent[] = [];

    // 太阳与月球位置（黄道坐标）。
    calculateSolarPosition(dayJulianDay, this.solarPosition);
    calculateMoonEclipticPosition(dayJulianDay, this.moonPosition);
    const sunLongitude = this.solarPosition.longitude;
    const moonLongitude = this.moonPosition.longitude;
    const moonLatitude = this.moonPosition.latitude;

    // 日食：新月（日月黄经接近）且月球黄纬足够小（接近轨道节点）。
    const sunMoonDiff = Math.abs(normalizedAngularDifference(moonLongitude, sunLongitude));
    if (sunMoonDiff < ECLIPSE_LONGITUDE_THRESHOLD) {
      events.push(this.buildEvent(
        'solar_eclipse',
        moonLatitude < SOLAR_TOTAL_LATITUDE ? '日全食' : '日偏食',
        dayJulianDay,
        moonLatitude < SOLAR_TOTAL_LATITUDE
          ? '月球几乎正对日心，日面被完全遮住，可观测日冕。'
          : '月球偏离日心，只遮住部分日面。',
        ['sun', 'earth', 'moon'],
        moonLatitude < SOLAR_TOTAL_LATITUDE ? 'major' : 'normal',
      ));
    }

    // 月食：满月（日月黄经差接近 180°）且月球黄纬足够小。
    const sunMoonOpposition = Math.abs(Math.abs(normalizedAngularDifference(moonLongitude, sunLongitude)) - 180);
    if (sunMoonOpposition < ECLIPSE_LONGITUDE_THRESHOLD && moonLatitude < LUNAR_PARTIAL_LATITUDE) {
      const total = moonLatitude < LUNAR_TOTAL_LATITUDE;
      events.push(this.buildEvent(
        'lunar_eclipse',
        total ? '月全食' : '月偏食',
        dayJulianDay,
        total
          ? '月球完全进入地球本影，呈现红铜色「血月」。'
          : '月球部分进入地球本影，边缘出现明显阴影。',
        ['sun', 'earth', 'moon'],
        total ? 'major' : 'normal',
      ));
    }

    // 外行星冲日：行星与地球日心黄经差接近 180°。
    for (const planetId of OPPOSITION_PLANETS) {
      const planetLongitude = calculatePlanetHeliocentricLongitude(planetId, dayJulianDay);
      const earthLongitude = calculatePlanetHeliocentricLongitude('earth', dayJulianDay);
      if (Number.isNaN(planetLongitude) || Number.isNaN(earthLongitude)) {
        continue;
      }
      const opposition = Math.abs(Math.abs(normalizedAngularDifference(planetLongitude, earthLongitude)) - 180);
      if (opposition < OPPOSITION_THRESHOLD) {
        events.push(this.buildEvent(
          'opposition',
          `${this.planetName(planetId)}冲日`,
          dayJulianDay,
          `${this.planetName(planetId)}与太阳分处地球两侧，整夜可见，适合观测。`,
          [planetId, 'earth'],
          'normal',
        ));
      }
    }

    // 行星合相：任意两行星（不含地球对——「地球合 X」实为行星合日，观测上不可见）
    // 日心黄经差小于阈值；同一对相邻日期只报告一次（scan 后去重）。
    for (let i = 0; i < PLANET_IDS.length; i += 1) {
      const a = PLANET_IDS[i];
      if (!a || a === 'earth') {
        continue;
      }
      for (let j = i + 1; j < PLANET_IDS.length; j += 1) {
        const b = PLANET_IDS[j];
        if (!b || b === 'earth') {
          continue;
        }
        const longitudeA = calculatePlanetHeliocentricLongitude(a, dayJulianDay);
        const longitudeB = calculatePlanetHeliocentricLongitude(b, dayJulianDay);
        if (Number.isNaN(longitudeA) || Number.isNaN(longitudeB)) {
          continue;
        }
        if (Math.abs(normalizedAngularDifference(longitudeA, longitudeB)) < CONJUNCTION_THRESHOLD) {
          events.push(this.buildEvent(
            'conjunction',
            `${this.planetName(a)}合${this.planetName(b)}`,
            dayJulianDay,
            `${this.planetName(a)}与${this.planetName(b)}黄经接近，天空视位置相邻，同框可见。`,
            [a, b],
            'minor',
          ));
        }
      }
    }

    return events;
  }

  /** 构造事件（ID 基于类型与日期，保证唯一）。 */
  private buildEvent(
    type: AstronomyEventType,
    title: string,
    dayJulianDay: number,
    description: string,
    relatedBodies: readonly string[],
    importance: 'minor' | 'normal' | 'major',
  ): AstronomyEvent {
    const date = julianDayToDate(dayJulianDay);
    return {
      id: `${type}-${date}`,
      type,
      title,
      date,
      description,
      relatedBodies,
      importance,
    };
  }

  /** 行星中文名（仅事件标题/描述使用，禁止依赖 UI 层）。 */
  private planetName(planetId: string): string {
    const names: Record<string, string> = {
      mercury: '水星',
      venus: '金星',
      earth: '地球',
      mars: '火星',
      jupiter: '木星',
      saturn: '土星',
      uranus: '天王星',
      neptune: '海王星',
    };
    return names[planetId] ?? planetId;
  }
}
