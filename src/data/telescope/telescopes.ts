import type { TelescopeConfig } from '@/astronomy/telescope.types';

/**
 * 望远镜预设（Phase 2.21）。
 * 真实量级演示参数（入门折射镜 / 专业施卡）。
 */
export const ENTRY_TELESCOPE: TelescopeConfig = {
  apertureMm: 70,
  focalLengthMm: 700,
  magnification: 20,
  fieldOfViewDeg: 1.7,
  limitingMagnitude: 11,
};

export const PRO_TELESCOPE: TelescopeConfig = {
  apertureMm: 200,
  focalLengthMm: 2000,
  magnification: 100,
  fieldOfViewDeg: 0.6,
  limitingMagnitude: 14,
};

/** 望远镜配置表（id → 配置）。 */
export const TELESCOPE_CONFIGS: Readonly<Record<string, TelescopeConfig>> = {
  entry: ENTRY_TELESCOPE,
  pro: PRO_TELESCOPE,
};

/** 默认望远镜 ID。 */
export const DEFAULT_TELESCOPE_ID = 'entry';
