/**
 * Phase 2.20.2 浏览器验证：
 * 1. 太阳系：控制卡默认收起；未选中无天体信息卡；背景更克制（截图）
 * 2. 银河系：粒子分层（截图 + 像素亮度分布）；选中臂提亮（像素亮度对比）
 * 3. 场景切换正常
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
page.on('pageerror', (error) => results.push(`pageerror: ${error.message}`));

function centerBrightness(path) {
  const png = PNG.sync.read(readFileSync(path));
  const { width, height, data } = png;
  let sum = 0;
  let n = 0;
  for (let y = Math.floor(height * 0.2); y < Math.floor(height * 0.85); y += 2) {
    for (let x = Math.floor(width * 0.33); x < Math.floor(width * 0.67); x += 2) {
      const i = (y * width + x) * 4;
      sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
      n += 1;
    }
  }
  return sum / Math.max(n, 1);
}

try {
  // ===== 太阳系 =====
  await page.goto('http://localhost:5174/universe/solar', { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForFunction(
    () => document.querySelector('[data-testid="loading-screen"]') === null,
    { timeout: 30000 },
  );
  await page.waitForTimeout(1500);
  results.push('--- 太阳系 ---');
  results.push(
    `模拟控制卡展开=${(await page.locator('[data-testid="overlay-toggle-simulation"]').count()) > 0 ? (await page.locator('.base-info-card').first().evaluate((el) => !el.classList.contains('base-info-card--collapsed'))) : '无卡'}`,
  );
  results.push(
    `观察模式卡展开=${await page.locator('[data-testid="overlay-toggle-mode"]').count() > 0 ? '有' : '无'}`,
  );
  const planetPanelCount = await page.locator('.planet-panel').count();
  results.push(`未选择时天体信息卡数量=${planetPanelCount}（应为 0）`);
  await page.screenshot({ path: '/tmp/solar-202.png' });

  // ===== 银河系 =====
  await page.locator('.scene-switch__button', { hasText: '银河系' }).click();
  await page.waitForSelector('[data-testid="galaxy-panel"]', { timeout: 10000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/galaxy-202-before.png' });
  const before = centerBrightness('/tmp/galaxy-202-before.png');
  results.push('--- 银河系 ---');
  results.push(`未选中时中心区平均亮度=${before.toFixed(2)}`);

  // 点击中心右侧一点选中旋臂（尝试 x=700, y=400 区域点击几次找臂）
  // 用高亮定位：直接点屏幕中心偏右（旋臂经过）
  await page.mouse.click(760, 400);
  await page.waitForTimeout(1200);
  const title = await page.locator('[data-testid="galaxy-panel"] .galaxy-panel__title').textContent();
  results.push(`点击后面板标题=${title?.trim()}`);
  await page.screenshot({ path: '/tmp/galaxy-202-selected.png' });
  const after = centerBrightness('/tmp/galaxy-202-selected.png');
  results.push(`选中臂后中心区平均亮度=${after.toFixed(2)}（应高于未选中）`);

  // 关闭面板 → 提亮清除
  await page.locator('[data-testid="galaxy-panel-close"]').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/galaxy-202-cleared.png' });
  const cleared = centerBrightness('/tmp/galaxy-202-cleared.png');
  results.push(`清除后中心区平均亮度=${cleared.toFixed(2)}（应回落）`);

  // 场景往返
  await page.locator('.scene-switch__button', { hasText: '太阳系' }).click();
  await page.waitForTimeout(3000);
  results.push(`返回太阳系 URL=${page.url()}`);
  results.push(`返回后银河面板=${await page.locator('[data-testid="galaxy-panel"]').count()}`);
} catch (error) {
  results.push(`异常: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  console.log(results.join('\n'));
  await browser.close();
}
