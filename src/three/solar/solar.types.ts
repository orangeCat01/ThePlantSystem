import type { LineLoop, Object3D } from 'three';
import type { PlanetConfig } from '@/types/planet.types';

/**
 * 天体运行时类型。
 *
 * 仅作为类型声明使用，本文件不创建任何 Three.js 实例。
 * 实例由 Phase 2.3 的 PlanetManager 创建和持有，并按标准生命周期销毁；
 * 本类型不得放入 Pinia Store。
 */
export interface PlanetRuntime {
  /** 该天体的静态配置（只读，运行期不得修改）。 */
  readonly config: PlanetConfig;
  /** 天体 ID（与 config.id 一致，便于 Map 查找时无需访问 config）。 */
  readonly id: string;
  /** 公转节点：用于绕中心天体旋转的父级 Object3D。 */
  readonly orbitNode: Object3D;
  /** 天体根节点：承载整体位移、缩放与倾角。 */
  readonly bodyRoot: Object3D;
  /** 自转节点：承载自转旋转。 */
  readonly rotationNode: Object3D;
  /** 视觉模型对象；模型未加载或失败时为 null。 */
  readonly modelObject: Object3D | null;
  /** 相机聚焦/跟随的稳定锚点。 */
  readonly cameraAnchor: Object3D;
  /** 可拾取对象列表（Raycaster 检测目标）。 */
  readonly selectableObjects: Object3D[];
  /** 父级天体运行时（多中心层级）；中心天体无父级为 undefined。 */
  readonly parentRuntime?: PlanetRuntime;
  /** 当前公转角度（弧度），运行期可变，不写回 config.orbit.initialAngle。 */
  orbitAngle: number;
  /** 当前自转角度（弧度），运行期可变，不写回 config.rotation。 */
  rotationAngle: number;
}

/**
 * PlanetManager.update 的驱动参数（Phase 2.4 起使用）。
 *
 * 由上层（SolarScene / 协调层）在每帧传入；Three.js 层不得直接读取 Pinia。
 * 调用方不得修改该对象内容。
 */
export interface PlanetUpdateOptions {
  /** 时间倍率（>= 0，0 等同暂停）。非法值（NaN / Infinity / 负数）由消费方安全兜底。 */
  readonly timeScale: number;
  /** 是否暂停动画（true 时不执行任何轨道和自转累加）。 */
  readonly animationPaused: boolean;
}

/**
 * 轨道运行时状态。
 *
 * 仅作为类型声明，实例由 OrbitManager 创建和持有；
 * 本类型不得放入 Pinia Store。
 */
export interface OrbitRuntime {
  /** 所属天体 ID。 */
  readonly planetId: string;
  /** 轨道根节点：承载轨道平面倾角，与对应天体的 orbitNode 同级。 */
  readonly root: Object3D;
  /** 轨道线（BufferGeometry + LineBasicMaterial）。 */
  readonly line: LineLoop;
  /** 当前可见状态，运行期可变。 */
  visible: boolean;
}

/**
 * 天体选择事件处理器（Phase 2.6 起）。
 *
 * 由 InteractionManager 经 SolarScene 转发给上层；
 * 上层（Phase 2.9 ApplicationCoordinator）据此更新 Store 选择状态。
 */
export type PlanetSelectedHandler = (planetId: string) => void;
