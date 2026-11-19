// Fixes from the impeccable critique (18 Nov 2026), each checked where a visitor meets it: truth on the surface it
// describes, a quiet page after the film, no invisible keyboard stops, and the sci-fi residue gone.
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

const open = async (viewport, touch) => {
  const ctx = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
  const p = await ctx.newPage(); await p.goto(ORIGIN + '/');
  await p.waitForFunction(() => !document.documentElement.classList.contains('gate-intro'), null, { timeout: 40000 }).catch(() => {});
  await p.waitForTimeout(800);
  return [ctx, p];
};
// the page scrolls smoothly (CSS scroll-behavior), so a script's jump is made instant, then waits for that family to be on stage
const famY = async (p, k) => {
  await p.evaluate((k) => { const e = document.getElementById('explore'); scrollTo({ top: e.offsetTop + (e.offsetHeight - innerHeight) * (k / 3 + 0.12), behavior: 'instant' }); }, k);
  await p.waitForFunction((k) => document.querySelectorAll('.fam')[k]?.classList.contains('on'), k, { timeout: 15000 }).catch(() => {});
};

{ // desktop
  const [ctx, p] = await open({ width: 1440, height: 900 }, false);
  const page = await p.evaluate(() => ({
    meta: document.querySelector('.gate-meta')?.textContent || '',
    pending: document.querySelector('.pending')?.textContent || '',
    enquire: [...document.querySelectorAll('.chapters a')].find((a) => /Enquire/.test(a.textContent))?.getAttribute('href'),
    say: getComputedStyle(document.querySelector('.beat .say')).display,
  }));
  check(!/°/.test(page.meta), `the gate shows no map coordinates (${page.meta.trim()})`);
  check(/ports of origin and export/.test(page.pending) && !/origin and export ports/.test(page.pending), 'About lists "ports of origin and export" as pending, not origin itself');
  check(page.enquire === '#enquire', `the chapter bar's "Enquire" goes to Enquire (${page.enquire})`);
  check(page.say !== 'none', `each chapter's narration is in the page for screen readers, not display:none (${page.say})`);
  // keyboard at the gate: every stop is visible (nothing at opacity 0 or visibility hidden takes focus)
  const hidden = [];
  for (let i = 0; i < 8; i++) {
    await p.keyboard.press('Tab');
    const f = await p.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return null; let o = 1, v = getComputedStyle(a).visibility; for (let e = a; e && e.nodeType === 1; e = e.parentElement) o *= Number(getComputedStyle(e).opacity);
      return { name: (a.textContent || a.getAttribute('aria-label') || a.className).trim().slice(0, 30), o: +o.toFixed(2), v }; });
    if (f && (f.o < 0.2 || f.v !== 'visible')) hidden.push(f);
  }
  check(hidden.length === 0, `no invisible keyboard stop at the gate (${JSON.stringify(hidden)})`);
  // Explore, Sound on: arriving at a family tells no story by itself (the page goes quiet after the film)
  await famY(p, 1); await p.waitForTimeout(2500);
  const quiet = await p.evaluate(() => ({ story: !!window.__story && !window.__story.paused, score: document.documentElement.dataset.score, fx: getComputedStyle(document.querySelector('.score-fx')).display }));
  check(quiet.score === 'playing' && !quiet.story, `with Sound on, arriving at a product family starts no story by itself (${JSON.stringify(quiet)})`);
  check(quiet.fx === 'none', `the score's light ripples stay in the film, never over Products, forms or chat (${quiet.fx})`);
  // a product with no photograph of its own shows a plate saying so, not another product's photo
  await famY(p, 0); await p.waitForTimeout(1200);
  await p.evaluate(() => document.getElementById('p-woven-mats').click()); await p.waitForTimeout(900);
  const mats = await p.evaluate(() => ({ pending: document.querySelector('.sheet-img').classList.contains('pending'), text: document.querySelector('.sheet-img').textContent.trim(), img: getComputedStyle(document.getElementById('sheetImg')).display }));
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  await p.evaluate(() => document.getElementById('p-bamboo-poles').click()); await p.waitForTimeout(900);
  const poles = await p.evaluate(() => ({ pending: document.querySelector('.sheet-img').classList.contains('pending'), src: document.getElementById('sheetImg').getAttribute('src') }));
  await p.keyboard.press('Escape');
  check(mats.pending && /Photograph to come/.test(mats.text) && mats.img === 'none' && !poles.pending && /bamboo-poles/.test(poles.src),
    `woven mats shows "Photograph to come", bamboo poles its own photo (${JSON.stringify({ mats, poles })})`);
  // Rifat: his portrait in a quiet ring, without the sci-fi halo
  const ring = await p.evaluate(() => { const r = document.querySelector('.presence-ring'); return r ? { shadow: getComputedStyle(r).boxShadow, before: getComputedStyle(r, '::before').content } : null; });
  check(ring && ring.shadow === 'none' && (ring.before === 'none' || ring.before === 'normal'), `Rifat's ring has no glow or reticle (${JSON.stringify(ring)})`);
  await ctx.close();
}
{ // phone: the truth note is on the screen where it applies, not hidden
  const [ctx, p] = await open({ width: 390, height: 844 }, true);
  await famY(p, 0); await p.waitForTimeout(1500);
  const note = await p.evaluate(() => { const n = document.querySelector('.explore-note'), r = n?.getBoundingClientRect(); return n && { display: getComputedStyle(n).display, onScreen: r.bottom > 0 && r.top < innerHeight && r.height > 0 }; });
  check(note && note.display !== 'none' && note.onScreen, `on a phone, Products shows the note that names and photographs are being confirmed (${JSON.stringify(note)})`);
  await ctx.close();
}
await browser.close(); server.close();
console.log(failures ? `\n${failures} failing` : '\nall passing');
process.exit(failures ? 1 : 0);
