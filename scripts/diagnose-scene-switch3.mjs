/**
 * 深度诊断 3：点击银河系后验证「场景真的切换」。
 * 信号：GalaxyPanel（store.selectGalaxyObject('galaxy') 仅在 switchScene 成功后设置）、
 * loading-screen 是否卡住、canvas 截图对比。
 */
import { chromium } from 'playwright-core';

const EXECUTABLE =
  process.env.CHROME_PATH ??
  'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const events = [];
page.on('console', (message) => {
  if (message.type() === 'error') {
    events.push(`console.error: ${message.text()}`);
  }
});
page.on('pageerror', (error) => events.push(`pageerror: ${error.message}`));

try {
  await page.goto('http://localhost:5173/universe/solar', { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForFunction(
    () => document.querySelector('[data-testid="loading-screen"]') === null,
    { timeout: 30000 },
  );
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/before-solar.png' });
  events.push('太阳系截图完成');

  await page.locator('.scene-switch__button', { hasText: '银河系' }).click();
  events.push('已点击银河系');

  // 等待 GalaxyPanel 出现（switchScene 成功信号），最多 8s。
  try {
    await page.waitForSelector('[data-testid="galaxy-panel"]', { timeout: 8000 });
    events.push('GalaxyPanel 出现 → 场景切换成功');
  } catch {
    events.push('GalaxyPanel 未出现 → 场景切换失败');
  }

  // loading 是否卡住？
  events.push(`loading-screen 存在=${await page.locator('[data-testid="loading-screen"]').count() > 0}`);
  events.push(`error-notice 存在=${await page.locator('.error-notice').count() > 0}`);
  events.push(`URL=${page.url()}`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/after-galaxy.png' });
  events.push('银河系截图完成');
  // 再点回太阳系
  await page.locator('.scene-switch__button', { hasText: '太阳系' }).click();
  await page.waitForTimeout(4000);
  events.push(`返回后 URL=${page.url()}`);
  events.push(`返回后 loading-screen 存在=${await page.locator('[data-testid="loading-screen"]').count() > 0}`);
} catch (error) {
  events.push(`异常: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  console.log(events.join('\n'));
  await browser.close();
}
