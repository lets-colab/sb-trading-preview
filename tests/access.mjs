// Accessibility checks for the SB Trading preview. Run: npm test.
//  1. Reduced motion (prefers-reduced-motion: reduce): the page reads as a document. No motion class, the film is a
//     poster with every caption visible, the label keeps its whole-film sentence, the drawer opens and closes at once,
//     and Sound plays the score without the light effects.
//  2. Keyboard: the skip link is the first tab stop and becomes visible; Enter on a product opens the drawer with
//     focus inside it; Escape closes it and returns focus to that product.
//  3. axe-core (WCAG 2 A/AA rules) on the page top, Explore, the open drawer, Enquire and the open form, on desktop
//     and phone: no serious or critical violations. axe cannot judge text over photographs; tests/contrast.mjs does.
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png' };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let failures = 0;
const check = (ok, msg) => { console.log(ok ? 'ok  ' : 'FAIL', msg); if (!ok) failures++; };
const open = async (opts) => { const ctx = await browser.newContext(opts); const p = await ctx.newPage(); p.__film = 0;
  p.on('request', (r) => { if (/\/assets\/film\/[dm]\/\d+\.webp/.test(r.url()) && !/\/060\.webp/.test(r.url())) p.__film++; });
  await p.goto(ORIGIN + '/'); await p.waitForTimeout(2500); return [ctx, p]; };

// ---------------------------------------------------------------- 1. reduced motion
{
  const [ctx, p] = await open({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const s = await p.evaluate(() => ({
    motion: document.documentElement.classList.contains('motion'),
    poster: getComputedStyle(document.querySelector('.film-poster')).display !== 'none',
    canvas: getComputedStyle(document.querySelector('.film-canvas')).display,
    beats: [...document.querySelectorAll('#film .beat')].every((b) => getComputedStyle(b).visibility === 'visible' && parseFloat(getComputedStyle(b).opacity) === 1),
    label: document.querySelector('.film-label').textContent.trim(),
    explore: getComputedStyle(document.getElementById('explore')).position,
  }));
  check(!s.motion, 'reduced motion: the page does not turn its motion layer on');
  check(p.__film === 0, `reduced motion: the film is a poster, so no film frames are downloaded (${p.__film} frame requests)`);
  check(s.poster && s.canvas === 'none' && s.beats, 'reduced motion: the film is a still poster with every caption visible');
  check(/^Film: generated footage and Pexels stock clips, not SB Trading's own/.test(s.label), `reduced motion: the film label keeps its whole-film sentence (${s.label})`);
  await p.evaluate(() => document.querySelector('#bamboo .product').scrollIntoView({ block: 'center' }));
  await p.click('#bamboo .product >> nth=0');
  const opened = await p.evaluate(() => { const d = document.getElementById('productSheet'); return d.open && getComputedStyle(d).transform === 'none' && d.getAnimations().length === 0; });
  await p.keyboard.press('Escape');
  const closed = await p.evaluate(() => !document.getElementById('productSheet').open);
  check(opened && closed, `reduced motion: the drawer opens and closes at once, with no animation (opened still ${opened}, closed ${closed})`);
  await p.click('#soundToggle');
  const playing = await p.waitForFunction(() => document.documentElement.dataset.score === 'playing', null, { timeout: 6000 }).then(() => true, () => false);
  await p.waitForTimeout(2500);
  const fx = await p.evaluate(() => ({ audio: getComputedStyle(document.documentElement).getPropertyValue('--audio').trim(), layer: getComputedStyle(document.querySelector('.score-fx')).display, ripples: document.querySelectorAll('.score-fx i').length }));
  check(playing && (fx.audio === '' || fx.audio === '0') && fx.layer === 'none' && fx.ripples === 0, `reduced motion: Sound plays the score without the light effects (playing ${playing}, --audio "${fx.audio}", layer ${fx.layer}, ripples ${fx.ripples})`);
  await ctx.close();
}

// ---------------------------------------------------------------- 2. keyboard
{
  const [ctx, p] = await open({ viewport: { width: 1440, height: 900 } });
  await p.waitForTimeout(4000); // long enough for an idle-time setup to have happened, if there were one
  const early = await p.evaluate(() => document.documentElement.className);
  check(!/has-3d|no-3d/.test(early), `load: the 3D studies are not set up until Explore is near (html class "${early}")`);
  await p.keyboard.press('Tab');
  const skip = await p.evaluate(() => { const a = document.activeElement, r = a.getBoundingClientRect(); return { cls: a.className, top: r.top, shown: r.top >= 0 && r.bottom <= innerHeight }; });
  check(skip.cls === 'skip' && skip.shown, `keyboard: the skip link is the first tab stop and comes into view (${skip.cls || 'other element'}, top ${Math.round(skip.top)})`);
  await p.evaluate(() => { const e = document.getElementById('explore'); scrollTo(0, e.offsetTop + (e.offsetHeight - innerHeight) * 0.1); });
  await p.waitForSelector('#bamboo.on', { timeout: 10000 }).catch(() => {});
  check(await p.waitForFunction(() => /has-3d|no-3d/.test(document.documentElement.className), null, { timeout: 10000 }).then(() => true, () => false), 'load: the 3D studies are set up once Explore is reached');
  await p.focus('#bamboo .product >> nth=1'); await p.keyboard.press('Enter'); await p.waitForTimeout(900);
  const inside = await p.evaluate(() => { const d = document.getElementById('productSheet'); return d.open && d.contains(document.activeElement); });
  check(inside, 'keyboard: Enter on a product opens the drawer with focus inside it');
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => !document.getElementById('productSheet').open, null, { timeout: 5000 }).catch(() => {});
  const back = await p.evaluate(() => document.activeElement?.textContent.trim());
  check(back === 'Bamboo splits', `keyboard: Escape closes the drawer and returns focus to the product (focus: ${back})`);
  await ctx.close();
}

// ---------------------------------------------------------------- 3. axe-core
for (const [name, opts] of [['desktop 1440', { viewport: { width: 1440, height: 900 } }], ['phone 390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) {
  const [ctx, p] = await open(opts);
  await p.evaluate(AXE);
  const scan = async (state) => {
    const res = await p.evaluate(() => window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'], resultTypes: ['violations'] }));
    const bad = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    check(bad.length === 0, `axe ${name}, ${state}: no serious or critical WCAG violations${bad.length ? ' - ' + bad.map((v) => `${v.id} (${v.nodes.length}: ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(', ')})`).join('; ') : ''}`);
  };
  await scan('page top');
  await p.evaluate(() => { const e = document.getElementById('explore'); scrollTo(0, e.offsetTop + (e.offsetHeight - innerHeight) * 0.1); });
  await p.waitForSelector('#bamboo.on', { timeout: 10000 }).catch(() => {}); await p.waitForTimeout(1500);
  await scan('Explore');
  await p.click('#bamboo.on .product >> nth=0'); await p.waitForTimeout(900);
  await scan('product drawer open');
  await p.keyboard.press('Escape'); await p.waitForFunction(() => !document.getElementById('productSheet').open, null, { timeout: 5000 }).catch(() => {});
  await p.evaluate(() => document.getElementById('enquire').scrollIntoView()); await p.waitForTimeout(1800);
  await scan('Enquire (Rifat)');
  await p.click('#formToggle'); await p.waitForTimeout(600);
  await scan('plain form open');
  await ctx.close();
}

await browser.close(); server.close();
if (failures) { console.error(`${failures} accessibility check(s) failed`); process.exit(1); }
console.log('access: all passing');
