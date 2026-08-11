/**
 * Phase 2.22 探索界面悬浮层重构验证（真实浏览器）：
 * 1. 顶部 ExplorationHeader：56px 半透明、场景切换可用
 * 2. 右侧 Drawer：320px / right 20 / top 80，分组无重叠
 * 3. 天文时间模块已删除（无 astronomy-panel / 无 overlay-toggle-time）
 * 4. 天体信息动态：未选择不渲染；点击行星出现（进入动画）；点击空白消失
 * 5. 左下角帮助按钮（非中央）
 * 6. 太阳系视觉放大（亮像素占比提升）
 * 7. 银河切换正常
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

/** 亮像素占比。 */
function brightRatio(path) {
  const img = PNG.sync.read(readFileSync(path));
  const { width, height, data } = img;
  let bright = 0;
  let n = 0;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (lum > 90) bright += 1;
      n += 1;
    }
  }
  return bright / n;
}

/** 从截图找行星候选点（彩色簇，排除太阳中心区与右侧 Drawer 区）。 */
function findPlanetCandidates(path) {
  const img = PNG.sync.read(readFileSync(path));
  const { width, height, data } = img;
  const buckets = new Map();
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      const sat = mx === 0 ? 0 : (mx - mn) / mx;
      const lum = (r + g + b) / 3;
      if (lum <= 60 || sat <= 0.2) continue;
      const dx = x - width / 2;
      const dy = y - height / 2;
      if (Math.sqrt(dx * dx + dy * dy) < height * 0.1) continue;
      if (x > width - 360) continue;
      const k = `${Math.round(x / 40)},${Math.round(y / 40)}`;
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
    .slice(0, 10);
}

try {
  await page.goto('http://localhost:5174/universe/solar', { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForFunction(
    () => document.querySelector('[data-testid="loading-screen"]') === null,
    { timeout: 30000 },
  );
  await page.waitForTimeout(3000);

  // 1. ExplorationHeader
  const header = await page.locator('.exploration-header').boundingBox();
  results.push(`Header: y=${header?.y} h=${header?.height?.toFixed(0)}（应 56~64）`);
  const headerBg = await page
    .locator('.exploration-header')
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  results.push(`Header 背景=${headerBg}（半透明 rgba(5,10,25,0.55)）`);
  const headerButtons = await page.locator('.exploration-header .scene-switch__button').count();
  results.push(`Header 内场景切换按钮=${headerButtons}（应为 2）`);

  // 2. Drawer 320px / top 80 / right 20（场景信息/模拟控制默认隐藏，先恢复）
  await page.locator('[data-testid="drawer-restore-observation"]').click().catch(() => {});
  await page.locator('[data-testid="drawer-restore-simulation"]').click().catch(() => {});
  await page.waitForTimeout(300);
  const drawerBox = await page.locator('.right-drawer').boundingBox();
  results.push(
    `Drawer: x=${drawerBox?.x?.toFixed(0)} y=${drawerBox?.y?.toFixed(0)} w=${drawerBox?.width?.toFixed(0)}`,
  );
  results.push(
    drawerBox && drawerBox.width >= 310 && drawerBox.width <= 330 && drawerBox.y >= 76
      ? 'Drawer 320px / top 80 OK'
      : 'Drawer 定位 CHECK',
  );
  // 分组无重叠
  const boxes = await page.locator('.right-drawer .base-info-card').evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom };
    }),
  );
  let overlap = false;
  for (let i = 0; i < boxes.length - 1; i += 1) {
    if (boxes[i].bottom > boxes[i + 1].top + 1) overlap = true;
  }
  results.push(overlap ? '分组重叠 CHECK' : '分组无重叠 OK');

  // 3. 天文时间已删除
  const timeToggle = await page.locator('[data-testid="overlay-toggle-time"]').count();
  const astroPanel = await page.locator('.astronomy-panel').count();
  results.push(`天文时间入口：toggle=${timeToggle} 面板=${astroPanel}（应均为 0）`);

  // 4. 未选择：无 PlanetPanel
  const emptyPanel = await page.locator('.planet-panel').count();
  results.push(`未选择 planet-panel=${emptyPanel}（应为 0）`);

  // 5. 点击行星（彩色簇定位）→ 出现 + 动画类
  await page.screenshot({ path: '/tmp/222-scan.png' });
  const candidates = findPlanetCandidates('/tmp/222-scan.png');
  let hit = false;
  for (const [cx, cy] of candidates) {
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(350);
    if ((await page.locator('.planet-panel').count()) > 0) {
      hit = true;
      results.push(`行星命中(${cx},${cy})`);
      break;
    }
  }
  results.push(hit ? '点击行星 → PlanetPanel 出现 OK' : '行星点击未命中 CHECK');
  const panelTitle = await page.locator('.planet-panel__name').textContent().catch(() => null);
  results.push(`面板标题=${panelTitle?.trim()}`);

  // 6. 点击空白 → 消失（退出淡出）
  await page.mouse.click(640, 690);
  await page.waitForTimeout(500);
  const afterEmpty = await page.locator('.planet-panel').count();
  results.push(`点击空白后 planet-panel=${afterEmpty}（应为 0，退出淡出）`);

  // 7. 左下角帮助按钮（非中央）
  const helpBox = await page.locator('[data-testid="help-toggle"]').boundingBox();
  results.push(`帮助按钮 x=${helpBox?.x?.toFixed(0)}（<300 说明左下角）`);
  await page.locator('[data-testid="help-toggle"]').click();
  await page.waitForTimeout(300);
  results.push(`教学面板展开=${(await page.locator('.operation-guide').count()) > 0}`);
  await page.locator('[data-testid="help-toggle"]').click();

  // 8. 太阳系放大（旧基线 2.22%）
  await page.screenshot({ path: '/tmp/222-solar.png' });
  const ratio = brightRatio('/tmp/222-solar.png');
  results.push(`太阳系亮像素占比=${(ratio * 100).toFixed(2)}%（Phase 2.21 基线 2.22%，应更高）`);

  // 9. 银河切换
  await page.locator('.exploration-header .scene-switch__button', { hasText: '银河系' }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/222-galaxy.png' });
  const galaxyRatio = brightRatio('/tmp/222-galaxy.png');
  results.push(`银河亮像素占比=${(galaxyRatio * 100).toFixed(2)}%（粒子视觉）`);
  await page.locator('.exploration-header .scene-switch__button', { hasText: '太阳系' }).click();
  await page.waitForTimeout(2500);
  results.push('银河→太阳系 往返 OK');
} catch (error) {
  results.push(`异常: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  console.log(results.join('\n'));
  await browser.close();
}
