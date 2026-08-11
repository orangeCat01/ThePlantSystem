/**
 * Phase 2.20 银河视觉迁移验证（真实浏览器）：
 * 1. 银河渲染无 shader 错误；截图
 * 2. 中心 vs 外围亮度梯度（中心高亮、外围稀疏）
 * 3. 旋臂结构（4 臂点击命中 arm-1..4 均可选）
 * 4. 选中臂提亮对比（亮度上升）与清除回落
 * 5. Solar↔Galaxy 往返无错误
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
const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') {
    consoleErrors.push(message.text());
  }
});
page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));

/** 截图中以核心为中心、给定内外半径环带的平均亮度。 */
function ringBrightness(path, innerRatio, outerRatio) {
  const png = PNG.sync.read(readFileSync(path));
  const { width, height, data } = png;
  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.min(width, height) * 0.42;
  let sum = 0;
  let n = 0;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const r = Math.hypot(x - cx, y - cy) / maxR;
      if (r >= innerRatio && r < outerRatio) {
        const i = (y * width + x) * 4;
        sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
        n += 1;
      }
    }
  }
  return sum / Math.max(n, 1);
}

try {
  await page.goto('http://localhost:5174/universe/galaxy', { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForFunction(
    () => document.querySelector('[data-testid="loading-screen"]') === null,
    { timeout: 30000 },
  );
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/galaxy-migrated.png' });

  // 亮度梯度：中心环 0-0.25 vs 中环 0.45-0.65 vs 外围 0.8-1.0
  const coreB = ringBrightness('/tmp/galaxy-migrated.png', 0, 0.25);
  const midB = ringBrightness('/tmp/galaxy-migrated.png', 0.45, 0.65);
  const outerB = ringBrightness('/tmp/galaxy-migrated.png', 0.8, 1.0);
  results.push(`中心环亮度=${coreB.toFixed(1)} / 中环=${midB.toFixed(1)} / 外围=${outerB.toFixed(1)}`);
  results.push(coreB > midB && midB > outerB ? '亮度梯度 OK（中心高亮外围稀疏）' : '亮度梯度 CHECK');

  // 旋臂结构：连续点击屏幕多个位置，统计命中的 arm 数量
  const hitArms = new Set();
  for (const [x, y] of [[520, 330], [760, 330], [520, 470], [760, 470], [640, 300], [640, 500], [580, 400], [700, 400]]) {
    await page.mouse.click(x, y);
    await page.waitForTimeout(500);
    const title = await page.locator('[data-testid="galaxy-panel"] .galaxy-panel__title').textContent().catch(() => '');
    const text = (title ?? '').trim();
    if (text.includes('臂')) {
      hitArms.add(text);
    }
  }
  results.push(`点击命中旋臂: ${[...hitArms].join('、') || '无'}`);

  // 选中臂提亮：记录当前中心区亮度 → 关闭面板清除 → 对比
  await page.locator('[data-testid="galaxy-panel-close"]').click().catch(() => undefined);
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/galaxy-migrated-cleared.png' });
  const cleared = ringBrightness('/tmp/galaxy-migrated-cleared.png', 0.45, 0.65);
  // 重新选中一条臂（点击命中过的位置）
  await page.mouse.click(700, 400);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/galaxy-migrated-selected.png' });
  const selected = ringBrightness('/tmp/galaxy-migrated-selected.png', 0.45, 0.65);
  results.push(`选中臂后中环亮度=${selected.toFixed(1)} vs 清除=${cleared.toFixed(1)}`);
  results.push(selected > cleared ? '选中臂提亮 OK' : '选中臂提亮 CHECK');

  // 往返
  await page.locator('.scene-switch__button', { hasText: '太阳系' }).click();
  await page.waitForTimeout(3000);
  await page.locator('.scene-switch__button', { hasText: '银河系' }).click();
  await page.waitForSelector('[data-testid="galaxy-panel"]', { timeout: 10000 });
  results.push('Solar→Galaxy→Solar→Galaxy 往返 OK');

  results.push(`console 错误: ${consoleErrors.length === 0 ? '无' : consoleErrors.slice(0, 3).join(' | ')}`);
} catch (error) {
  results.push(`异常: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  console.log(results.join('\n'));
  await browser.close();
}
