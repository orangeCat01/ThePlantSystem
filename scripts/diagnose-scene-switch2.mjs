/**
 * 深度诊断：点击「银河系」后路由为何不变。
 * 记录：framenavigated / popstate / 点击前后 location / 原生 click 对比 /
 * 按钮 handler 是否存在（Vue 是否绑定）/ store 状态快照。
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
page.on('framenavigated', (frame) => {
  if (frame === page.mainFrame()) {
    events.push(`framenavigated -> ${frame.url()}`);
  }
});
page.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning') {
    events.push(`console[${message.type()}]: ${message.text()}`);
  }
});
page.on('pageerror', (error) => events.push(`pageerror: ${error.message}`));

try {
  await page.goto('http://localhost:5173/', { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForFunction(
    () => document.querySelector('[data-testid="loading-screen"]') === null,
    { timeout: 30000 },
  );
  await page.waitForTimeout(1000);
  events.push(`初始 pathname=${await page.evaluate(() => location.pathname)}`);

  // 方式1：playwright click
  events.push('--- playwright click 银河系 ---');
  await page.locator('.scene-switch__button', { hasText: '银河系' }).click({ timeout: 5000 });
  await page.waitForTimeout(1500);
  events.push(`playwright click 后 pathname=${await page.evaluate(() => location.pathname)}`);

  // 方式2：原生 click
  events.push('--- 原生 click 银河系 ---');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('.scene-switch__button'));
    const galaxy = buttons.find((b) => b.textContent?.includes('银河系'));
    if (galaxy) {
      galaxy.click();
    }
  });
  await page.waitForTimeout(1500);
  events.push(`原生 click 后 pathname=${await page.evaluate(() => location.pathname)}`);

  // 方式3：直接调用 router？先检查按钮绑定（Vue 事件是否挂上）
  const btnInfo = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('.scene-switch__button'));
    return buttons.map((b) => ({
      text: b.textContent?.trim(),
      disabled: b.disabled,
      className: b.className,
    }));
  });
  events.push(`按钮信息=${JSON.stringify(btnInfo)}`);

  // 方式4：检查全局错误与 pinia 状态（从页面内 window 拿不到，改为检查错误提示 DOM）
  events.push(`error-notice 数量=${await page.locator('.error-notice').count()}`);

  // 方式5：等待更久再确认
  await page.waitForTimeout(2000);
  events.push(`最终 pathname=${await page.evaluate(() => location.pathname)}`);
  events.push(`最终 URL=${page.url()}`);
} catch (error) {
  events.push(`异常: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  console.log(events.join('\n'));
  await browser.close();
}
