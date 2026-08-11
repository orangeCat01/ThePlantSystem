import {
  BufferAttribute,
  BufferGeometry,
  LineBasicMaterial,
  LineSegments,
} from 'three';
import type { ResourceManager } from '@/three/core/ResourceManager';
import type { ConstellationConfig, StarConfig } from '@/types/star.types';
import { starVisualRadius } from './StarCatalogManager';
import {
  equatorialToCartesian,
  type CartesianPosition,
} from '@/astronomy/coordinates/EquatorialCoordinate';

/** 星座线颜色。 */
const CONSTELLATION_LINE_COLOR = 0x55aaff;
/** 星座线不透明度。 */
const CONSTELLATION_LINE_OPACITY = 0.6;

/**
 * 星座连线管理器（Phase 2.19）。
 *
 * 职责：把 ConstellationConfig（lines 数组对格式）渲染为 LineSegments。
 * - 线端点与 StarCatalogManager 共享同一坐标映射（starVisualRadius +
 *   equatorialToCartesian），保证连线与星点精确对齐。
 * - 不可拾取：userData.interactive = false（点击连线不触发选择）。
 * - 全部星座合并为单个 LineSegments（一个 BufferGeometry）。
 *
 * 资源所有权：BufferGeometry / LineBasicMaterial 登记到 ResourceManager 指定资源组，
 * 由 releaseGroup 统一释放；destroy 只移除节点并清空引用。
 */
export class ConstellationManager {
  /** 星座线对象（挂 scene 使用）。 */
  readonly lines: LineSegments;
  /** 已渲染的星座 ID 列表（有有效连线的星座）。 */
  readonly renderedConstellationIds: readonly string[];

  private readonly resources: ResourceManager;
  private readonly resourceGroup: string;
  private readonly tempPosition: CartesianPosition = { x: 0, y: 0, z: 0 };
  private destroyed = false;

  constructor(
    constellations: readonly ConstellationConfig[],
    starsById: (starId: string) => StarConfig | undefined,
    resources: ResourceManager,
    resourceGroup: string,
  ) {
    this.resources = resources;
    this.resourceGroup = resourceGroup;

    const segments: number[] = [];
    const renderedIds: string[] = [];

    for (const constellation of constellations) {
      let segmentCount = 0;
      for (const line of constellation.lines) {
        const fromStar = starsById(line[0]);
        const toStar = starsById(line[1]);
        if (!fromStar || !toStar) {
          continue;
        }
        const radius = starVisualRadius(fromStar.distanceLightYears);
        if (
          !equatorialToCartesian(
            { rightAscension: fromStar.position.rightAscension, declination: fromStar.position.declination },
            radius,
            this.tempPosition,
          )
        ) {
          continue;
        }
        segments.push(this.tempPosition.x, this.tempPosition.y, this.tempPosition.z);
        if (
          !equatorialToCartesian(
            { rightAscension: toStar.position.rightAscension, declination: toStar.position.declination },
            radius,
            this.tempPosition,
          )
        ) {
          continue;
        }
        segments.push(this.tempPosition.x, this.tempPosition.y, this.tempPosition.z);
        segmentCount += 1;
      }
      if (segmentCount > 0) {
        renderedIds.push(constellation.id);
      }
    }

    const geometry = new BufferGeometry();
    if (segments.length > 0) {
      geometry.setAttribute('position', new BufferAttribute(new Float32Array(segments), 3));
    }

    const material = new LineBasicMaterial({
      color: CONSTELLATION_LINE_COLOR,
      transparent: true,
      opacity: CONSTELLATION_LINE_OPACITY,
      depthWrite: false,
    });

    this.lines = new LineSegments(geometry, material);
    this.lines.name = 'constellation-lines';
    // 交互隔离：星座线不可拾取（点击连线不触发选择）。
    this.lines.userData.interactive = false;
    this.lines.renderOrder = 2;
    this.renderedConstellationIds = renderedIds;

    this.resources.registerDisposable(this.resourceGroup, geometry);
    this.resources.registerDisposable(this.resourceGroup, material);
  }

  /** 幂等销毁：移除线对象并清空引用（资源由 releaseGroup 统一释放）。 */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.lines.removeFromParent();
    this.destroyed = true;
  }
}
