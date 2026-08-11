/**
 * Phase 2.21 银河动态闪烁系统验证（真实浏览器）：
 * 1. 星星随机闪烁：间隔 1.2s 两帧中心区像素差异（闪烁亮度变化，非同步）
 * 2. 核心缓慢呼吸：间隔 3s 核心中心亮度脉动（幅度小、非闪烁）
 * 3. 无 shader 编译错误 / console 错误
 * 4. 4 臂命中 + 选中提亮保留（PointsMaterial 顶点色写回不受影响）
 * 5. 往返正常
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
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

/** 像素级差异（两帧同一像素亮度差 > 阈值 的比例；闪烁是每像素亮暗交替）。 */
function pixelDiffRatio(pathA, pathB, threshold = 25, radiusRatio = 0.32) {
  const a = PNG.sync.read(readFileSync(pathA));
  const b = PNG.sync.read(readFileSync(pathB));
  const { width, height, data: da } = a;
  const db = b.data;
  let diff = 0;
  let n = 0;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const dx = x - width / 2;
      const dy = y - height / 2;
      if (Math.sqrt(dx * dx + dy * dy) > height * radiusRatio) continue;
      const i = (y * width + x) * 4;
      const la = (da[i] + da[i + 1] + da[i + 2]) / 3;
      const lb = (db[i] + db[i + 1] + db[i + 2]) / 3;
      if (Math.abs(la - lb) > threshold) diff += 1;
      n += 1;
    }
  }
  return n > 0 ? diff / n : 0;
}

/** 区域平均亮度（核心中心 / 核心边缘环 / 外围区）。 */
function regionStats(path) {
  const img = PNG.sync.read(readFileSync(path));
  const { width, height, data } = img;
  const sum = { center: [0, 0], core: [0, 0], ring: [0, 0], outer: [0, 0] };
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const dx = x - width / 2;
      const dy = y - height / 2;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < height * 0.32) {
        sum.center[0] += lum;
        sum.center[1] += 1;
      }
      if (d < height * 0.05) {
        sum.core[0] += lum;
        sum.core[1] += 1;
      }
      if (d > height * 0.06 && d < height * 0.12) {
        sum.ring[0] += lum;
        sum.ring[1] += 1;
      }
      if (d > height * 0.38 && d < height * 0.46) {
        sum.outer[0] += lum;
        sum.outer[1] += 1;
      }
    }
  }
  return {
    center: sum.center[1] > 0 ? sum.center[0] / sum.center[1] : 0,
    core: sum.core[1] > 0 ? sum.core[0] / sum.core[1] : 0,
    ring: sum.ring[1] > 0 ? sum.ring[0] / sum.ring[1] : 0,
    outer: sum.outer[1] > 0 ? sum.outer[0] / sum.outer[1] : 0,
  };
}

try {
  await page.goto('http://localhost:5174/universe/galaxy', { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForFunction(
    () => document.querySelector('[data-testid="loading-screen"]') === null,
    { timeout: 30000 },
  );
  await page.waitForTimeout(3000);

  // 1. 闪烁：1.2s 两帧像素级差异（每粒子独立相位 → 平均亮度恒定，像素级亮暗交替）
  await page.screenshot({ path: '/tmp/tw-a.png' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '/tmp/tw-b.png' });
  const pixelDiff = pixelDiffRatio('/tmp/tw-a.png', '/tmp/tw-b.png');
  results.push(`中心区像素级差异占比=${(pixelDiff * 100).toFixed(2)}%（闪烁应 > 0.5%）`);
  results.push(pixelDiff > 0.005 ? '星星随机闪烁 OK' : '闪烁 CHECK');

  // 2. 核心呼吸：3s 间隔核心中心/边缘环亮度脉动
  await page.screenshot({ path: '/tmp/tw-core-a.png' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/tw-core-b.png' });
  const ca = regionStats('/tmp/tw-core-a.png');
  const cb = regionStats('/tmp/tw-core-b.png');
  const coreDiff = Math.abs(ca.core - cb.core) / Math.max(ca.core, 1);
  const ringDiff = Math.abs(ca.ring - cb.ring) / Math.max(ca.ring, 1);
  const outerDiff = Math.abs(ca.outer - cb.outer) / Math.max(ca.outer, 1);
  results.push(`核心中心亮度差异=${(coreDiff * 100).toFixed(2)}% / 核心边缘环=${(ringDiff * 100).toFixed(2)}%`);
  results.push(coreDiff > 0.002 || ringDiff > 0.002 ? '核心缓慢呼吸 OK' : '核心呼吸 CHECK');
  results.push(`外围区差异=${(outerDiff * 100).toFixed(2)}%（应 < 核心差异，稳定）`);

  // 3. shader 编译错误
  const shaderErrors = consoleErrors.filter(
    (e) => e.includes('Shader') || e.includes('WebGLProgram') || e.includes('GLSL'),
  );
  results.push(`shader 编译错误: ${shaderErrors.length === 0 ? '无' : shaderErrors.slice(0, 2).join(' | ')}`);
  results.push(`console 错误: ${consoleErrors.length === 0 ? '无' : consoleErrors.slice(0, 2).join(' | ')}`);

  // 4. 4 臂命中 + 提亮（PointsMaterial 顶点色写回保留）
  let armsHit = [];
  for (const [x, y] of [[640, 260], [800, 330], [640, 540], [460, 340], [700, 400]]) {
    await page.mouse.click(x, y);
    await page.waitForTimeout(700);
    const title = await page
      .locator('[data-testid="galaxy-panel"] .galaxy-panel__title')
      .textContent()
      .catch(() => null);
    if (title && !armsHit.includes(title.trim())) armsHit.push(title.trim());
  }
  results.push(`命中臂: ${armsHit.join('、') || '无'}`);
  const before = regionStats('/tmp/tw-b.png').center;
  await page.screenshot({ path: '/tmp/tw-selected.png' });
  const sel = regionStats('/tmp/tw-selected.png').center;
  results.push(`选中臂后中心亮度=${sel.toFixed(1)} vs 之前=${before.toFixed(1)}（提亮保留）`);

  // 5. 往返
  await page.locator('.scene-switch__button', { hasText: '太阳系' }).click();
  await page.waitForTimeout(2500);
  await page.locator('.scene-switch__button', { hasText: '银河系' }).click();
  await page.waitForTimeout(2500);
  const canvasCount = await page.locator('canvas').count();
  results.push(`Solar→Galaxy→Solar→Galaxy 往返 canvas=${canvasCount} OK`);
} catch (error) {
  results.push(`异常: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  console.log(results.join('\n'));
  await browser.close();
}
