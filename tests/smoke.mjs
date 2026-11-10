// Browser smoke test for the SB Trading preview. Run: NODE_PATH=$(npm root -g) node tests/smoke.mjs
// Serves the repo root on a random local port, then checks desktop and phone in Chromium (software GL).
// Passes only if: no console errors, no external requests, no horizontal overflow, no AudioContext before the Sound press,
// inline form validation works (including quantity), focus lands on the product field after the product dialog, and
// the grove stops drawing when the visitor is still.
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let failures = 0;
const check = (ok, msg) => { console.log(ok ? 'ok  ' : 'FAIL', msg); if (!ok) failures++; };

for (const [name, viewport, touch] of [['desktop 1440', { width: 1440, height: 900 }, false], ['phone 390', { width: 390, height: 844 }, true]]) {
  const ctx = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
  await ctx.addInitScript(() => {
    window.__ac = 0; window.__draws = 0;
    const R = window.AudioContext; if (R) window.AudioContext = class extends R { constructor(...a) { super(...a); window.__ac++; } };
    for (const C of [WebGLRenderingContext, WebGL2RenderingContext]) for (const m of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) { const f = C.prototype[m]; if (f) C.prototype[m] = function (...a) { window.__draws++; return f.apply(this, a); }; }
  });
  const p = await ctx.newPage();
  const errors = [], external = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  p.on('request', (r) => { const u = r.url(); if (!u.startsWith(ORIGIN) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u); });
  await p.goto(ORIGIN + '/'); await p.waitForTimeout(3500);
  check((await p.evaluate(() => window.__ac)) === 0, `${name}: no AudioContext before the Sound press`);
  const go = async (id) => { await p.evaluate((i) => scrollTo(0, document.getElementById(i).offsetTop), id); await p.waitForTimeout(1500); };
  await go('materials');
  await p.click('#bamboo .product >> nth=0'); await p.waitForTimeout(400); await p.click('#sheetEnquire'); await p.waitForTimeout(1200);
  check((await p.evaluate(() => document.activeElement.id)) === 'f-product', `${name}: focus lands on the product field after the product dialog`);
  await p.fill('#f-qty', '-3'); await p.click('#enquiryForm button[type=submit]'); await p.waitForTimeout(500);
  check((await p.evaluate(() => document.querySelector('#e-quantity').textContent)).length > 0, `${name}: a negative quantity shows an inline error`);
  check((await p.evaluate(() => document.querySelectorAll('.err:not(:empty)').length)) >= 3, `${name}: empty required fields show inline errors`);
  check((await p.evaluate(() => document.getElementById('summary').textContent)) === '', `${name}: an invalid form prepares no summary`);
  check((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, `${name}: no horizontal overflow`);
  if (!touch) {
    await p.click('#soundToggle'); await p.waitForTimeout(1500);
    check((await p.evaluate(() => window.__ac)) === 1, `${name}: pressing Sound creates the audio context`);
    await p.evaluate(() => { const s = document.getElementById('grove'); scrollTo(0, s.offsetTop + (s.offsetHeight - innerHeight) * 0.4); });
    await p.waitForTimeout(5000);
    const a = await p.evaluate(() => window.__draws); await p.waitForTimeout(2000); const b = await p.evaluate(() => window.__draws);
    check(b === a, `${name}: the 3D grove draws nothing while the visitor is still (${b - a} draw calls)`);
  }
  check(errors.length === 0, `${name}: no console or page errors${errors.length ? ' - ' + errors.slice(0, 2).join(' | ') : ''}`);
  check(external.length === 0, `${name}: no external requests${external.length ? ' - ' + external.slice(0, 2).join(' | ') : ''}`);
  await ctx.close();
}
await browser.close(); server.close();
console.log(failures ? `\n${failures} failing` : '\nall passing');
process.exit(failures ? 1 : 0);
