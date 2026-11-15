// Contrast of every line of text over the film, desktop 1440 and phone 390. Run: npm test.
// With motion the picture carries only the gate's words, the narrator's subtitle, the rings' names and "Hear its story"
// labels, and the small labels at the edges. For each: rest the film where that text shows (the gate, then each chapter's
// frame, where the narrator speaks), make that text transparent (its own scrim stays), screenshot the area under it and
// compare its colour with the 95th-percentile luminance behind it (the brightest footage, not an average).
// Fails below 4.5:1, the normal-text WCAG AA ratio, so every line stays readable over the brightest frames.
import { createRequire } from 'node:module'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg' };
const server = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((r) => server.listen(0, '127.0.0.1', r)); const O = `http://127.0.0.1:${server.address().port}`;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let failures = 0;

// measures the element matched by sel (the n-th, visible) against what is behind it
async function measure(p, name, where, sel, n = 0) {
  const box = await p.evaluate(([s, k]) => {
    const el = [...document.querySelectorAll(s)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; })[k];
    if (!el) return null;
    document.querySelectorAll('[data-measure]').forEach((e) => e.removeAttribute('data-measure'));
    el.setAttribute('data-measure', '');
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, color: getComputedStyle(el).color, text: el.textContent.trim().slice(0, 48) };
  }, [sel, n]);
  if (!box) return false;
  await p.addStyleTag({ content: '[data-measure],[data-measure] *{color:transparent!important;text-shadow:none!important}' });
  const clip = { x: Math.max(0, box.x), y: Math.max(0, box.y), width: Math.max(1, Math.min(box.w, 1440)), height: Math.max(1, box.h) };
  const shot = await p.screenshot({ clip });
  await p.evaluate(() => { document.querySelectorAll('style').forEach((s) => { if (s.textContent.includes('[data-measure]')) s.remove(); }); document.querySelectorAll('[data-measure]').forEach((e) => e.removeAttribute('data-measure')); });
  const lum = await p.evaluate(async (b64) => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = new OffscreenCanvas(img.width, img.height), g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, img.width, img.height).data, L = []; const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    for (let i = 0; i < d.length; i += 16) L.push(0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2])); L.sort((a, c2) => a - c2); return L[Math.floor(L.length * 0.95)]; }, shot.toString('base64'));
  const m = box.color.match(/\d+(\.\d+)?/g).map(Number), lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const txt = 0.2126 * lin(m[0]) + 0.7152 * lin(m[1]) + 0.0722 * lin(m[2]);
  const cr = (Math.max(txt, lum) + 0.05) / (Math.min(txt, lum) + 0.05), ok = cr >= 4.5;
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}, ${where}: "${box.text}" reads at ${cr.toFixed(1)}:1 over the brightest footage behind it (needs 4.5:1)`);
  return true;
}

for (const [name, vp, mobile] of [['desktop', { width: 1440, height: 900 }, false], ['phone', { width: 390, height: 844 }, true]]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile });
  const p = await ctx.newPage();
  await p.goto(O + '/', { waitUntil: 'load' }); await p.waitForTimeout(3500); // the gate's lines draw in
  for (const sel of ['.gate h1', '.gate h1 em', '.gate-meta', '.gate-label', '.gate-foot']) await measure(p, name, 'the gate', sel);

  const chapters = await p.evaluate(() => [...document.querySelectorAll('#film .beat[data-ch]')].map((b) => ({ key: b.dataset.ch, anchor: Number(b.dataset.anchor), text: b.querySelector('.say').textContent.trim() })));
  for (const c of chapters) {
    await p.evaluate((x) => { const f = document.getElementById('film'); scrollTo(0, f.offsetTop + (f.offsetHeight - innerHeight) * x); }, c.anchor);
    // the film eases to its frame and rests; the narrator then speaks (the words alone, Sound being off)
    const spoken = await p.waitForFunction((t) => { const s = document.querySelector('.subtitle'); return s.classList.contains('on') && s.textContent.trim() === t; }, c.text, { timeout: 20000 }).then(() => true, () => false);
    if (!spoken) { failures++; console.log(`FAIL ${name}: the narrator's line for "${c.key}" never showed at its frame`); continue; }
    await p.waitForTimeout(700); // the subtitle and the rings have faded in
    await measure(p, name, `${c.key}, subtitle`, '.subtitle');
    const rings = await p.evaluate(() => document.querySelectorAll('.spot.on').length);
    for (let k = 0; k < rings; k++) {
      await measure(p, name, `${c.key}, ring name`, '.spot.on .spot-name:not(.sr)', k);
      await measure(p, name, `${c.key}, ring label`, '.spot.on .story-label', k);
    }
    for (const sel of ['.hud-index', '.hud-next', '.film-label']) await measure(p, name, `${c.key}, edge`, sel);
  }
  await ctx.close();
}
await b.close(); server.close();
if (failures) { console.error(`${failures} line(s) below 4.5:1`); process.exit(1); }
console.log('contrast: all passing');
