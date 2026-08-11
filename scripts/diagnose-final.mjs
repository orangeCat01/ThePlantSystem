/**
 * 最终验证：刷新太阳系页 + 银河系点击核心交互（Phase 2.20.1 修复确认）。
 */
import { chromium } from 'playwright-core';

const EXECUTABLE =
  process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const events = [];
page.on('pageerror', (error) => events.push(`pageerror: ${error.message}`));

try {
  // 1. 刷新太阳系页
  await page.goto('http://localhost:5173/universe/solar', { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForFunction(
    () => document.querySelector('[data-testid="loading-screen"]') === null,
    { timeout: 30000 },
  );
  await page.waitForTimeout(800);
  events.push(`刷新太阳系 → pathname=${await page.evaluate(() => location.pathname)}`);
  const solarActive = await page
    .locator('.scene-switch__button--active')
    .textContent()
    .catch(() => '');
  events.push(`刷新太阳系 → 激活按钮=${solarActive?.trim()}`);

  // 2. 切银河系
  await page.locator('.scene-switch__button', { hasText: '银河系' }).click();
  await page.waitForSelector('[data-testid="galaxy-panel"]', { timeout: 10000 });
  const panelTitle = await page.locator('[data-testid="galaxy-panel"] .galaxy-panel__title').textContent();
  events.push(`银河面板标题=${panelTitle?.trim()}`);

  // 3. 点击银河中心（场景中心投影 → 屏幕中心）
  await page.mouse.click(640, 400);
  await page.waitForTimeout(1500);
  const panelTitleAfter = await page.locator('[data-testid="galaxy-panel"] .galaxy-panel__title').textContent();
  events.push(`点击中心后面板标题=${panelTitleAfter?.trim()}`);
  const desc = await page.locator('[data-testid="galaxy-object-desc"]').count();
  events.push(`对象详情出现=${desc > 0}`);
} catch (error) {
  events.push(`异常: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  console.log(events.join('\n'));
  await browser.close();
}
