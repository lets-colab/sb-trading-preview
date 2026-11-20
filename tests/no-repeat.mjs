// The film tells each material's story and Explore lists its products: neither repeats the other (the owner, 20 Nov 2026).
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

for (const [name, viewport, touch] of [['desktop', { width: 1440, height: 900 }, false], ['phone', { width: 390, height: 844 }, true]]) {
  const ctx = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
  const p = await ctx.newPage(); await p.goto(ORIGIN + '/');
  await p.waitForFunction(() => document.querySelectorAll('.spot').length > 0, null, { timeout: 40000 }).catch(() => {});
  const got = await p.evaluate(() => ({
    rings: document.querySelectorAll('.spot').length,
    exploreStories: [...document.querySelectorAll('.explore .story')].filter((b) => !b.hidden && b.getBoundingClientRect().width > 0).map((b) => b.textContent.trim()),
    boards: document.querySelectorAll('.board').length,
    holdHints: [...document.querySelectorAll('.spot')].filter((b) => /hold/i.test(b.textContent)).length,
    howto: document.querySelector('[data-ch="showroom"] .say')?.textContent || '',
    exploreScreens: +(document.getElementById('explore').offsetHeight / innerHeight).toFixed(2),
  }));
  check(got.rings > 0, `${name}: the film's rings are there to tap (${got.rings})`);
  check(got.exploreStories.length === 0, `${name}: with the film playing, Explore shows no "Hear its story" button; the stories are told once, in the film (${JSON.stringify(got.exploreStories)})`);
  check(got.boards === 0 && got.holdHints === 0, `${name}: the film's rings no longer hold a product list; products are listed once, in Explore (boards ${got.boards}, hold hints ${got.holdHints})`);
  check(!/hold/i.test(got.howto) && /hear its story/i.test(got.howto), `${name}: the showroom line asks only to tap for the story ("${got.howto.trim()}")`);
  check(got.exploreScreens <= 3.2, `${name}: Explore is a quick shelf, at most 3.2 screens of scroll for its three families (${got.exploreScreens})`);
  if (touch) { // on a phone the truth note under the shelf sits clear of the chapter bar
    await p.evaluate(() => { const e = document.getElementById('explore'); scrollTo({ top: e.offsetTop + (e.offsetHeight - innerHeight) * 0.2, behavior: 'instant' }); });
    await p.waitForFunction(() => document.querySelector('.fam')?.classList.contains('on'), null, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(1500);
    const lay = await p.evaluate(() => {
      const n = document.querySelector('.explore-note').getBoundingClientRect(), c = document.querySelector('.chapters ol').getBoundingClientRect();
      return { noteBottom: Math.round(n.bottom), barTop: Math.round(c.top), shown: n.height > 1 };
    });
    check(lay.shown && lay.noteBottom <= lay.barTop, `${name}: Explore's truth note ends above the chapter bar (${JSON.stringify(lay)})`);
  }
  await ctx.close();
}

{ // reduced motion: the film is a still poster with no rings, so Explore's "Hear its story" is how the stories are heard
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); await p.goto(ORIGIN + '/'); await p.waitForTimeout(1500);
  const rings = await p.evaluate(() => document.querySelectorAll('.spot').length);
  await p.evaluate(() => document.getElementById('bark').scrollIntoView({ behavior: 'instant' }));
  await p.keyboard.press('Tab'); await p.waitForTimeout(800); // the visitor's first gesture starts the sound (on by default)
  const btn = await p.evaluate(() => { const b = document.querySelector('#bark .story'); return b && !b.hidden && b.getBoundingClientRect().width > 0 ? b.textContent.trim() : null; });
  await p.evaluate(() => document.querySelector('#bark .story')?.click()); await p.waitForTimeout(1500);
  const told = await p.evaluate(() => ({ cap: document.querySelector('.story-caption')?.textContent.trim().slice(0, 40), src: window.__story?.src || '' }));
  await p.evaluate(() => document.querySelector('#bark .story')?.click());
  check(rings === 0 && btn === 'Hear its story' && /banana plant/i.test(told.cap) && told.src.includes('/voice/bark.mp3'),
    `reduced motion: with no rings on the still film, Explore's "Hear its story" tells bark's story (${JSON.stringify({ rings, btn, told })})`);
  await ctx.close();
}

await browser.close(); server.close();
if (failures) { console.error(`\n${failures} no-repeat check(s) failed`); process.exit(1); }
console.log('\nno repeat: all checks passed');
