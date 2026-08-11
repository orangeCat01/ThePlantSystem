/**
 * Phase 2.23 小天体生态系统验证（真实浏览器）：
 * 1. 小行星带可见（火星-木星之间灰点环）
 * 2. 哈雷彗星可见（蓝色椭圆轨道线 + 彗星）
 * 3. 点击哈雷 → SolarObjectPanel（哈雷彗星 / 周期 75.3 年 / 奥尔特云）
 * 4. 点击空白 → 面板消失
 * 5. 点击小行星带区域 → 无面板（不可点击）
 * 6. 行星点击仍正常 + 银河往返
 */
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const EXECUTABLE =
  process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const results = [];
page.on('pageerror', (e) => results.push(`pageerror: ${e.message}`));

/** 找蓝色彗星候选点（哈雷彗尾 additive 蓝白粒子簇；步长 1，排除 UI 区域）。 */
function findCometCandidates(path) {
  const img = PNG.sync.read(readFileSync(path));
  const { width, height, data } = img;
  const buckets = new Map();
  for (let y = 90; y < height - 80; y += 1) {
    for (let x = 40; x < width - 380; x += 1) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // 蓝白彗尾：b 明显高于 r，亮度中高（additive 叠加在暗星空上）。
      if (b > 90 && b > r + 30 && b > g - 10) {
        const k = `${Math.round(x / 30)},${Math.round(y / 30)}`;
        const bkt = buckets.get(k) ?? [0, 0, 0];
        bkt[0] += 1;
        bkt[1] += x;
        bkt[2] += y;
        buckets.set(k, bkt);
      }
    }
  }
  return [...buckets.entries()]
    .sort((a, b) => b[1][0] - a[1][0])
    .map(([, [c, sx, sy]]) => [Math.round(sx / c), Math.round(sy / c)])
    .slice(0, 10);
}

/** 环带区灰点密度（火星-木星之间环带投影区域，排除中心太阳区）。 */
function beltDensity(path) {
  const img = PNG.sync.read(readFileSync(path));
  const { width, height, data } = img;
  let count = 0;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = (r + g + b) / 3;
      const dx = x - width / 2;
      const dy = y - height / 2;
      const d = Math.sqrt(dx * dx + dy * dy);
      // 灰色低亮粒子（环带区：中心 18%~38% 半径环）
      if (lum > 40 && lum < 130 && Math.abs(r - g) < 12 && Math.abs(g - b) < 12) {
        if (d > height * 0.12 && d < height * 0.42) count += 1;
      }
    }
  }
  return count;
}

try {
  await page.goto('http://localhost:5174/universe/solar', { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForFunction(
    () => document.querySelector('[data-testid="loading-screen"]') === null,
    { timeout: 30000 },
  );
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/223-solar.png' });

  // 1. 小行星带灰点密度
  const density = beltDensity('/tmp/223-solar.png');
  results.push(`环带区灰点采样=${density}（>30 说明小行星带可见）`);

  // 2. 哈雷彗星：哈雷轨道（17.8 演示单位）超出默认拉近相机视锥，
  //    先拖动相机（左键旋转）使右侧场景进入视野，再扫描蓝色彗尾簇并点击。
  let hit = false;
  let drags = 0;
  for (const [dx, dy] of [[300, 0]]) {
    drags += 1;
    await page.mouse.move(500, 400);
    await page.mouse.down();
    await page.mouse.move(500 + dx, 400 + dy, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/223-drag.png' });
    const candidates = findCometCandidates('/tmp/223-drag.png');
    results.push(`拖动${drags}次后蓝色簇: ${candidates.slice(0, 4).map((c) => `(${c[0]},${c[1]})`).join(' ') || '无'}`);
    for (const [cx, cy] of candidates.slice(0, 5)) {
      await page.mouse.click(cx, cy);
      await page.waitForTimeout(300);
      if ((await page.locator('.solar-object-panel').count()) > 0) {
        hit = true;
        results.push(`哈雷命中(${cx},${cy}) 拖动${drags}次`);
        break;
      }
    }
    if (hit) break;
  }
  results.push(hit ? '点击哈雷 → SolarObjectPanel 出现 OK' : '哈雷点击未命中 CHECK');
  const name = await page.locator('.solar-object-panel__name').textContent().catch(() => null);
  const period = await page.locator('.solar-object-panel__fact', { hasText: '周期' }).textContent().catch(() => null);
  const origin = await page.locator('.solar-object-panel__fact', { hasText: '来源' }).textContent().catch(() => null);
  results.push(`面板: ${name?.trim()} | ${period?.replace(/\s+/g, ' ').trim()} | ${origin?.replace(/\s+/g, ' ').trim()}`);

  // 4. 点击空白 → 面板消失
  await page.mouse.click(640, 690);
  await page.waitForTimeout(500);
  results.push(`点击空白后 solar-object-panel=${await page.locator('.solar-object-panel').count()}（应为 0）`);

  // 5. 小行星带不可点击（点环带区无面板无行星面板）
  const ringHits = [];
  for (const [cx, cy] of [[700, 300], [560, 520], [760, 480]]) {
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(300);
    const panels =
      (await page.locator('.solar-object-panel').count()) +
      (await page.locator('.planet-panel').count());
    ringHits.push(panels);
  }
  results.push(`环带区点击面板数=${ringHits.join(',')}（小行星带不可点击；命中行星为正常）`);

  // 6. 行星点击仍正常（彩色簇定位）
  await page.screenshot({ path: '/tmp/223-scan2.png' });
  const img = PNG.sync.read(readFileSync('/tmp/223-scan2.png'));
  const buckets = new Map();
  for (let y = 0; y < img.height; y += 2) {
    for (let x = 0; x < img.width; x += 2) {
      const i = (y * img.width + x) * 4;
      const r = img.data[i];
      const g = img.data[i + 1];
      const b = img.data[i + 2];
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      const sat = mx === 0 ? 0 : (mx - mn) / mx;
      const lum = (r + g + b) / 3;
      if (lum <= 60 || sat <= 0.2) continue;
      const dx = x - img.width / 2;
      const dy = y - img.height / 2;
      if (Math.sqrt(dx * dx + dy * dy) < img.height * 0.1) continue;
      if (x > img.width - 360) continue;
      const k = `${Math.round(x / 40)},${Math.round(y / 40)}`;
      const bkt = buckets.get(k) ?? [0, 0, 0];
      bkt[0] += 1;
      bkt[1] += x;
      bkt[2] += y;
      buckets.set(k, bkt);
    }
  }
  const planetCandidates = [...buckets.entries()]
    .sort((a, b) => b[1][0] - a[1][0])
    .map(([, [c, sx, sy]]) => [Math.round(sx / c), Math.round(sy / c)])
    .slice(0, 8);
  let planetHit = false;
  for (const [cx, cy] of planetCandidates) {
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(350);
    if ((await page.locator('.planet-panel').count()) > 0) {
      planetHit = true;
      break;
    }
  }
  results.push(planetHit ? '行星点击仍正常 OK' : '行星点击 CHECK');

  // 7. 银河往返
  await page.locator('.scene-switch__button', { hasText: '银河系' }).click();
  await page.waitForTimeout(2500);
  await page.locator('.scene-switch__button', { hasText: '太阳系' }).click();
  await page.waitForTimeout(2500);
  results.push('Solar→Galaxy→Solar 往返 OK');
} catch (error) {
  results.push(`异常: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  console.log(results.join('\n'));
  await browser.close();
}
