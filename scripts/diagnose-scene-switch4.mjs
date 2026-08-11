/**
 * 高强度诊断 4：
 *  A) 从 '/' 打开后「立即」点击银河系（不等加载完成，模拟用户急性子）
 *  B) Solar→Galaxy 往返 5 次，统计失败
 *  C) 刷新 /universe/galaxy 页面（初始场景是 solar 的边界）
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
page.on('console', (message) => {
  if (message.type() === 'error') {
    events.push(`console.error: ${message.text()}`);
  }
});
page.on('pageerror', (error) => events.push(`pageerror: ${error.message}`));

try {
  // A) 立即点击：打开 '/' 后不等加载，直接尝试点银河系
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(200);
  const immediateDisabled = await page
    .locator('.scene-switch__button', { hasText: '银河系' })
    .isDisabled()
    .catch(() => 'n/a');
  events.push(`A) 立即点击时银河系按钮 disabled=${immediateDisabled}`);
  await page.locator('.scene-switch__button', { hasText: '银河系' }).click({ timeout: 3000 }).catch(() => {
    events.push('A) 立即点击抛错（按钮未就绪）');
  });
  await page.waitForTimeout(1000);
  events.push(`A) 立即点击后 pathname=${await page.evaluate(() => location.pathname)}`);
  // 等加载完成后再点一次（若第一次没生效）
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForFunction(
    () => document.querySelector('[data-testid="loading-screen"]') === null,
    { timeout: 30000 },
  );
  await page.waitForTimeout(500);
  if ((await page.evaluate(() => location.pathname)) !== '/universe/galaxy') {
    await page.locator('.scene-switch__button', { hasText: '银河系' }).click();
    await page.waitForTimeout(3000);
    events.push(`A) 加载完成后点击 → pathname=${await page.evaluate(() => location.pathname)}`);
  } else {
    events.push('A) 立即点击已生效');
  }

  // B) 往返 5 次
  let failures = 0;
  for (let round = 1; round <= 5; round += 1) {
    const target = round % 2 === 1 ? '太阳系' : '银河系';
    const targetPath = round % 2 === 1 ? '/universe/solar' : '/universe/galaxy';
    await page.locator('.scene-switch__button', { hasText: target }).click();
    await page.waitForTimeout(2500);
    const path = await page.evaluate(() => location.pathname);
    const ok = path === targetPath;
    if (!ok) failures += 1;
    events.push(`B) 第${round}次 → ${target} → ${path} ${ok ? 'OK' : 'FAIL'}`);
  }
  events.push(`B) 往返 5 次失败数=${failures}`);

  // C) 刷新 /universe/galaxy
  await page.goto('http://localhost:5173/universe/galaxy', { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(5000);
  const galaxyPanel = await page.locator('[data-testid="galaxy-panel"]').count();
  events.push(`C) 刷新银河系页 → galaxy-panel=${galaxyPanel} pathname=${await page.evaluate(() => location.pathname)}`);
  events.push(`C) loading-screen=${await page.locator('[data-testid="loading-screen"]').count()}`);
} catch (error) {
  events.push(`异常: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  console.log(events.join('\n'));
  await browser.close();
}
