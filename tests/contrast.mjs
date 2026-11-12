// Caption contrast for every film beat, desktop 1440 and phone 390. Run: npm test.
// Scrolls to each beat's midpoint, makes the heading text transparent (the beat's own scrim stays), screenshots the area under each heading and compares the heading
// colour against the 95th-percentile background luminance (the brightest footage behind the text, not an average).
// Fails below 4.5:1, the normal-text WCAG AA ratio, so captions stay readable even over the brightest frames.
import { createRequire } from 'node:module'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = { '.html':'text/html','.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png' };
const server = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((r) => server.listen(0, '127.0.0.1', r)); const O = `http://127.0.0.1:${server.address().port}`;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
let failures = 0;
for (const [name, vp, mobile] of [['desktop', { width: 1440, height: 900 }, false], ['phone', { width: 390, height: 844 }, true]]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile });
  const p = await ctx.newPage();
  await p.goto(O + '/', { waitUntil: 'load' }); await p.waitForTimeout(2500);

  const beats = await p.evaluate(() => [...document.querySelectorAll('#film .beat')].map((b) => ({ at: b.dataset.at.split(',').map(Number), text: b.querySelector('h2,h1')?.textContent.trim() })));
  for (const bt of beats) {
    const mid = (bt.at[0] + Math.min(1, bt.at[1])) / 2;
    await p.evaluate((x) => { const f = document.getElementById('film'); scrollTo(0, f.offsetTop + (f.offsetHeight - innerHeight) * x); }, mid);
    // the film eases toward the scroll position; measure only once this beat is fully shown
    const shown = await p.waitForFunction((t) => { const h = [...document.querySelectorAll('#film .beat h1, #film .beat h2')].find((e) => e.textContent.trim() === t);
      return parseFloat(getComputedStyle(h.closest('.beat')).opacity) >= 0.98; }, bt.text, { timeout: 20000 }).then(() => true, () => false);
    if (!shown) { failures++; console.log(`FAIL ${name}: caption "${bt.text}" never became fully visible at its own scroll position`); continue; }
    await p.waitForTimeout(400);
    const box = await p.evaluate((t) => { const h = [...document.querySelectorAll('#film .beat h1, #film .beat h2')].find((e) => e.textContent.trim() === t); const r = h.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, color: getComputedStyle(h).color, op: getComputedStyle(h.closest('.beat')).opacity }; }, bt.text);
    await p.addStyleTag({ content: '#film .beat h1,#film .beat h2,#film .beat h1 *,#film .beat h2 *{color:transparent!important;text-shadow:none!important}' });
    const shot = await p.screenshot({ clip: { x: Math.max(0, box.x), y: Math.max(0, box.y), width: Math.max(1, box.w), height: Math.max(1, box.h) } });
    await p.evaluate(() => document.querySelectorAll('style').forEach((s) => { if (s.textContent.includes('color:transparent!important')) s.remove(); }));
    const lum = await p.evaluate(async (b64) => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = new OffscreenCanvas(img.width, img.height), g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, img.width, img.height).data, L = []; const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      for (let i = 0; i < d.length; i += 16) L.push(0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2])); L.sort((a, b) => a - b); return { p95: L[Math.floor(L.length * 0.95)], max: L[L.length - 1] }; }, shot.toString('base64'));
    const txt = await p.evaluate((c) => { const m = c.match(/\d+(\.\d+)?/g).map(Number); const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * lin(m[0]) + 0.7152 * lin(m[1]) + 0.0722 * lin(m[2]); }, box.color);
    const cr = (Math.max(txt, lum.p95) + 0.05) / (Math.min(txt, lum.p95) + 0.05);
    const ok = cr >= 4.5; if (!ok) failures++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: caption "${bt.text}" reads at ${cr.toFixed(1)}:1 over the brightest footage behind it (needs 4.5:1)`);
  }
  await ctx.close();
}
await b.close(); server.close();
if (failures) { console.error(`${failures} caption(s) below 4.5:1`); process.exit(1); }
console.log('contrast: all passing');
