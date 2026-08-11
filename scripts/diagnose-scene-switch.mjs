/**
 * 真实浏览器验证：太阳系/银河系场景切换（Phase 2.20.1 诊断）。
 * 使用系统 Chrome/Edge（playwright-core + executablePath）。
 * 流程：
 *  1. 启动页面，等待太阳系加载（canvas + 场景就绪）
 *  2. 点击「银河系」按钮
 *  3. 采集：URL、console 错误、页面错误、按钮状态、canvas 数量、场景标题
 *  4. 再点击「太阳系」验证往返
 */
import { chromium } from 'playwright-core';

const EXECUTABLE =
  process.env.CHROME_PATH ??
  'C:/Program Files/Google/Chrome/Application/chrome.exe';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173/';

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const consoleErrors = [];
const pageErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') {
    consoleErrors.push(message.text());
  }
});
page.on('pageerror', (error) => {
  pageErrors.push(error.message);
});

const report = {};
try {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  report['初始URL'] = page.url();

  // 等待太阳系初始化完成（LoadingScreen 消失 + canvas 出现）。
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForFunction(
    () => {
      const loading = document.querySelector('[data-testid="loading-screen"]');
      return loading === null;
    },
    { timeout: 30000 },
  );
  report['太阳系加载完成'] = true;
  report['canvas数量'] = await page.locator('canvas').count();

  // 场景按钮存在性。
  const galaxyButton = page.locator('.scene-switch__button', { hasText: '银河系' });
  report['银河系按钮存在'] = (await galaxyButton.count()) > 0;
  report['银河系按钮disabled'] = await galaxyButton.isDisabled().catch(() => 'n/a');

  // 点击银河系。
  await galaxyButton.click({ timeout: 5000 });
  report['点击后URL'] = page.url();
  await page.waitForTimeout(4000);
  report['点击后canvas数量'] = await page.locator('canvas').count();

  // 检查页面是否有错误提示条。
  const errorNotice = await page.locator('.error-notice').count();
  report['错误提示条数量'] = errorNotice;

  // 点击太阳系（往返）。
  const solarButton = page.locator('.scene-switch__button', { hasText: '太阳系' });
  await solarButton.click({ timeout: 5000 });
  await page.waitForTimeout(4000);
  report['返回后URL'] = page.url();
  report['返回后canvas数量'] = await page.locator('canvas').count();
} catch (error) {
  report['执行异常'] = error instanceof Error ? error.message : String(error);
} finally {
  report['console错误'] = consoleErrors.slice(0, 6);
  report['page错误'] = pageErrors.slice(0, 6);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}
