import type { GalaxyConfig, GalaxySelectableObject } from '@/types/galaxy.types';

/**
 * 银河系可选择对象目录（Phase 2.19）。
 * id 与 Three 层 userData.galaxyId 对齐：'core' / 'arm-1'..'arm-4'。
 * 科普文字为原创中文文本。
 */
export const galaxySelectableObjects: readonly GalaxySelectableObject[] = [
  {
    id: 'core',
    type: 'core',
    displayName: '银河中心',
    description:
      '银心方向人马座 A* 是一个约 400 万倍太阳质量的超大质量黑洞，周围环绕着密集的老年恒星、电离气体盘与高速运转的星团；这里恒星密度是太阳附近的数百万倍，是银河系引力与能量的心脏。',
  },
  {
    id: 'arm-1',
    type: 'spiral-arm',
    displayName: '英仙臂',
    description:
      '英仙臂是银河系最外侧的主要旋臂之一，以英仙座方向命名。旋臂内的星际气体被压缩形成大量恒星摇篮，分布着明亮的 HII 区、年轻 OB 星协与密集的分子云，是恒星诞生的活跃地带。',
  },
  {
    id: 'arm-2',
    type: 'spiral-arm',
    displayName: '盾牌-半人马臂',
    description:
      '盾牌-半人马臂是银河系最显著的主旋臂之一，从银棒一端延伸而出。它富含电离氢区与年轻的蓝色恒星，天鹰座方向的银河亮带正是这条旋臂在天空中的投影。',
  },
  {
    id: 'arm-3',
    type: 'spiral-arm',
    displayName: '人马臂',
    description:
      '人马臂位于银心与太阳之间，是距离太阳最近的主要旋臂。它包含大量恒星形成区与暗尘埃云，太阳所在猎户臂是它与英仙臂之间的一个次要臂段。',
  },
  {
    id: 'arm-4',
    type: 'spiral-arm',
    displayName: '矩尺-天鹅臂',
    description:
      '矩尺-天鹅臂是银河系第四条主要旋臂，从银棒另一端延伸向天鹅座与矩尺座方向。它拥有众多超大质量恒星形成区与射电辐射云，记录着银河系旋臂结构的最新演化证据。',
  },
];

/**
 * 银河系静态配置（Phase 2.18，权威来源）。
 * 科普数据为近似天文量级与原创中文文本（非实时测量值）。
 */
export const galaxyConfig: GalaxyConfig = {
  id: 'galaxy',
  name: 'Milky Way',
  displayName: '银河系',
  type: '棒旋星系',
  diameterLightYears: 100000,
  estimatedStarCount: '约 1000 亿 - 4000 亿颗',
  ageYears: 1.36e10,

  structure: {
    type: 'spiral',
    armCount: 4,
    barred: true,
    description:
      '银河系是一个棒旋星系：银心区域横亘一条由老年恒星构成的恒星棒，四条主要旋臂从棒的两端延伸而出，旋臂中密集分布着年轻恒星、星云与尘埃。',
  },

  position: {
    rightAscension: 266.4,
    declination: -29.0,
  },

  description:
    '银河系是太阳系所在的棒旋星系，直径约 10 万光年，包含数千亿颗恒星。我们的太阳位于猎户臂内侧，距离银心约 2.6 万光年，正带领地球以每秒约 220 公里的速度绕银心公转。',

  science: {
    formation:
      '银河系约在 136 亿年前由早期宇宙的气体云坍缩凝聚而成，历经与多个矮星系的并合逐渐长大；银盘的恒星分为老年球状星团与年轻盘族恒星两层，至今仍在缓慢吸收周围的小星系。',
    environment:
      '银心方向人马座 A* 是一个约 400 万倍太阳质量的超大质量黑洞，周围聚集着密集的恒星与气体；银盘内布满星际尘埃与分子云，是恒星诞生的温床，而银晕中的球状星团记录着银河最古老的历史。',
    interestingFacts:
      '光穿过银河系盘面需要约 10 万年；银河系正与仙女座星系以每秒约 110 公里的速度相互靠近，预计 40 亿年后将并合成一个巨大的椭圆星系；我们看到的银河光带其实是银盘边缘无数恒星在天空中的投影。',
  },
};

/** 银河系配置表（id → 配置；本阶段仅一个条目，保留扩展能力）。 */
export const galaxyConfigs: Readonly<Record<string, GalaxyConfig>> = {
  galaxy: galaxyConfig,
};
