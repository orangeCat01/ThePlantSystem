/**
 * 银河恒星动态闪烁材质（Phase 2.21 银河动态闪烁系统）。
 *
 * 设计：保留 PointsMaterial（vertexColors / AdditiveBlending / CanvasTexture 圆点贴图
 * / sizeAttenuation 全部沿用），通过 onBeforeCompile 注入**微型 Fragment 动态效果**——
 * 不切换 ShaderMaterial 管线，不破坏 ResourceManager 生命周期与单 RAF 架构。
 *
 * 注入内容：
 * - uTime（AnimationManager 驱动，每帧一次浮点累加；闭包共享 uniform 对象）。
 * - aRandom（每粒子随机相位 attribute，vertex → varying）：星星**非同步闪烁**
 *   （sin(uTime*speed + vRandom*50)），避免「灯带式」同步亮暗。
 * - aRadius（每粒子盘面半径，vertex → varying）：核心区域活性增强——
 *   中心更亮（coreInfluence），外围稳定。
 * - 闪烁/核心增强参数均为 uniform（uTwinkleSpeed / uTwinkleAmplitude /
 *   uCoreRadius / uCoreBoost），不同层（臂/盘/尘埃）共享同一 program 缓存。
 *
 * 性能：CPU 每帧 1 次 uniform 浮点累加（62000 粒子零 CPU 更新）；GPU 并行闪烁。
 */
import {
  AdditiveBlending,
  PointsMaterial,
  type Blending,
  type Texture,
} from 'three';

export interface GalaxyStarMaterialOptions {
  /** 圆形粒子贴图（CanvasTexture 圆点）。 */
  readonly map?: Texture;
  /** 粒子尺寸（场景单位）。 */
  readonly size?: number;
  /** 全局不透明度。 */
  readonly opacity?: number;
  /** 使用顶点色（默认 true）。 */
  readonly vertexColors?: boolean;
  /** 混合模式（默认 AdditiveBlending，与博客一致）。 */
  readonly blending?: Blending;
  /** 闪烁速度（弧度/秒；默认 1.5；0 = 关闭闪烁）。 */
  readonly twinkleSpeed?: number;
  /** 闪烁幅度（0~1；默认 0.15 → 亮度 0.85~1.15 波动；0 = 关闭闪烁）。 */
  readonly twinkleAmplitude?: number;
  /** 核心活跃半径（场景单位；默认 30；<=0 = 关闭核心增强）。 */
  readonly coreRadius?: number;
  /** 核心亮度加成（默认 0.12；核心区域亮度 × (1+coreInfluence*boost)）。 */
  readonly coreBoost?: number;
}

/** 闪烁运行时状态（挂在 material.userData.galaxyTime；闭包共享 uniform 对象）。 */
export interface GalaxyTwinkleRuntime {
  /** uTime uniform 值对象（外部 update 只做一次浮点累加）。 */
  readonly time: { value: number };
}

/** 顶点注入：随机相位与盘面半径（vRandom 驱动非同步闪烁；vRadius 驱动核心活性）。 */
const VERTEX_INJECTION_HEAD = /* glsl */ `
  attribute float aRandom;
  varying float vRandom;
  varying float vRadius;
`;

const VERTEX_INJECTION_MAIN = /* glsl */ `
  vRandom = aRandom;
  vRadius = length(position.xy);
`;

/** 片元注入：非同步闪烁 + 核心区域亮度增强（作用于 diffuseColor.rgb，不动 alpha）。 */
const FRAGMENT_INJECTION_HEAD = /* glsl */ `
  uniform float uTime;
  uniform float uTwinkleSpeed;
  uniform float uTwinkleAmplitude;
  uniform float uCoreRadius;
  uniform float uCoreBoost;
  varying float vRandom;
  varying float vRadius;
`;

const FRAGMENT_INJECTION_MAIN = /* glsl */ `
  // 每粒子独立闪烁（随机相位 vRandom → 非同步星光）。
  float twinkle = sin(uTime * uTwinkleSpeed + vRandom * 50.0);
  float factor = mix(1.0 - uTwinkleAmplitude, 1.0 + uTwinkleAmplitude, twinkle * 0.5 + 0.5);
  diffuseColor.rgb *= factor;
  // 核心区域活性：中心更亮、外围稳定（coreInfluence 随半径衰减）。
  float coreInfluence = 1.0 - smoothstep(0.0, uCoreRadius, vRadius);
  diffuseColor.rgb *= 1.0 + coreInfluence * uCoreBoost;
`;

/**
 * 创建银河恒星粒子材质（Phase 2.21）。
 * 返回 PointsMaterial；闪烁/核心增强在 onBeforeCompile 注入，uTime 通过
 * material.userData.galaxyTime.time 访问（外部 update 每帧 += deltaTime）。
 * 几何必须提供 attributes：aRandom（float 0~1）、aRadius（float 盘面半径）。
 */
export function createGalaxyStarMaterial(
  options: GalaxyStarMaterialOptions,
): PointsMaterial {
  const material = new PointsMaterial({
    size: options.size ?? 1,
    map: options.map,
    blending: options.blending ?? AdditiveBlending,
    depthWrite: false,
    transparent: true,
    vertexColors: options.vertexColors ?? true,
    opacity: options.opacity ?? 1,
  });

  const twinkleSpeed = options.twinkleSpeed ?? 1.5;
  const twinkleAmplitude = options.twinkleAmplitude ?? 0.15;
  const coreRadius = options.coreRadius ?? 30;
  const coreBoost = options.coreBoost ?? 0.12;
  const hasTwinkle = twinkleAmplitude > 0 && twinkleSpeed > 0;
  const hasCoreBoost = coreRadius > 0 && coreBoost > 0;
  if (!hasTwinkle && !hasCoreBoost) {
    // 静态层（如星云尘埃）：零注入开销，直接返回。
    return material;
  }

  // 闭包共享 uniform 值对象：onBeforeCompile 只建立引用，外部每帧只更新 .value。
  const time: { value: number } = { value: 0 };
  material.userData.galaxyTime = { time } satisfies GalaxyTwinkleRuntime;

  material.onBeforeCompile = (shader): void => {
    shader.uniforms.uTime = time;
    shader.uniforms.uTwinkleSpeed = { value: twinkleSpeed };
    shader.uniforms.uTwinkleAmplitude = { value: twinkleAmplitude };
    shader.uniforms.uCoreRadius = { value: coreRadius };
    shader.uniforms.uCoreBoost = { value: coreBoost };

    // Vertex：声明注入 + main 赋值（begin_vertex 后）。
    shader.vertexShader = VERTEX_INJECTION_HEAD + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\n${VERTEX_INJECTION_MAIN}`,
    );

    // Fragment：声明注入 + 顶点色/贴图混合后作用于 diffuseColor.rgb。
    // 注：Points 材质的模板使用 #include <color_fragment>（map 由
    // map_particle_fragment 处理），因此以 color_fragment 为注入锚点。
    shader.fragmentShader = FRAGMENT_INJECTION_HEAD + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>\n${FRAGMENT_INJECTION_MAIN}`,
    );
  };

  // 所有闪烁层共享同一 program 缓存（层间差异走 uniform，避免重复编译）。
  material.customProgramCacheKey = (): string => 'galaxy-star-twinkle-v1';

  return material;
}
