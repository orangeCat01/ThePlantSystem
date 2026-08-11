import type { SpaceMission } from '@/types/mission.types';

/**
 * 航天任务目录（Phase 2.22）。
 *
 * 每个任务包含：任务信息 / 探测器 / 目标天体 / 时间线 / 轨迹。
 * 轨迹坐标为场景演示坐标（视觉空间，非真实天文距离；按日期排序）。
 * 任务时间线：Launch → Encounter → Arrival（或入轨/着陆/大终章）。
 */
export const spaceMissions: readonly SpaceMission[] = [
  {
    id: 'voyager-1',
    name: '旅行者 1 号',
    agency: 'NASA',
    targetId: 'jupiter',
    launchDate: '1977-09-05',
    status: 'active',
    description:
      '人类飞得最远的人造探测器，先后飞掠木星与土星，2012 年穿越日球层顶进入星际空间，携带金唱片向宇宙问候。',
    spacecraft: [
      {
        id: 'voyager-1',
        missionId: 'voyager-1',
        name: 'Voyager 1',
        type: 'flyby',
      },
    ],
    timeline: [
      { date: '1977-09-05', label: '发射' },
      { date: '1979-03-05', label: '木星飞掠' },
      { date: '1980-11-12', label: '土星飞掠' },
      { date: '2012-08-25', label: '进入星际空间' },
    ],
    trajectory: [
      { date: '1977-09-05', position: { x: 14, y: 1, z: 2 }, event: '发射' },
      { date: '1979-03-05', position: { x: 27, y: 2, z: 6 }, event: '木星飞掠' },
      { date: '1980-11-12', position: { x: 22, y: 3, z: 4 }, event: '土星飞掠' },
      { date: '1990-02-14', position: { x: 32, y: 6, z: 12 }, event: '暗淡蓝点' },
      { date: '2012-08-25', position: { x: 55, y: 14, z: 28 }, event: '日球层顶穿越' },
      { date: '2026-01-01', position: { x: 78, y: 22, z: 44 } },
    ],
  },
  {
    id: 'voyager-2',
    name: '旅行者 2 号',
    agency: 'NASA',
    targetId: 'neptune',
    launchDate: '1977-08-20',
    status: 'active',
    description:
      '唯一造访过天王星与海王星的探测器，也是目前唯一同时探测四颗气态巨行星的航天器，正飞向星际空间。',
    spacecraft: [
      {
        id: 'voyager-2',
        missionId: 'voyager-2',
        name: 'Voyager 2',
        type: 'flyby',
      },
    ],
    timeline: [
      { date: '1977-08-20', label: '发射' },
      { date: '1979-07-09', label: '木星飞掠' },
      { date: '1981-08-25', label: '土星飞掠' },
      { date: '1986-01-24', label: '天王星飞掠' },
      { date: '1989-08-25', label: '海王星飞掠' },
    ],
    trajectory: [
      { date: '1977-08-20', position: { x: 14, y: 1, z: 0 }, event: '发射' },
      { date: '1979-07-09', position: { x: 27, y: -2, z: 5 }, event: '木星飞掠' },
      { date: '1981-08-25', position: { x: 23, y: 4, z: 7 }, event: '土星飞掠' },
      { date: '1986-01-24', position: { x: 33, y: 8, z: 15 }, event: '天王星飞掠' },
      { date: '1989-08-25', position: { x: 39, y: 12, z: 20 }, event: '海王星飞掠' },
      { date: '2026-01-01', position: { x: 60, y: 20, z: 36 } },
    ],
  },
  {
    id: 'cassini',
    name: '卡西尼号',
    agency: 'NASA/ESA',
    targetId: 'saturn',
    launchDate: '1997-10-15',
    status: 'completed',
    description:
      '环绕土星 13 年的旗舰探测器，释放惠更斯号登陆土卫六，最终以「大终章」冲入土星大气结束传奇任务。',
    spacecraft: [
      {
        id: 'cassini',
        missionId: 'cassini',
        name: 'Cassini',
        type: 'orbiter',
      },
    ],
    timeline: [
      { date: '1997-10-15', label: '发射' },
      { date: '2004-07-01', label: '土星入轨' },
      { date: '2005-01-14', label: '惠更斯号登陆土卫六' },
      { date: '2017-09-15', label: '大终章坠入土星' },
    ],
    trajectory: [
      { date: '1997-10-15', position: { x: 14, y: 0, z: 1 }, event: '发射' },
      { date: '2004-07-01', position: { x: 22, y: 1, z: 3 }, event: '土星入轨' },
      { date: '2008-01-01', position: { x: 20, y: 0, z: 3 }, event: '环缝穿越' },
      { date: '2015-01-01', position: { x: 21, y: 0, z: 4 } },
      { date: '2017-09-15', position: { x: 19, y: 0, z: 4 }, event: '大终章' },
    ],
  },
  {
    id: 'juno',
    name: '朱诺号',
    agency: 'NASA',
    targetId: 'jupiter',
    launchDate: '2011-08-05',
    status: 'active',
    description:
      '极轨道木星探测器，首次窥探木星云层之下的大气结构与极区气旋，不断刷新对这颗巨行星的认识。',
    spacecraft: [
      {
        id: 'juno',
        missionId: 'juno',
        name: 'Juno',
        type: 'orbiter',
      },
    ],
    timeline: [
      { date: '2011-08-05', label: '发射' },
      { date: '2016-07-04', label: '木星入轨' },
      { date: '2017-02-01', label: '首个近木点探测' },
      { date: '2026-01-01', label: '延长任务运行中' },
    ],
    trajectory: [
      { date: '2011-08-05', position: { x: 14, y: 0, z: 0 }, event: '发射' },
      { date: '2016-07-04', position: { x: 29, y: 1, z: 4 }, event: '木星入轨' },
      { date: '2021-06-07', position: { x: 27, y: 3, z: 5 }, event: '木星近点' },
      { date: '2026-01-01', position: { x: 28, y: 2, z: 4 } },
    ],
  },
  {
    id: 'curiosity',
    name: '好奇号火星车',
    agency: 'NASA',
    targetId: 'mars',
    launchDate: '2011-11-26',
    status: 'active',
    description:
      '在盖尔陨石坑探索 10 年以上的核动力火星车，发现火星曾存在宜居水环境，是火星探测的中坚力量。',
    spacecraft: [
      {
        id: 'curiosity',
        missionId: 'curiosity',
        name: 'Curiosity',
        type: 'rover',
      },
    ],
    timeline: [
      { date: '2011-11-26', label: '发射' },
      { date: '2012-08-06', label: '盖尔陨石坑着陆' },
      { date: '2014-09-24', label: '抵达夏普山' },
      { date: '2026-01-01', label: '持续探测中' },
    ],
    trajectory: [
      { date: '2011-11-26', position: { x: 14, y: 0, z: 1 }, event: '发射' },
      { date: '2012-08-06', position: { x: 18, y: 0, z: 2 }, event: '着陆' },
      { date: '2015-01-01', position: { x: 18, y: 0, z: 2 }, event: '夏普山探测' },
      { date: '2026-01-01', position: { x: 18, y: 0, z: 2 }, event: '持续探测' },
    ],
  },
  {
    id: 'perseverance',
    name: '毅力号火星车',
    agency: 'NASA',
    targetId: 'mars',
    launchDate: '2020-07-30',
    status: 'active',
    description:
      '在杰泽罗陨石坑搜寻远古生命痕迹的首辆采样火星车，并搭载了人类首架火星直升机机智号。',
    spacecraft: [
      {
        id: 'perseverance',
        missionId: 'perseverance',
        name: 'Perseverance',
        type: 'rover',
      },
    ],
    timeline: [
      { date: '2020-07-30', label: '发射' },
      { date: '2021-02-18', label: '杰泽罗陨石坑着陆' },
      { date: '2021-04-19', label: '机智号首飞' },
      { date: '2026-01-01', label: '采样任务进行中' },
    ],
    trajectory: [
      { date: '2020-07-30', position: { x: 14, y: 0, z: 0 }, event: '发射' },
      { date: '2021-02-18', position: { x: 18, y: 0, z: 3 }, event: '着陆' },
      { date: '2024-01-01', position: { x: 18, y: 0, z: 3 }, event: '三角洲探测' },
      { date: '2026-01-01', position: { x: 18, y: 0, z: 3 } },
    ],
  },
  {
    id: 'new-horizons',
    name: '新视野号',
    agency: 'NASA',
    // 真实目标为冥王星；太阳系目录未含冥王星，演示目标对齐最近的海王星。
    targetId: 'neptune',
    launchDate: '2006-01-19',
    status: 'active',
    description:
      '史上最快离开地球的探测器，2015 年飞掠冥王星并传回惊人影像，2019 年再探柯伊伯带小天体。',
    spacecraft: [
      {
        id: 'new-horizons',
        missionId: 'new-horizons',
        name: 'New Horizons',
        type: 'flyby',
      },
    ],
    timeline: [
      { date: '2006-01-19', label: '发射' },
      { date: '2015-07-14', label: '冥王星飞掠' },
      { date: '2019-01-01', label: '阿罗科斯飞掠' },
      { date: '2026-01-01', label: '柯伊伯带巡航' },
    ],
    trajectory: [
      { date: '2006-01-19', position: { x: 14, y: 0, z: 1 }, event: '发射' },
      { date: '2015-07-14', position: { x: 42, y: 5, z: 18 }, event: '冥王星飞掠' },
      { date: '2019-01-01', position: { x: 46, y: 6, z: 21 }, event: '阿罗科斯飞掠' },
      { date: '2026-01-01', position: { x: 54, y: 8, z: 26 } },
    ],
  },
];
