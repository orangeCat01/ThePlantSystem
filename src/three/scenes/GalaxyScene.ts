import { Color, Object3D, PerspectiveCamera, Scene, Vector3 } from 'three';
import { BaseScene } from '@/three/core/BaseScene';
import type { SceneContext } from '@/three/core/three.types';
import { GalaxyVisualSystem } from '@/three/galaxy/GalaxyVisualSystem';
import { GalaxyCameraController } from '@/three/galaxy/GalaxyCameraController';
import { GalaxyInteractionManager } from '@/three/galaxy/GalaxyInteractionManager';
import { GalaxyHighlightEffect } from '@/three/effects/GalaxyHighlightEffect';
import type { GalaxyObjectRuntime } from '@/three/galaxy/GalaxyObjectRuntime';
import { galaxyRepository } from '@/repositories/GalaxyRepository';
import type { GalaxyConfig, GalaxySelectableObject } from '@/types/galaxy.types';

/** 银河场景背景色（深空蓝黑）。 */
const GALAXY_BACKGROUND = 0x030411;
/** 银河核心高亮直径（场景单位）。 */
const CORE_HIGHLIGHT_SCALE = 26;
/** 旋臂高亮直径（场景单位；覆盖臂宽）。 */
const ARM_HIGHLIGHT_SCALE = 90;
/** 聚焦银河核心的观察距离。 */
const CORE_FOCUS_DISTANCE = 55;
/** 聚焦旋臂的观察距离。 */
const ARM_FOCUS_DISTANCE = 95;

/**
 * 银河系场景（Phase 2.17 ~ 2.19）。
 *
 * 职责：银河系三维展示（不是宇宙航行 / 飞行 / 自由穿越）：
 * - 银河星盘（80000 恒星 Points）+ 4 条对数螺旋旋臂 + 暖黄中心亮核。
 * - GalaxyCameraController：旋转 / 缩放观察（Phase 2.19：平滑聚焦银河对象）。
 * - GalaxyInteractionManager：点击银河中心 / 旋臂（统一 userData 约定，仅 pointer 事件 Raycast）。
 * - GalaxyHighlightEffect：选中对象高亮（Sprite 圆环，无 Shader/Bloom/Composer）。
 * - 资源全部登记 'galaxy' 资源组，由 BaseScene.destroy → releaseGroup('galaxy') 统一释放。
 *
 * 生命周期：init → start → update → pause/resume → resize → destroy（全部幂等；
 * Galaxy → Solar → Galaxy 无重复对象/监听）。
 */
export class GalaxyScene extends BaseScene {
  readonly sceneName = 'galaxy' as const;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(58, 1, 0.1, 2000);

  /** 银河视觉系统（Phase 2.20 视觉迁移：博客算法组装 + 区域高亮）。 */
  private galaxyVisualSystem: GalaxyVisualSystem | null = null;
  private cameraController: GalaxyCameraController | null = null;
  private interactionManager: GalaxyInteractionManager | null = null;
  private highlightEffect: GalaxyHighlightEffect | null = null;
  /** 银河对象运行时（数据层 + Three 层连接；只存引用不复制数据，Phase 2.18）。 */
  private galaxyRuntime: GalaxyObjectRuntime | null = null;
  /** 银河对象选择处理器（Phase 2.19 Coordinator 注册）；null 时点击安全无副作用。 */
  private galaxySelectedHandler: ((objectId: string) => void) | null = null;
  /** 当前选中的银河对象 ID（Phase 2.19；用于 getSelectedObject）。 */
  private selectedGalaxyId: string | null = null;
  /** 旋臂点击命中点（Phase 2.19；高亮定位 / 相机聚焦用）。 */
  private readonly armHitPosition = new Vector3();
  /** 高亮跟随锚点（挂 scene；位置由 showGalaxyHighlight 更新）。 */
  private readonly highlightAnchor = new Object3D();

  protected onInit(context: SceneContext): void {
    this.scene.background = new Color(GALAXY_BACKGROUND);

    // 银河视觉系统（Phase 2.20 视觉迁移）：GalaxyRoot 独立挂 scene。
    const visual = new GalaxyVisualSystem(context.resources, 'galaxy');
    this.scene.add(visual.root);
    this.galaxyVisualSystem = visual;

    // 银河对象运行时：连接数据层配置与 Three 层根节点（不复制数据）。
    this.galaxyRuntime = {
      id: galaxyRepository.get().id,
      config: galaxyRepository.get(),
      object3D: visual.root,
    };

    // 银河相机：默认观察银河整体（旋转 / 缩放，禁止平移）。
    this.cameraController = new GalaxyCameraController(
      this.camera,
      context.renderer.domElement,
    );

    // 银河交互（Phase 2.19）：点击核心 / 旋臂；命中点用于高亮定位与相机聚焦。
    this.highlightAnchor.name = 'galaxy-highlight-anchor';
    this.scene.add(this.highlightAnchor);
    this.interactionManager = new GalaxyInteractionManager({
      camera: this.camera,
      domElement: context.renderer.domElement,
      onSelected: (galaxyId, worldPosition) => {
        this.selectedGalaxyId = galaxyId;
        this.armHitPosition.copy(worldPosition);
        this.galaxySelectedHandler?.(galaxyId);
      },
    });
    this.interactionManager.setSelectableObjects(visual.getSelectableObjects());

    // 银河高亮（Phase 2.19）：挂 scene，默认隐藏。
    this.highlightEffect = new GalaxyHighlightEffect(context.resources, 'galaxy');
    this.scene.add(this.highlightEffect.getSprite());
  }

  update(deltaTime: number, _elapsedTime: number): void {
    this.galaxyVisualSystem?.update(deltaTime);
    this.cameraController?.update(deltaTime);
    this.highlightEffect?.update(deltaTime);
  }

  /** 银河系数据快照（Phase 2.18，供 Coordinator → UI 展示；数据可序列化）。 */
  getGalaxyInfo(): GalaxyConfig | null {
    return this.galaxyRuntime?.config ?? null;
  }

  /** 注册银河对象选择处理器（Phase 2.19 Coordinator 注册）；null 清除。 */
  setGalaxySelectedHandler(handler: ((objectId: string) => void) | null): void {
    this.galaxySelectedHandler = handler;
  }

  /** 兼容别名（Phase 2.18 预留接口）：等价 setGalaxySelectedHandler。 */
  setSelectedHandler(handler: ((objectId: string) => void) | null): void {
    this.setGalaxySelectedHandler(handler);
  }

  /** 上报银河对象选择（Phase 2.18 预留触发入口：等价交互回调路径）。 */
  notifyObjectSelected(objectId: string): void {
    this.galaxySelectedHandler?.(objectId);
  }

  /** 启用 / 禁用银河交互（Phase 2.19；禁用后点击安全忽略）。 */
  setInteractionEnabled(enabled: boolean): void {
    this.interactionManager?.setEnabled(enabled);
  }

  /** 当前选中的银河对象（Phase 2.19；数据层查询，未选中返回 null）。 */
  getSelectedObject(): GalaxySelectableObject | null {
    if (!this.selectedGalaxyId) {
      return null;
    }
    return galaxyRepository.getSelectableObjectById(this.selectedGalaxyId) ?? null;
  }

  /** 显示选中对象高亮（Phase 2.19；core 定位核心，旋臂定位最近命中点）。 */
  showGalaxyHighlight(galaxyId: string): void {
    if (!this.highlightEffect || !this.galaxyVisualSystem) {
      return;
    }
    if (galaxyId === 'core') {
      const core = this.galaxyVisualSystem.getSelectableObject('core');
      if (core) {
        this.highlightAnchor.position.copy(core.position);
        this.highlightEffect.show(this.highlightAnchor, CORE_HIGHLIGHT_SCALE);
      }
      return;
    }
    // 旋臂：优先命中点；未点击过则用对象自身位置（原点附近）。
    const arm = this.galaxyVisualSystem.getSelectableObject(galaxyId);
    if (arm) {
      this.highlightAnchor.position.copy(this.armHitPosition);
      this.highlightEffect.show(this.highlightAnchor, ARM_HIGHLIGHT_SCALE);
      // Phase 2.20.2：选中臂粒子提亮（顶点色 ×1.6），画面可明显辨识。
      this.galaxyVisualSystem.setArmHighlighted(galaxyId, true);
    }
  }

  /** 隐藏银河高亮（Phase 2.19；幂等）；同时清除选中臂提亮（Phase 2.20.2）。 */
  hideGalaxyHighlight(): void {
    this.highlightEffect?.hide();
    this.galaxyVisualSystem?.clearArmHighlight();
  }

  /** 平滑聚焦银河对象（Phase 2.19；core 聚焦核心，旋臂聚焦命中点附近）。 */
  focusGalaxyObject(galaxyId: string): Promise<void> {
    const controller = this.cameraController;
    if (!controller || !this.galaxyVisualSystem) {
      return Promise.resolve();
    }
    if (galaxyId === 'core') {
      const core = this.galaxyVisualSystem.getSelectableObject('core');
      if (!core) {
        return Promise.resolve();
      }
      return controller.focus(core, CORE_FOCUS_DISTANCE);
    }
    // 旋臂：聚焦点击命中点（无命中记录则聚焦对象中心附近）。
    return controller.focusPosition(this.armHitPosition, ARM_FOCUS_DISTANCE);
  }

  protected onDestroy(): void {
    this.galaxySelectedHandler = null;
    this.selectedGalaxyId = null;
    this.galaxyRuntime = null;

    // 交互管理器：移除 pointer 监听（Phase 2.19）。
    this.interactionManager?.destroy();
    this.interactionManager = null;

    // 高亮：移除 Sprite 并清引用（纹理/材质由 releaseGroup 统一释放）。
    this.highlightEffect?.destroy();
    this.highlightEffect = null;

    this.highlightAnchor.removeFromParent();

    // 相机控制器：释放 OrbitControls（事件监听 / 指针状态）——先于资源释放。
    this.cameraController?.destroy();
    this.cameraController = null;

    // 银河视觉系统：移除 GalaxyRoot 并清引用（Geometry/Material/Texture
    // 由 BaseScene.destroy 的 releaseGroup('galaxy') 统一释放）。
    this.galaxyVisualSystem?.destroy();
    this.galaxyVisualSystem = null;
  }
}
