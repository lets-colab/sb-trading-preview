// SB Trading's own photograph (a container packed with bamboo, sent by Rifat on 20 Nov 2026) stands behind the order
// section. Checked where a buyer meets it: the photo loads at the size for the screen, a visible line says what it is and
// whose it is, and every piece of text over it still reads at WCAG AA (4.5:1) against the brightest part of the photo
// behind that text, measured from the rendered pixels with the text hidden.
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
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let failures = 0;
const check = (ok, msg) => { console.log(ok ? 'ok  ' : 'FAIL', msg); if (!ok) failures++; };

// text over the photo, outside any opaque panel of its own
const TEXT = ['#h-enquire', '.enq-head .lede', '.photo-credit', '.form-toggle', '#h-ticket', '.ticket-list'];

async function worstContrast(p, sel) {
  const box = await p.evaluate((sel) => {
    const e = document.querySelector(sel); if (!e) return null;
    e.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = e.getBoundingClientRect();
    return r.width > 1 && r.height > 1 ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
  }, sel);
  if (!box) return null;
  await p.waitForTimeout(300);
  const clip = await p.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: Math.min(r.width, innerWidth - r.x), height: Math.min(r.height, innerHeight - r.y) }; }, sel);
  const color = await p.evaluate((sel) => getComputedStyle(document.querySelector(sel)).color, sel);
  await p.addStyleTag({ content: `${sel},${sel} *{color:transparent!important;text-decoration-color:transparent!important}` });
  const png = (await p.screenshot({ clip })).toString('base64');
  await p.evaluate(() => document.querySelectorAll('style').forEach((s) => s.textContent.includes('color:transparent!important') && s.remove()));
  return p.evaluate(async ({ png, color }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode();
    const c = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height });
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const lum = [];
    for (let i = 0; i < d.length; i += 4) lum.push([L(d[i], d[i + 1], d[i + 2]), i]);
    lum.sort((a, b) => a[0] - b[0]);
    const [, i] = lum[Math.floor(lum.length * 0.995)]; // brightest background, ignoring a few stray pixels
    const [r, gg, b, a = 1] = color.match(/[\d.]+/g).map(Number);
    const mix = (fg, bg) => fg * a + bg * (1 - a);
    const t = L(mix(r, d[i]), mix(gg, d[i + 1]), mix(b, d[i + 2])), bgL = L(d[i], d[i + 1], d[i + 2]);
    return (Math.max(t, bgL) + 0.05) / (Math.min(t, bgL) + 0.05);
  }, { png, color });
}

for (const [name, viewport, touch, want] of [['desktop', { width: 1440, height: 900 }, false, 'container-1120'], ['phone', { width: 390, height: 844 }, true, 'container-720']]) {
  const ctx = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); await p.goto(ORIGIN + '/');
  await p.evaluate(() => document.getElementById('enquire').scrollIntoView({ behavior: 'instant' }));
  const img = await p.waitForFunction(() => { const i = document.querySelector('.enq-photo img'); return i && i.complete && i.naturalWidth > 0 && i.currentSrc; }, null, { timeout: 15000 }).then((h) => h.jsonValue()).catch(() => '');
  check(String(img).includes(want), `${name}: SB Trading's container photo loads behind the order section at the ${want} size (${img || 'none'})`);
  const shown = await p.evaluate(() => { const e = document.querySelector('.enq-photo'); if (!e) return 0; const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== 'none' ? r.width * r.height : 0; });
  check(shown > viewport.width * 300, `${name}: the photo covers part of the section (${Math.round(shown)} px²)`);
  const credit = await p.evaluate(() => { const e = document.querySelector('.photo-credit'); return e && e.getBoundingClientRect().height > 1 ? e.textContent.trim() : ''; });
  check(/container/i.test(credit) && /SB Trading/.test(credit), `${name}: a visible line says what the photo shows and that it is SB Trading's ("${credit}")`);
  for (const sel of TEXT) {
    const cr = await worstContrast(p, sel);
    if (cr === null) { check(sel === '.ticket-list', `${name}: ${sel} is on the page`); continue; }
    check(cr >= 4.5, `${name}: ${sel} reads at ${cr.toFixed(2)}:1 over the brightest photo pixel behind it (needs 4.5)`);
  }
  await ctx.close();
}

await browser.close(); server.close();
if (failures) { console.error(`\n${failures} enquire-photo check(s) failed`); process.exit(1); }
console.log('\nenquire photo: all checks passed');
