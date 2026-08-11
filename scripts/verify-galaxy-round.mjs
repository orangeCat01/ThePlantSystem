/**
 * 银河粒子圆形验证：
 * 1. 打开银河场景截图
 * 2. pngjs 像素分析：找亮点，计算圆度（圆形 ≈ π/4 ≈ 0.785，方形 ≈ 1.0）
 * 3. 输出多个亮点的圆度均值
 */
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const EXECUTABLE =
  process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

try {
  await page.goto('http://localhost:5173/universe/galaxy', { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForFunction(
    () => document.querySelector('[data-testid="loading-screen"]') === null,
    { timeout: 30000 },
  );
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/galaxy-round.png' });

  const png = PNG.sync.read(readFileSync('/tmp/galaxy-round.png'));
  const { width, height, data } = png;

  // 采样区域：中心带（避开左右 Overlay 卡片与底部 UI），找孤立亮点。
  const x0 = Math.floor(width * 0.33);
  const x1 = Math.floor(width * 0.67);
  const y0 = Math.floor(height * 0.2);
  const y1 = Math.floor(height * 0.85);

  // 亮点：亮度 > 阈值（银河粒子为蓝白点，避开暗背景与 UI 文字区域）。
  const points = [];
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const brightness = (r + g + b) / 3;
      if (brightness > 60) {
        points.push({ x, y, brightness });
      }
    }
  }

  // 连通域：对亮点做简单聚类（网格 3x3 邻近合并），计算每簇包围盒与面积比。
  const visited = new Set();
  const clusters = [];
  for (const point of points) {
    const key = `${point.x},${point.y}`;
    if (visited.has(key)) continue;
    // BFS 邻域合并
    const queue = [point];
    visited.add(key);
    let minX = point.x, maxX = point.x, minY = point.y, maxY = point.y;
    let count = 0;
    while (queue.length > 0) {
      const current = queue.shift();
      count += 1;
      minX = Math.min(minX, current.x);
      maxX = Math.max(maxX, current.x);
      minY = Math.min(minY, current.y);
      maxY = Math.max(maxY, current.y);
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          const nx = current.x + dx;
          const ny = current.y + dy;
          if (nx < x0 || nx > x1 || ny < y0 || ny > y1) continue;
          const nkey = `${nx},${ny}`;
          if (visited.has(nkey)) continue;
          const nidx = (ny * width + nx) * 4;
          if ((data[nidx] + data[nidx + 1] + data[nidx + 2]) / 3 > 60) {
            visited.add(nkey);
            queue.push({ x: nx, y: ny });
          }
        }
      }
    }
    if (count >= 2 && count <= 40) {
      clusters.push({ count, minX, maxX, minY, maxY });
    }
  }

  // 圆度 = 簇面积 / 包围盒面积（圆形≈0.785；方形≈1.0）
  const roundness = clusters.map((c) => {
    const boxArea = (c.maxX - c.minX + 1) * (c.maxY - c.minY + 1);
    return c.count / boxArea;
  });
  roundness.sort((a, b) => a - b);
  const median = roundness[Math.floor(roundness.length / 2)] ?? 0;
  const mean = roundness.reduce((s, v) => s + v, 0) / Math.max(roundness.length, 1);

  console.log(`亮点簇数量: ${clusters.length}`);
  console.log(`圆度 中位数: ${median.toFixed(3)}（圆形≈0.785，方形≈1.0）`);
  console.log(`圆度 均值: ${mean.toFixed(3)}`);
  console.log(
    median < 0.9
      ? 'RESULT: PASS（粒子为圆形）'
      : 'RESULT: CHECK（可能仍接近方形，需人工确认截图）',
  );
} finally {
  await browser.close();
}
