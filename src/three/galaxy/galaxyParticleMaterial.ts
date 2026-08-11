/**
 * 银河系圆形粒子着色器（Phase 2.20.3 / 2.20.2）。
 *
 * 需求：银河粒子使用片元着色器显示为圆形（默认 PointsMaterial 为方形点）。
 * - 仍是 BufferGeometry + THREE.Points（符合 AGENTS.md：银河粒子必须 Points，禁止大量独立 Mesh）。
 * - 自定义 ShaderMaterial：顶点着色器实现 sizeAttenuation（距离衰减），
 *   片元着色器用 gl_PointCoord 距离场绘制柔和圆形（smoothstep 边缘）。
 * - Phase 2.20.2 分层优化：每粒子 attributes（aSize / aColor / aAlpha）实现
 *   大小随机、颜色变化、透明度层次；uSizeScale / uBrightness 用于选中区域提亮。
 */
import { Color, ShaderMaterial, type ShaderMaterialParameters } from 'three';

/** 顶点着色器：每粒子尺寸（attribute）+ 距离衰减；颜色/透明度透传。 */
const VERTEX_SHADER = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aAlpha;
  uniform float uSizeScale;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    // sizeAttenuation 等价式：距离越远点越小（系数 300 对应经典 PointsMaterial 标度）。
    gl_PointSize = aSize * uSizeScale * (300.0 / max(-mvPosition.z, 0.1));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

/** 片元着色器：距离场绘制柔和圆形（中心实、边缘渐隐；非正方形）。 */
const FRAGMENT_SHADER = /* glsl */ `
  uniform float uOpacity;
  uniform float uBrightness;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 offset = gl_PointCoord - vec2(0.5);
    float dist = length(offset);
    // 圆形掩码：0.5 外完全透明；0.38~0.5 柔和边缘。
    float alpha = 1.0 - smoothstep(0.38, 0.5, dist);
    if (alpha <= 0.0) {
      discard;
    }
    gl_FragColor = vec4(vColor * uBrightness, alpha * vAlpha * uOpacity);
  }
`;

/** 圆形粒子材质参数。 */
export interface GalaxyParticleMaterialOptions {
  /** 全局不透明度（0-1；每粒子透明度由 aAlpha attribute 提供）。 */
  readonly opacity?: number;
  /** 全局尺寸缩放（默认 1；选中区域提亮用）。 */
  readonly sizeScale?: number;
  /** 全局亮度倍率（默认 1；选中区域提亮用）。 */
  readonly brightness?: number;
}

/**
 * 创建圆形粒子材质（Phase 2.20.3 / 2.20.2）。
 * 几何必须提供 attributes：aSize（float）、aColor（vec3）、aAlpha（float）。
 * 透明度排序依赖 depthWrite=false；uSizeScale / uBrightness 为事件级更新（非每帧）。
 */
export function createGalaxyParticleMaterial(
  options: GalaxyParticleMaterialOptions = {},
): ShaderMaterial {
  const parameters: ShaderMaterialParameters = {
    uniforms: {
      uOpacity: { value: options.opacity ?? 1 },
      uSizeScale: { value: options.sizeScale ?? 1 },
      uBrightness: { value: options.brightness ?? 1 },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  };
  return new ShaderMaterial(parameters);
}

/** 粒子几何 attribute 生成辅助（Phase 2.20.2 分层视觉；一次性初始化）。 */

/** 每粒子尺寸 attribute（区间内均匀随机）。 */
export function createParticleSizeAttribute(
  count: number,
  min: number,
  max: number,
  random: () => number = Math.random,
): Float32Array {
  const sizes = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    sizes[index] = min + random() * (max - min);
  }
  return sizes;
}

/** 每粒子颜色 attribute（基色 + 每通道抖动 ±jitter）。 */
export function createParticleColorAttribute(
  count: number,
  baseColor: number,
  jitter: number,
  random: () => number = Math.random,
): Float32Array {
  const color = new Color(baseColor);
  const colors = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    colors[index * 3] = Math.min(Math.max(color.r + (random() * 2 - 1) * jitter, 0), 1);
    colors[index * 3 + 1] = Math.min(Math.max(color.g + (random() * 2 - 1) * jitter, 0), 1);
    colors[index * 3 + 2] = Math.min(Math.max(color.b + (random() * 2 - 1) * jitter, 0), 1);
  }
  return colors;
}

/** 每粒子透明度 attribute（区间内均匀随机）。 */
export function createParticleAlphaAttribute(
  count: number,
  min: number,
  max: number,
  random: () => number = Math.random,
): Float32Array {
  const alphas = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    alphas[index] = min + random() * (max - min);
  }
  return alphas;
}
