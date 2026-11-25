/**
 * Record the local portfolio with Playwright, then export an MP4 with FFmpeg.
 * Start the site first: npm run dev -- --host 127.0.0.1
 * Run: node scripts/record-portfolio-demo.cjs
 * Requires playwright and a browser (Microsoft Edge is used on Windows).
 * Optional: DEMO_URL, BROWSER_CHANNEL, PLAYWRIGHT_BROWSERS_PATH, FFMPEG_PATH.
 * FFmpeg may be on PATH or in .tmp/demo-tools/node_modules/@ffmpeg-installer/win32-x64.
 * No application source, live data, or browser preferences are modified.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const { existsSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const localBrowsers = path.join(root, '.tmp', 'playwright');
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(localBrowsers)) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = localBrowsers;
}
const { chromium } = require('playwright');
const baseURL = process.env.DEMO_URL || 'http://127.0.0.1:5173';
const output = path.join(root, 'output', 'portfolio-demo');
const raw = path.join(root, '.tmp', 'portfolio-demo-recording');
const size = { width: 1920, height: 1080 };

(async () => {
  await fs.mkdir(output, { recursive: true });
  await fs.mkdir(raw, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined)
  });
  const context = await browser.newContext({
    viewport: size, deviceScaleFactor: 1,
    recordVideo: { dir: raw, size },
    reducedMotion: 'no-preference', colorScheme: 'dark'
  });
  // Playwright videos omit the OS cursor. This recording-only pointer makes
  // the real mouse movements and clicks legible without changing the site.
  await context.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const pointer = document.createElement('div');
      pointer.setAttribute('aria-hidden', 'true');
      pointer.style.cssText = 'position:fixed;left:-50px;top:-50px;width:16px;height:16px;margin:-8px;border:1.5px solid #f4e6dc;border-radius:50%;background:#18181855;box-shadow:0 0 0 2px #18181844;pointer-events:none;z-index:2147483647;transition:width .14s,height .14s,margin .14s,background .14s';
      document.documentElement.append(pointer);
      window.addEventListener('pointermove', e => {
        pointer.style.left = `${e.clientX}px`;
        pointer.style.top = `${e.clientY}px`;
      }, { passive: true });
      window.addEventListener('pointerdown', () => {
        pointer.style.width = pointer.style.height = '26px';
        pointer.style.margin = '-13px';
        pointer.style.background = '#00aaff55';
      });
      window.addEventListener('pointerup', () => {
        pointer.style.width = pointer.style.height = '16px';
        pointer.style.margin = '-8px';
        pointer.style.background = '#18181855';
      });
    });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const chapters = [];
  const start = Date.now();
  const mark = title => {
    const seconds = +((Date.now() - start) / 1000).toFixed(2);
    chapters.push({ seconds, title });
    console.log(`${seconds.toFixed(1)}s ${title}`);
  };
  const pause = ms => page.waitForTimeout(ms);
  let mouse = { x: 25, y: 1020 };
  async function move(x, y, duration = 900) {
    const from = { ...mouse };
    const steps = Math.max(1, Math.round(duration / 25));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const ease = t * t * (3 - 2 * t);
      await page.mouse.move(from.x + (x - from.x) * ease, from.y + (y - from.y) * ease);
      await pause(duration / steps);
    }
    mouse = { x, y };
  }
  async function target(locator, click = true) {
    await locator.waitFor({ state: 'visible' });
    const box = await locator.boundingBox();
    if (!box) throw new Error('Demo target has no visible bounds');
    await move(box.x + box.width / 2, box.y + box.height / 2);
    await pause(250);
    if (click) await page.mouse.click(mouse.x, mouse.y, { delay: 110 });
  }
  async function panel(name) {
    await target(page.getByRole('navigation', { name: 'Film panels', exact: true }).getByRole('button', { name, exact: true }));
    await pause(2300);
  }
  async function shot(name) {
    await page.screenshot({ path: path.join(raw, `${name}.png`) });
  }
  let videoPath;
  try {
    mark('Opening / signature animation');
    const home = await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (!home.ok()) throw new Error(`Home returned ${home.status()}`);
    await page.locator('.s-loader').waitFor({ state: 'detached', timeout: 25000 });
    await pause(2600);
    mark('Interactive letter wall');
    await move(450, 310, 1200);
    await move(1400, 690, 2000);
    await move(760, 520, 1600);
    await pause(1200);
    await page.screenshot({ path: path.join(output, 'portfolio-demo-poster.png') });
    mark('Handwritten navigation');
    await target(page.locator('.catmenu'));
    await pause(2000);
    await target(page.getByRole('link', { name: 'Films', exact: true }));
    await page.waitForURL('**/movies', { timeout: 180000 });
    await page.getByRole('button', { name: 'Disc & abacus', exact: true }).waitFor();
    mark('Film title / watching totals');
    await page.waitForFunction(() => !document.querySelector('.summary')?.classList.contains('pending'), null, { timeout: 30000 });
    await pause(2200);
    await shot('film-title');
    mark('3D disc case / watched-film abacus');
    await panel('Disc & abacus');
    const stage = page.locator('.stage[role="slider"]');
    await stage.locator('canvas').waitFor({ state: 'visible', timeout: 30000 });
    await pause(1800);
    await target(stage);
    await pause(1800);
    await target(stage, false);
    await page.mouse.down();
    await move(mouse.x + 105, mouse.y - 28, 1600);
    await page.mouse.up();
    await pause(1300);
    await shot('open-disc');
    await stage.press('Home');
    await pause(600);
    await target(stage);
    await pause(1000);
    const beads = page.locator('.bead-link');
    const beadCount = await beads.count();
    if (beadCount < 2) throw new Error('Film abacus has too few beads for the walkthrough');
    await target(beads.nth(Math.min(4, beadCount - 1)));
    await pause(1800);
    await shot('disc-abacus');
    mark('Release decades / director visualization');
    await panel('Decades & directors');
    await pause(1700);
    await target(page.getByRole('button', { name: 'Show director names', exact: true }));
    await pause(1300);
    const decade = page.locator('.decades .column').last();
    await target(decade);
    await pause(1700);
    await shot('decades-directors');
    await target(page.getByRole('button', { name: '← All decades', exact: true }));
    await pause(900);
    mark('World map / country filter');
    await panel('World map');
    await pause(1500);
    // Hover by the accessible name, which is derived from the actual film data.
    const country = page.locator('.world-map [role="button"][aria-label^="India:"]').first();
    if (await country.count()) await target(country, false);
    await pause(1000);
    await target(page.locator('.country-leaders button').filter({ hasText: 'India' }).first());
    await pause(1900);
    await shot('world-map');
    await target(page.getByRole('button', { name: 'Clear country ×', exact: true }));
    await pause(800);
    mark('Searchable film collection');
    await panel('The list');
    await pause(1200);
    await shot('film-list');
    const query = (await page.locator('.collection .index .title').first().innerText()).split(/[\s:]+/)[0];
    const search = page.getByRole('searchbox', { name: 'Find a title' });
    await target(search);
    await search.pressSequentially(query, { delay: 180 });
    await pause(1700);
    await shot('search');
    await search.fill('');
    await pause(1500);
    mark('Closing / letter wall');
    // The browser's Back action follows the original home → Films navigation.
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.waitForURL(baseURL + '/');
    await page.locator('.midpanel').waitFor({ state: 'visible' });
    await pause(2400);
    await move(1350, 470, 1800);
    await move(880, 500, 1300);
    await pause(2200);
    if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
    videoPath = await page.video().path();
  } finally {
    await context.close();
    await browser.close();
  }
  const localFFmpeg = path.join(root, '.tmp/demo-tools/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe');
  const ffmpeg = process.env.FFMPEG_PATH || (existsSync(localFFmpeg) ? localFFmpeg : 'ffmpeg');
  const destination = path.join(output, 'ozprey-portfolio-demo.mp4');
  const result = spawnSync(ffmpeg, [
    '-y', '-i', videoPath, '-an', '-c:v', 'libx264', '-preset', 'medium',
    '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    '-vf', 'fade=t=in:st=0:d=0.35', destination
  ], { encoding: 'utf8', windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
  if (result.status !== 0) {
    await fs.copyFile(videoPath, path.join(output, 'ozprey-portfolio-demo.webm'));
    throw new Error(`MP4 conversion failed; WebM retained. ${result.error?.message || result.stderr?.slice(-1500)}`);
  }
  await fs.writeFile(path.join(output, 'chapters.json'), JSON.stringify({
    viewport: size, audio: false, url: baseURL, chapters, browserErrors: errors
  }, null, 2) + '\n');
  console.log(`Saved ${destination}`);
})().catch(error => { console.error(error); process.exitCode = 1; });
