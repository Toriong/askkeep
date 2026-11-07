/**
 * Records store screenshots and demo videos against the local mock Meet page.
 * The page is served as https://meet.google.com so the extension content script runs.
 * All on-screen names and notes are sample data.
 */

import { chromium } from 'playwright';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import sharp from 'sharp';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const mockHtml = fs.readFileSync(path.join(root, 'demo', 'fixtures', 'mock-meet.html'), 'utf8');
const screenshotDir = path.join(root, 'store-assets', 'screenshots');
const videoDir = path.join(root, 'store-assets', 'videos');
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'askkeep-profile-'));

fs.mkdirSync(screenshotDir, { recursive: true });
fs.mkdirSync(videoDir, { recursive: true });

const extensionArgs = [
  `--disable-extensions-except=${dist}`,
  `--load-extension=${dist}`,
  '--no-first-run',
  '--disable-default-apps',
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function launch(record) {
  return chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    acceptDownloads: true,
    recordVideo: record ? { dir: videoDir, size: { width: 1280, height: 800 } } : undefined,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: extensionArgs,
  });
}

async function closeExtras(context, keep) {
  for (const page of context.pages()) {
    if (page === keep) continue;
    const url = page.url();
    if (url.startsWith('chrome-extension://') && url.includes('onboarding')) {
      await page.close().catch(() => {});
    }
  }
}

async function extensionBase(context) {
  let worker = context.serviceWorkers()[0];
  if (!worker) {
    worker = await context.waitForEvent('serviceworker', { timeout: 20000 });
  }
  const url = new URL(worker.url());
  return `${url.protocol}//${url.host}`;
}

async function clearSession(context) {
  const worker = context.serviceWorkers()[0];
  if (!worker) return;
  await worker.evaluate(async () => {
    await chrome.storage.session.clear();
    await chrome.storage.local.clear();
  });
}

async function openMeet(page, full) {
  const url = full
    ? 'https://meet.google.com/sample-call?full=1'
    : 'https://meet.google.com/sample-call';
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  try {
    await page.getByText('Saved locally', { exact: true }).waitFor({ timeout: 15000 });
  } catch (error) {
    console.log('Meet page did not show the AskKeep chip.');
    console.log(page.url());
    throw error;
  }
}

async function revealNotes(page) {
  await page.evaluate(() => {
    for (const id of ['gemini-answer', 'action-items', 'talking-points']) {
      const el = document.getElementById(id);
      if (el) el.hidden = false;
    }
  });
  await page.getByText('Friday. Alex owns the checklist.', { exact: false }).waitFor();
}

async function savePng(page, filename) {
  const file = path.join(screenshotDir, filename);
  await page.screenshot({ path: file, type: 'png' });
  const meta = await sharp(file).metadata();
  if (meta.width !== 1280 || meta.height !== 800) {
    throw new Error(`${filename} is ${meta.width}x${meta.height}, expected 1280x800`);
  }
  console.log(filename);
}

async function saveVideo(page, context, filename) {
  const before = new Set(fs.readdirSync(videoDir));
  const video = page.video();
  await context.close();
  if (!video) throw new Error(`No video for ${filename}`);
  const recorded = await video.path();
  const target = path.join(videoDir, filename);
  fs.renameSync(recorded, target);
  for (const name of fs.readdirSync(videoDir)) {
    if (!before.has(name) && name !== filename && name.endsWith('.webm')) {
      fs.rmSync(path.join(videoDir, name), { force: true });
    }
  }
  const mp4 = target.replace(/\.webm$/, '.mp4');
  const ffmpeg = spawnSync('ffmpeg', ['-y', '-i', target, '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', mp4], {
    stdio: 'ignore',
  });
  if (ffmpeg.status === 0) console.log(path.basename(mp4));
  else console.log(`${filename} (webm only, ffmpeg unavailable)`);
}

async function main() {
  if (!fs.existsSync(path.join(dist, 'manifest.json')) || !fs.existsSync(path.join(dist, 'content-meet.js'))) {
    throw new Error('Build the extension first: npm run build');
  }

  const warmer = await launch(false);
  await extensionBase(warmer);
  await sleep(800);
  await warmer.close();

  const shots = await launch(false);
  const base = await extensionBase(shots);
  const page = shots.pages()[0] || (await shots.newPage());
  await page.route('https://meet.google.com/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: mockHtml });
  });
  page.on('pageerror', (error) => console.log('pageerror', error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') console.log('console', message.text());
  });

  await clearSession(shots);
  await openMeet(page, true);
  await closeExtras(shots, page);
  await sleep(400);
  await savePng(page, '1-saved-locally.png');

  await page.getByRole('button', { name: 'Preview' }).click();
  await page.locator('[aria-expanded="true"]').waitFor();
  await sleep(300);
  await savePng(page, '2-local-notepad.png');

  await page.getByRole('button', { name: 'Copy', exact: true }).click();
  await page.getByRole('button', { name: 'Copied' }).waitFor();
  await sleep(300);
  await savePng(page, '3-copy-download.png');

  await clearSession(shots);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('Saved locally', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Leave call' }).click();
  await page.getByRole('alertdialog').waitFor();
  await sleep(300);
  await savePng(page, '4-leave-confirm.png');

  const onboard = await shots.newPage();
  await onboard.setViewportSize({ width: 1280, height: 800 });
  await onboard.goto(`${base}/onboarding.html`, { waitUntil: 'domcontentloaded' });
  await onboard.getByRole('heading', { name: /Welcome to/ }).waitFor();
  await sleep(300);
  await savePng(onboard, '5-onboarding.png');
  await shots.close();

  await recordCapture();
  await recordExport();
  await recordLeave();
  for (const name of fs.readdirSync(videoDir)) {
    if (name.startsWith('page@')) fs.rmSync(path.join(videoDir, name), { force: true });
  }
  console.log('Store assets written.');
}

async function withMeet(run) {
  const context = await launch(true);
  const page = context.pages()[0] || (await context.newPage());
  await page.route('https://meet.google.com/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: mockHtml });
  });
  await clearSession(context);
  try {
    await run(page, context);
  } catch (error) {
    await context.close().catch(() => {});
    throw error;
  }
}

async function recordCapture() {
  await withMeet(async (page, context) => {
    await openMeet(page, false);
    await sleep(1600);
    await revealNotes(page);
    await sleep(1600);
    await page.getByRole('button', { name: 'Preview' }).click();
    await page.locator('[aria-expanded="true"]').waitFor();
    await sleep(1800);
    await saveVideo(page, context, '1-capture-ask-gemini.webm');
  });
}

async function recordExport() {
  await withMeet(async (page, context) => {
    await openMeet(page, true);
    await sleep(1200);
    await page.getByRole('button', { name: 'Copy', exact: true }).click();
    await page.getByRole('button', { name: 'Copied' }).waitFor();
    await sleep(1200);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download .md' }).click();
    const download = await downloadPromise;
    const saved = path.join(os.tmpdir(), download.suggestedFilename());
    await download.saveAs(saved);
    fs.rmSync(saved, { force: true });
    await sleep(1500);
    await saveVideo(page, context, '2-copy-download-md.webm');
  });
}

async function recordLeave() {
  await withMeet(async (page, context) => {
    await openMeet(page, true);
    await sleep(1000);
    await page.getByRole('button', { name: 'Leave call' }).click();
    await page.getByRole('alertdialog').waitFor();
    await sleep(1600);
    await page.getByRole('button', { name: 'Stay in the call' }).click();
    await sleep(1000);
    await page.getByRole('button', { name: 'Leave call' }).click();
    await page.getByRole('button', { name: 'Leave anyway' }).waitFor();
    await sleep(1400);
    await saveVideo(page, context, '3-leave-unsaved-confirm.webm');
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
