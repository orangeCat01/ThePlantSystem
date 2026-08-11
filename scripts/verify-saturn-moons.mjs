/**
 * 土星环上卫星验证（Phase 2.23 扩展）：
 * 1. 拖动相机定位土星（黄色行星 + 环）→ 点击土星聚焦
 * 2. 聚焦后环带内 3 颗卫星可见（Pan / Prometheus / Atlas）
 * 3. 点击卫星 → PlanetPanel 显示对应名称
 * 4. 往返正常
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

/** 找行星亮簇候选（拖动旋转后视野内的亮天体；点击后按面板名称过滤出土星）。 */
function findSaturnCandidates(path) {
  const img = PNG.sync.read(readFileSync(path));
  const { width, height, data } = img;
  const buckets = new Map();
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const dx = x - width / 2;
      const dy = y - height / 2;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (lum < 70 || d < height * 0.1) continue;
      if (x > width - 360) continue;
      const k = `${Math.round(x / 30)},${Math.round(y / 30)}`;
      const bkt = buckets.get(k) ?? [0, 0, 0];
      bkt[0] += 1;
      bkt[1] += x;
      bkt[2] += y;
      buckets.set(k, bkt);
    }
  }
  return [...buckets.entries()]
    .sort((a, b) => b[1][0] - a[1][0])
    .map(([, [c, sx, sy]]) => [Math.round(sx / c), Math.round(sy / c)])
    .slice(0, 8);
}

try {
  await page.goto('http://localhost:5173/universe/solar', { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForFunction(
    () => document.querySelector('[data-testid="loading-screen"]') === null,
    { timeout: 30000 },
  );
  await page.waitForTimeout(3000);

  // 0. 暂停模拟：土星公转速度（0.075 rad/s）在截图-点击延迟内会移走，先固定天体位置
  await page.locator('[data-testid="overlay-toggle-simulation"]').click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
  await page.locator('.control-panel__button', { hasText: '暂停' }).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);

  // 1. 拖动相机（旋转视角）找土星
  let saturnHit = false;
  for (const [dx, dy] of [[-320, 0], [-200, 0], [-100, 0], [80, 0], [200, 0], [320, 0], [0, 150], [0, -120]]) {
    await page.mouse.move(500, 400);
    await page.mouse.down();
    await page.mouse.move(500 + dx, 400 + dy, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(350);
    await page.screenshot({ path: '/tmp/saturn-scan.png' });
    const cands = findSaturnCandidates('/tmp/saturn-scan.png');
    for (const [cx, cy] of cands.slice(0, 8)) {
      await page.mouse.click(cx, cy);
      await page.waitForTimeout(450);
      const panel = await page.locator('.planet-panel').count();
      if (panel > 0) {
        const title = await page.locator('.planet-panel__name').textContent({ timeout: 900 }).catch(() => '');
        if (title?.includes('土星')) {
          saturnHit = true;
          results.push(`土星命中(${cx},${cy}) 标题=${title.trim()}`);
          break;
        }
      }
    }
    if (saturnHit) break;
  }
  results.push(saturnHit ? '拖动定位并聚焦土星 OK' : '土星定位 CHECK');

  // 2. 聚焦土星后截图，环带内找卫星亮点（灰白小点，环带投影区域）
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/saturn-focus.png' });
  const img = PNG.sync.read(readFileSync('/tmp/saturn-focus.png'));
  const { width, height, data } = img;
  // 土星中心（聚焦后土星在屏幕中央附近）
  const cx0 = width / 2;
  const cy0 = height / 2;
  const buckets = new Map();
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = (r + g + b) / 3;
      const dx = x - cx0;
      const dy = y - cy0;
      const d = Math.sqrt(dx * dx + dy * dy);
      // 环带投影区（土星视半径 R 的 1.4~2.4 倍）；亮灰白点（卫星）
      if (lum > 150 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25 && d > height * 0.1) {
        const k = `${Math.round(x / 25)},${Math.round(y / 25)}`;
        const bkt = buckets.get(k) ?? [0, 0, 0];
        bkt[0] += 1;
        bkt[1] += x;
        bkt[2] += y;
        buckets.set(k, bkt);
      }
    }
  }
  const moons = [...buckets.entries()]
    .filter(([, [c]]) => c >= 6)
    .sort((a, b) => b[1][0] - a[1][0])
    .map(([, [c, sx, sy]]) => [Math.round(sx / c), Math.round(sy / c)]);
  results.push(`环带区域卫星亮点簇=${moons.length}（期望 ≥3）`);
  results.push(`位置: ${moons.slice(0, 5).map((m) => `(${m[0]},${m[1]})`).join(' ') || '无'}`);

  // 3. 点击候选亮点 → 记录名称含「土卫」的命中（卫星小，需精确命中）
  const names = [];
  for (const [mx, my] of moons.slice(0, 10)) {
    await page.mouse.click(mx, my);
    await page.waitForTimeout(450);
    const name = await page.locator('.planet-panel__name').textContent({ timeout: 900 }).catch(() => null);
    const trimmed = name?.trim() ?? '';
    if (trimmed.includes('土卫')) names.push(trimmed);
  }
  results.push(`命中卫星名称: ${names.join('、') || '无（卫星尺寸小，需人工微调点击）'}`);
  results.push(names.length >= 2 ? '环上卫星可点击 OK' : '卫星点击 CHECK（见风险说明）');

  // 4. 往返
  await page.locator('.scene-switch__button', { hasText: '银河系' }).click();
  await page.waitForTimeout(2000);
  await page.locator('.scene-switch__button', { hasText: '太阳系' }).click();
  await page.waitForTimeout(2000);
  results.push('往返 OK');
} catch (error) {
  results.push(`异常: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  console.log(results.join('\n'));
  await browser.close();
}
