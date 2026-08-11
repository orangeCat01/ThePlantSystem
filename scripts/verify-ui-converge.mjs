/**
 * Phase 2.20.2 收敛验证（真实浏览器）：
 * 1. 太阳系页面无星球名称标签（PlanetLabelManager 默认关闭 + Store 同步）
 * 2. 无搜索探索入口（ExplorationSearch / FavoritePanel 不挂载）
 * 3. 无观测环境入口（ObservationPanel / AstronomyEventPanel 不挂载）
 * 4. 正常功能保留（模拟控制 / 天文时间 / 行星面板 / 场景切换）
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

try {
  await page.goto('http://localhost:5174/universe/solar', { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForFunction(
    () => document.querySelector('[data-testid="loading-screen"]') === null,
    { timeout: 30000 },
  );
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/solar-no-labels.png' });
  results.push('截图已保存（/tmp/solar-no-labels.png，供人工确认无标签）');

  // 2. 搜索探索入口
  results.push(
    `搜索框(exploration-search)存在=${(await page.locator('.exploration-search').count()) > 0}`,
  );
  results.push(`收藏面板存在=${(await page.locator('.favorite-panel').count()) > 0}`);

  // 3. 观测环境入口
  results.push(
    `观测环境卡(overlay-toggle-observation)存在=${(await page.locator('[data-testid="overlay-toggle-observation"]').count()) > 0}`,
  );
  results.push(
    `观测环境面板(observation-panel)存在=${(await page.locator('.observation-panel').count()) > 0}`,
  );

  // 4. 正常功能保留
  results.push(
    `模拟控制卡存在=${(await page.locator('[data-testid="overlay-toggle-simulation"]').count()) > 0}`,
  );
  results.push(
    `天文时间卡存在=${(await page.locator('[data-testid="overlay-toggle-time"]').count()) > 0}`,
  );
  results.push(
    `天文时间面板(astronomy-time)存在=${(await page.locator('.astronomy-time').count()) > 0}`,
  );
  results.push(`场景切换按钮=${await page.locator('.scene-switch__button').count()}`);

  // 点击行星（选中验证行星面板仍工作；相机拉近后行星投影位置随公转任意变化，
  // 用截图彩色簇定位，以 planet-panel 出现为命中信号）。
  await page.screenshot({ path: '/tmp/conv-scan.png' });
  const img = PNG.sync.read(readFileSync('/tmp/conv-scan.png'));
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
  const candidates = [...buckets.entries()]
    .sort((a, b) => b[1][0] - a[1][0])
    .map(([, [c, sx, sy]]) => [Math.round(sx / c), Math.round(sy / c)])
    .slice(0, 10);
  let hit = false;
  for (const [cx, cy] of candidates) {
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(300);
    if ((await page.locator('.planet-panel').count()) > 0) {
      hit = true;
      break;
    }
  }
  await page.waitForTimeout(500);
  const planetPanel = await page.locator('.planet-panel').count();
  results.push(`行星面板出现=${planetPanel > 0 && hit}（点击场景后）`);

  // 切银河系仍正常
  await page.locator('.scene-switch__button', { hasText: '银河系' }).click();
  await page.waitForSelector('[data-testid="galaxy-panel"]', { timeout: 10000 });
  results.push('银河系切换正常（galaxy-panel 出现）');
} catch (error) {
  results.push(`异常: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  console.log(results.join('\n'));
  await browser.close();
}
