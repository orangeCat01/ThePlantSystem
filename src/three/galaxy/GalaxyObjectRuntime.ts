import type { Object3D } from 'three';
import type { GalaxyConfig } from '@/types/galaxy.types';

/**
 * 银河对象运行时（Phase 2.18）。
 *
 * 职责：连接数据层（GalaxyConfig）与 Three.js 层（GalaxyRoot Object3D）。
 * - 只保存：id、config 引用、Object3D 引用（禁止复制数据）。
 * - 禁止放入 Store（含 Object3D 引用，不可序列化）。
 */
export interface GalaxyObjectRuntime {
  /** 唯一 ID（与 GalaxyConfig.id 对齐，'galaxy'）。 */
  readonly id: string;
  /** 数据层配置引用（只读，不复制）。 */
  readonly config: GalaxyConfig;
  /** Three.js 层视觉根节点引用。 */
  readonly object3D: Object3D;
}
