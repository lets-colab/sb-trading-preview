// Sound is on by default, with Sound to switch it off (the owner, 18 Nov 2026). Browsers allow audio only after the
// visitor's first click, tap or key, so the Sound button shows on from the start and the score begins at that first
// gesture. Switching Sound off is remembered: on the next visit it stays off until the visitor turns it back on.
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png' };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let failures = 0;
const check = (ok, msg) => { console.log(ok ? 'ok  ' : 'FAIL', msg); if (!ok) failures++; };

for (const [name, viewport, touch] of [['desktop', { width: 1440, height: 900 }, false], ['phone', { width: 390, height: 844 }, true]]) {
  const ctx = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
  await ctx.addInitScript(() => { window.__ac = 0; const R = window.AudioContext; if (R) window.AudioContext = class extends R { constructor(...a) { super(...a); window.__ac++; } }; });
  const p = await ctx.newPage();
  const state = () => p.evaluate(() => ({ pressed: document.getElementById('soundToggle').getAttribute('aria-pressed'), ac: window.__ac, score: document.documentElement.dataset.score }));
  await p.goto(ORIGIN + '/'); await p.waitForTimeout(1500);
  const fresh = await state();
  check(fresh.pressed === 'true' && fresh.ac === 0, `${name}: on a first visit Sound shows on, and no audio starts before the visitor's first gesture (${JSON.stringify(fresh)})`);
  await p.keyboard.press('Tab'); // the visitor's first gesture: any key, click or tap
  const started = await p.waitForFunction(() => document.documentElement.dataset.score === 'playing', null, { timeout: 8000 }).then(() => true, () => false);
  const first = await state();
  check(started && first.ac === 1 && first.pressed === 'true', `${name}: the first gesture starts the sound, with no press of Sound (${JSON.stringify(first)})`);
  await p.click('#soundToggle'); await p.waitForTimeout(800);
  const off = await state();
  check(off.pressed === 'false' && off.score === 'off', `${name}: pressing Sound switches it off (${JSON.stringify(off)})`);
  await p.reload(); await p.waitForTimeout(1500);
  await p.keyboard.press('Tab'); await p.waitForTimeout(1200);
  const back = await state();
  check(back.pressed === 'false' && back.ac === 0 && back.score === 'off', `${name}: switched off, it stays off on the next visit, through the visitor's gestures (${JSON.stringify(back)})`);
  await p.click('#soundToggle');
  const again = await p.waitForFunction(() => document.documentElement.dataset.score === 'playing', null, { timeout: 8000 }).then(() => true, () => false);
  check(again && (await state()).pressed === 'true', `${name}: pressing Sound turns it back on`);
  await ctx.close();
}
await browser.close(); server.close();
console.log(failures ? `\n${failures} failing` : '\nall passing');
process.exit(failures ? 1 : 0);
