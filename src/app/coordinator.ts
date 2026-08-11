import { ApplicationCoordinator } from './ApplicationCoordinator';

/**
 * 应用协调器共享实例（懒单例）。
 *
 * 背景：SceneViewport 负责初始化/销毁三维场景，而 UniverseControlPanel 等
 * Vue 组件需要向 Three.js 层下发命令。为保持「Vue → Coordinator → Three.js」
 * 单向命令边界，所有组件共享同一个 ApplicationCoordinator 实例。
 *
 * 生命周期：SceneViewport 挂载时 initialize、卸载时 destroy；
 * destroy 后再次 initialize 可安全重建（ApplicationCoordinator / SceneManager
 * 的 initialized / destroyed 标志均支持重复初始化）。
 */
let coordinator: ApplicationCoordinator | null = null;

export function getApplicationCoordinator(): ApplicationCoordinator {
  if (!coordinator) {
    coordinator = new ApplicationCoordinator({ initialScene: 'solar' });
  }
  return coordinator;
}
