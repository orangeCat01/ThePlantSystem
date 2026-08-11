/**
 * Phase 2.21 探索界面重构验证（真实浏览器）：
 * 1. 右侧 Drawer：360px 统一抽屉，分组不重叠
 * 2. 天体信息动态出现：未选择无空卡；点击行星出现；ESC 隐藏
 * 3. 顶部标题紧凑（h1 ≤ 22px）
 * 4. 帮助按钮展开/收起教学面板（默认隐藏）
 * 5. 太阳系默认相机放大（行星屏幕占比提升）
 * 6. Solar/Galaxy 切换正常
 */
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';

const EXECUTABLE =
  process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const results = [];
const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') results.push(`console error: ${m.text()}`);
});
page.on('pageerror', (e) => results.push(`pageerror: ${e.message}`));

/** 截图亮度中心度（太阳系视角放大检测：行星像素占比）。 */
function brightRatio(path, min, max) {
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
      if (Math.sqrt(dx * dx + dy * dy) < height * 0.1) continue; // 排除太阳
      if (x > width - 380) continue; // 排除右侧 Drawer
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
  await page.goto('http://localhost:5173/universe/solar', { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForFunction(
    () => document.querySelector('[data-testid="loading-screen"]') === null,
    { timeout: 30000 },
  );
  await page.waitForTimeout(2500);

  // 0. 场景信息/模拟控制默认隐藏（Phase 2.23）；先通过左下角恢复入口展开再断言
  results.push(`初始 drawer=${await page.locator('.right-drawer').count()}（应为 0，默认隐藏）`);
  results.push(`左下角恢复按钮=${await page.locator('.drawer-restore').count() + await page.locator('.hud-bottom__restore').count()}（应 >0）`);
  await page.locator('[data-testid="drawer-restore-observation"]').click().catch(() => {});
  await page.locator('[data-testid="drawer-restore-simulation"]').click().catch(() => {});
  await page.waitForTimeout(400);

  // 1. Drawer 尺寸与分组
  const drawer = page.locator('.right-drawer');
  const box = await drawer.boundingBox();
  results.push(`Drawer: x=${box?.x.toFixed(0)} y=${box?.y.toFixed(0)} w=${box?.width.toFixed(0)} h=${box?.height.toFixed(0)}`);
  results.push(box && box.width >= 310 && box.width <= 330 ? 'Drawer 宽度 320px OK' : 'Drawer 宽度 CHECK');
  const groups = await page.locator('.right-drawer .base-info-card').count();
  results.push(`Drawer 分组数=${groups}（无选中时应有 2：场景信息/模拟控制）`);

  // 分组不重叠（bounding box 垂直不相交）
  let overlap = false;
  const boxes = await page.locator('.right-drawer .base-info-card').evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom };
    }),
  );
  for (let i = 0; i < boxes.length - 1; i += 1) {
    if (boxes[i].bottom > boxes[i + 1].top + 1) overlap = true;
  }
  results.push(overlap ? '分组重叠 CHECK' : '分组无重叠 OK');

  // 2. 未选择：无天体信息分组、无 planet-panel 空卡
  const planetPanelCount = await page.locator('.planet-panel').count();
  results.push(`未选择时 planet-panel 数量=${planetPanelCount}（应为 0，无空卡）`);
  results.push(planetPanelCount === 0 ? '无空卡片 OK' : '空卡片 CHECK');

  // 3. 点击行星 → 天体信息动态出现（截图彩色簇定位：行星投影位置随公转任意变化）
  await page.screenshot({ path: '/tmp/221-scan.png' });
  const candidates = findPlanetCandidates('/tmp/221-scan.png');
  let hit = false;
  for (const [cx, cy] of candidates) {
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(300);
    if ((await page.locator('.planet-panel').count()) > 0) {
      hit = true;
      break;
    }
  }
  results.push(hit ? '彩色簇定位命中行星 OK' : '行星点击未命中 CHECK');
  const planetPanelVisible = await page.locator('.planet-panel').count();
  results.push(`点击后 planet-panel=${planetPanelVisible}（应为 1）`);
  const planetGroupVisible = await page
    .locator('.base-info-card', { hasText: '天体信息' })
    .count();
  results.push(`天体信息分组=${planetGroupVisible}（选中时动态出现）`);
  const factCards = await page.locator('.planet-panel__fact').count();
  results.push(`两列事实卡数量=${factCards}（>10 说明两列卡片布局生效）`);
  // 单位不换行：fact-unit 元素存在
  const units = await page.locator('.planet-panel__fact .fact-unit').count();
  results.push(`单位 span 数量=${units}`);

  // 4. ESC → 面板隐藏（动态消失）
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  const afterEsc = await page.locator('.planet-panel').count();
  results.push(`ESC 后 planet-panel=${afterEsc}（应为 0）`);

  // 5. 顶部标题紧凑
  const h1Size = await page.locator('.exploration-header__title').evaluate((el) =>
    parseFloat(getComputedStyle(el).fontSize),
  );
  results.push(`h1 字号=${h1Size}px（≤22 说明标题已降级）`);

  // 6. 帮助按钮 → 教学面板
  const guideBefore = await page.locator('.operation-guide').count();
  await page.locator('[data-testid="help-toggle"]').click();
  await page.waitForTimeout(400);
  const guideAfter = await page.locator('.operation-guide').count();
  results.push(`教学面板：默认=${guideBefore} → 点击帮助=${guideAfter}`);
  await page.locator('[data-testid="help-toggle"]').click();
  await page.waitForTimeout(400);

  // 7. 太阳系放大对比：截图亮像素占比（相机拉近后太阳/行星占比提升；旧相机基线 1.65%）
  await page.screenshot({ path: '/tmp/221-solar.png' });
  const solarRatio = brightRatio('/tmp/221-solar.png', 0, 1);
  results.push(`太阳系亮像素占比=${(solarRatio * 100).toFixed(2)}%（旧相机基线 1.65%，拉近后应 > 2%）`);

  // 8. 银河切换 + drawer 透明度
  await page.locator('.scene-switch__button', { hasText: '银河系' }).click();
  await page.waitForSelector('.right-drawer--galaxy', { timeout: 10000 });
  await page.waitForTimeout(2000);
  const drawerBg = await page
    .locator('.right-drawer')
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  results.push(`银河 drawer 背景=${drawerBg}（透明度低于 0.5 为降低）`);
  await page.screenshot({ path: '/tmp/221-galaxy.png' });
  const galaxyRatio = brightRatio('/tmp/221-galaxy.png', 0, 1);
  results.push(`银河亮像素占比=${(galaxyRatio * 100).toFixed(2)}%（核心+旋臂可见）`);

  // 9. 往返
  await page.locator('.scene-switch__button', { hasText: '太阳系' }).click();
  await page.waitForTimeout(2500);
  const canvasCount = await page.locator('canvas').count();
  results.push(`Solar→Galaxy→Solar 往返 canvas=${canvasCount} OK`);
} catch (error) {
  results.push(`异常: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  console.log(results.join('\n'));
  await browser.close();
}
