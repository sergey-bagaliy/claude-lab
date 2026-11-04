#!/usr/bin/env node
/*
 * Сборка видео multik.mp4 из HTML-анимации.
 *
 *   node render/render.js                 — собрать multik.mp4 (1920×1080, 30 к/с, со звуком)
 *   node render/render.js --still 19.5    — сохранить один кадр (секунда 19.5) в render/still-19.5.png
 *   node render/render.js --stills 2,10,20 — несколько кадров сразу
 *   node render/render.js --from 16 --to 22 --out test.mp4 — собрать кусочек
 *
 * Нужны: Node.js 18+, пакет playwright (с Chromium) и ffmpeg в PATH.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const music = require('../js/music.js');

const ROOT = path.resolve(__dirname, '..');
const FPS = 30;
const args = process.argv.slice(2);
const arg = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };

function writeWav(file, L, R, sr) {
  const n = L.length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(file, buf);
}

async function openPage() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => { console.error('Ошибка на странице:', e.message); process.exitCode = 1; });
  await page.goto('file://' + path.join(ROOT, 'index.html') + '?render=1');
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  return { browser, page };
}
const grab = (page, t, type) => page.evaluate(([t, type]) => {
  window.__drawFrame(t);
  return document.getElementById('c').toDataURL(type).split(',')[1];
}, [t, type]);

async function stills(list) {
  const { browser, page } = await openPage();
  for (const label of list) {
    const t = parseFloat(label);
    const file = path.join(__dirname, `still-${label}.png`);
    fs.writeFileSync(file, Buffer.from(await grab(page, t, 'image/png'), 'base64'));
    console.log('кадр', t, '→', path.relative(ROOT, file));
  }
  await browser.close();
}

async function video() {
  const duration = music.DURATION;
  const from = parseFloat(arg('--from', '0')), to = parseFloat(arg('--to', String(duration)));
  const out = path.resolve(ROOT, arg('--out', 'multik.mp4'));
  const tmp = path.join(__dirname, 'build');
  fs.mkdirSync(tmp, { recursive: true });

  console.log('1/3 Музыка…');
  const sr = 48000, snd = music.render(sr);
  const wav = path.join(tmp, 'music.wav');
  writeWav(wav, snd.L, snd.R, sr);

  console.log('2/3 Кадры → ffmpeg…');
  const { browser, page } = await openPage();
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-ss', String(from), '-t', String(to - from), '-i', wav,
    '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg код ' + c)))));

  const first = Math.round(from * FPS), last = Math.round(to * FPS);
  const t0 = Date.now();
  for (let f = first; f < last; f++) {
    const png = Buffer.from(await grab(page, f / FPS, 'image/png'), 'base64');
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
    if ((f - first) % 60 === 0) process.stdout.write(`   кадр ${f - first + 1}/${last - first} (${((Date.now() - t0) / 1000).toFixed(0)} с)\n`);
  }
  ff.stdin.end();
  await browser.close();
  await done;
  console.log('3/3 Готово:', path.relative(ROOT, out), (fs.statSync(out).size / 1048576).toFixed(1), 'МБ');
}

(async () => {
  if (args.includes('--still')) return stills([arg('--still')]);
  if (args.includes('--stills')) return stills(arg('--stills').split(','));
  return video();
})().catch((e) => { console.error(e); process.exit(1); });
