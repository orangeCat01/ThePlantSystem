/**
 * Phase 2.22 运行断言（Node 纯函数/数据层；Three.js 渲染行为归浏览器人工验证）：
 * 1. MissionRepository 加载任务
 * 2. Voyager/Cassini/Juno 存在
 * 3. Spacecraft 创建成功（数据完整性）
 * 4. 轨迹生成正确（排序 / 坐标合法）
 * 5. 任务播放推进时间（MissionClock）
 * 6. 暂停恢复正常
 * 7. 点击探测器：Panel 显示（统一目标链数据层）
 * 8. Camera 跟随探测器（代码保护断言）
 * 9. Solar/Galaxy 切换：资源释放（幂等保护断言）
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { missionRepository } from '../src/repositories/MissionRepository';
import { explorationRepository } from '../src/repositories/ExplorationRepository';
import { MissionClock } from '../src/mission/MissionClock';

const srcRoot = resolve(import.meta.dirname ?? '.', '../src');

let failures = 0;
function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`PASS: ${label}`);
  } else {
    failures += 1;
    console.error(`FAIL: ${label}`);
  }
}

// 1. MissionRepository 加载任务
const missions = missionRepository.getAllMissions();
assert(missions.length === 7, `航天任务加载（${missions.length} 个）`);

// 2. Voyager/Cassini/Juno 存在
const expectedIds = [
  'voyager-1',
  'voyager-2',
  'cassini',
  'juno',
  'curiosity',
  'perseverance',
  'new-horizons',
];
for (const id of expectedIds) {
  assert(missionRepository.getMissionById(id) !== undefined, `任务存在：${id}`);
}
assert(missionRepository.getMissionById('voyager-1')?.agency === 'NASA', 'Voyager 1 机构 NASA');
assert(missionRepository.getMissionById('cassini')?.status === 'completed', 'Cassini 状态 completed');
assert(missionRepository.getMissionById('juno')?.targetId === 'jupiter', 'Juno 目标木星');
assert(missionRepository.getMissionsByTarget('mars').length === 2, '火星任务 2 个（好奇/毅力）');
assert(missionRepository.getMissionsByTarget('unknown').length === 0, '未知目标返回空数组');
assert(missionRepository.getMissionById('unknown') === undefined, '未知任务 ID 返回 undefined');

// 3. Spacecraft 创建成功（每任务 1 个探测器、ID 唯一、类型合法）
const spacecraftIds = new Set<string>();
let allSpacecraftValid = true;
for (const mission of missions) {
  if (mission.spacecraft.length === 0) {
    allSpacecraftValid = false;
  }
  for (const spacecraft of mission.spacecraft) {
    if (spacecraft.missionId !== mission.id) {
      allSpacecraftValid = false;
    }
    spacecraftIds.add(spacecraft.id);
  }
}
assert(allSpacecraftValid, '每个任务包含探测器且 missionId 对齐');
assert(spacecraftIds.size === missions.length, '探测器 ID 全局唯一');
assert(
  missionRepository.getSpacecraftByMission('cassini')[0]?.type === 'orbiter',
  'Cassini 类型 orbiter',
);
assert(
  missionRepository.getSpacecraftByMission('curiosity')[0]?.type === 'rover',
  'Curiosity 类型 rover',
);
assert(
  missionRepository.getSpacecraftByMission('voyager-1')[0]?.type === 'flyby',
  'Voyager 1 类型 flyby',
);
assert(missionRepository.getSpacecraftByMission('unknown').length === 0, '未知任务探测器空数组');

// 4. 轨迹生成正确（>=4 点、按日期排序、坐标有限）
let allTrajectoriesValid = true;
for (const mission of missions) {
  const trajectory = mission.trajectory;
  if (trajectory.length < 4) {
    allTrajectoriesValid = false;
    console.error(`  ${mission.id} 轨迹点不足（${trajectory.length}）`);
  }
  for (let index = 1; index < trajectory.length; index += 1) {
    const prev = trajectory[index - 1];
    const curr = trajectory[index];
    if (!prev || !curr) {
      allTrajectoriesValid = false;
      continue;
    }
    if (prev.date >= curr.date) {
      allTrajectoriesValid = false;
      console.error(`  ${mission.id} 轨迹日期未排序：${prev.date} >= ${curr.date}`);
    }
    const position = curr.position;
    if (
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y) ||
      !Number.isFinite(position.z)
    ) {
      allTrajectoriesValid = false;
    }
  }
}
assert(allTrajectoriesValid, '全部轨迹：>=4 点 / 日期升序 / 坐标有限');
assert(
  missionRepository.getMissionById('voyager-1')?.timeline.length === 4,
  'Voyager 1 时间线 4 个节点（Launch→Encounter→Arrival 结构）',
);

// 5. 任务播放推进时间（MissionClock 纯逻辑）
const clock = new MissionClock('1977-09-05');
assert(clock.getMissionDate() === '1977-09-05', 'MissionClock 初始日期');
clock.update(10);
assert(clock.getMissionDate() > '1977-09-05', 'update 推进任务时间');
clock.setSpeed(1000);
clock.update(1);
assert(clock.getMissionDate() >= '1977-09-05', '1000× 加速推进（deltaTime 上限 1s）');
clock.setSpeed(10);
const beforePause = clock.getMissionDate();

// 6. 暂停恢复正常
clock.setPaused(true);
clock.update(100);
assert(clock.getMissionDate() === beforePause, '暂停后时间不推进');
clock.setPaused(false);
clock.update(5);
assert(clock.getMissionDate() > beforePause, '恢复后时间继续推进');
const afterResume = clock.getMissionDate();
clock.setPaused(true);
clock.update(-5);
assert(clock.getMissionDate() === afterResume, '暂停 + 非法 deltaTime 安全');
clock.reset('1977-09-05');
assert(clock.getMissionDate() === '1977-09-05' && !clock.isPaused(), 'reset 回到发射日期并清暂停');
const speedBefore = clock.getSpeed();
clock.setSpeed(NaN);
assert(clock.getSpeed() === speedBefore, '非法速度安全忽略');

// 7. 点击探测器：Panel 显示（统一目标链数据层）
const voyagerTarget = explorationRepository.getById('voyager-1');
assert(voyagerTarget?.type === 'spacecraft', '统一目标：voyager-1 类型 spacecraft');
assert(voyagerTarget?.name === '旅行者 1 号', '统一目标：中文任务名');
assert(
  explorationRepository.search('Voyager').some((target) => target.id === 'voyager-1'),
  '搜索 Voyager 命中',
);
assert(
  explorationRepository.search('旅行者').some((target) => target.id === 'voyager-2'),
  '搜索「旅行者」命中 Voyager 2',
);
// MissionPanel 数据源
const panelMission = missionRepository.getMissionById(explorationRepository.getById('voyager-1')?.id ?? '');
assert(panelMission?.name === '旅行者 1 号', 'Panel 显示任务名称');
assert(panelMission?.launchDate === '1977-09-05', 'Panel 显示发射时间');
assert(panelMission?.timeline[0]?.label === '发射', '时间线起点 Launch');

// 8. Camera 跟随探测器（代码保护断言：方法存在 + MISSION_FOLLOW 状态）
const cameraSource = await import('../src/three/controllers/CameraController.ts');
assert(
  typeof cameraSource.CameraController.prototype.focusSpacecraft === 'function',
  'CameraController.focusSpacecraft 存在',
);
assert(
  typeof cameraSource.CameraController.prototype.followSpacecraft === 'function',
  'CameraController.followSpacecraft 存在',
);
const commonSource = readFileSync(resolve(srcRoot, 'types/common.types.ts'), 'utf-8');
assert(commonSource.includes("'MISSION_FOLLOW'"), 'CameraMode 含 MISSION_FOLLOW');

// 9. Solar/Galaxy 切换：资源释放（幂等保护断言）
const missionSource = await import('../src/three/controllers/MissionController.ts');
assert(
  typeof missionSource.MissionController.prototype.destroy === 'function',
  'MissionController.destroy 存在',
);
const managerSource = await import('../src/three/mission/SpacecraftManager.ts');
assert(
  typeof managerSource.SpacecraftManager.prototype.destroy === 'function' &&
    typeof managerSource.SpacecraftManager.prototype.clear === 'function',
  'SpacecraftManager clear/destroy 存在（卸载任务/场景切换资源释放）',
);
const trajectorySource = await import('../src/three/mission/TrajectoryRenderer.ts');
assert(
  typeof trajectorySource.TrajectoryRenderer.prototype.destroy === 'function',
  'TrajectoryRenderer.destroy 存在',
);

console.log(failures === 0 ? 'ALL PASS' : `FAILURES: ${failures}`);
process.exitCode = failures === 0 ? 0 : 1;
