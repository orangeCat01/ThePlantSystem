import type { DeepSkyObject } from '@/types/deepSky.types';

/**
 * 深空天体目录（Phase 2.21，真实天文数据）。
 * 坐标：J2000 赤道坐标（度）；星等/视大小为常用近似值。
 */
export const deepSkyCatalog: readonly DeepSkyObject[] = [
  {
    id: 'm31',
    name: '仙女座星系',
    messier: 'M31',
    type: 'galaxy',
    position: { rightAscension: 10.68, declination: 41.27 },
    magnitude: 3.4,
    sizeArcMin: 178,
    distanceLightYears: 2530000,
    description: '距离银河系最近的大型旋涡星系，肉眼可见的北天最亮星系，正与银河系缓慢靠近。',
  },
  {
    id: 'm42',
    name: '猎户座大星云',
    messier: 'M42',
    type: 'nebula',
    position: { rightAscension: 83.82, declination: -5.39 },
    magnitude: 4.0,
    sizeArcMin: 85,
    distanceLightYears: 1344,
    description: '猎户腰带下方肉眼可见的弥漫星云，恒星的诞生摇篮，孕育着四边形的年轻恒星群。',
  },
  {
    id: 'm45',
    name: '昴星团',
    messier: 'M45',
    type: 'cluster',
    position: { rightAscension: 56.87, declination: 24.12 },
    magnitude: 1.6,
    sizeArcMin: 110,
    distanceLightYears: 444,
    description: '又称七姐妹星团，北天最著名的疏散星团，蓝色年轻恒星周围缠绕着反射星云。',
  },
  {
    id: 'm13',
    name: '武仙座球状星团',
    messier: 'M13',
    type: 'cluster',
    position: { rightAscension: 250.42, declination: 36.46 },
    magnitude: 5.8,
    sizeArcMin: 20,
    distanceLightYears: 22180,
    description: '北天最壮观的球状星团，数十万颗老年恒星密集分布，望远镜下呈现璀璨星点海洋。',
  },
];
