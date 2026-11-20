// Cache test: a returning visitor must never see new pages with old files. Every file the page loads carries a version
// tag (?v= and a hash of what it names), kept current by tools/stamp.mjs, so a changed file always has a new address
// and no browser, CDN or in-app cache can pair it with the old one (a phone showed the new header with an old stylesheet
// and the old film's frames, which had the same names). Passes only if: every tag in the page's files is current; a
// change to a file, or to one film frame, changes the tag on everything that points at it, through the module imports;
// and on a desktop and a phone journey (film, Explore and its 3D, a product sheet, Sound, a narration) every same-origin
// request except the page itself carries the tag its file should have.
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.webp': 'image/webp', '.json': 'application/json', '.mp3': 'audio/mpeg' };
let failures = 0;
const check = (ok, msg) => { console.log(ok ? 'ok  ' : 'FAIL', msg); if (!ok) failures++; };

let stamp = null;
try { stamp = await import('../tools/stamp.mjs'); } catch (e) { check(false, `tools/stamp.mjs loads (${e.message})`); }

if (stamp) {
  const { stale, missing } = stamp.plan();
  check(missing.length === 0, `every version tag names a file that exists (${JSON.stringify(missing.slice(0, 3))})`);
  check(stale.length === 0, `every version tag is current; run node tools/stamp.mjs (${JSON.stringify(stale.slice(0, 3))})`);
  const refs = (overrides) => stamp.plan({ overrides }).stale.map((s) => `${s.file} -> ${s.ref}`);
  const css = refs({ 'styles.css': fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8') + '\n' });
  check(css.includes('index.html -> styles.css'), `a changed stylesheet gets a new address in the page (${css.join(', ')})`);
  const kb = refs({ 'assets/rifat-knowledge.js': fs.readFileSync(path.join(ROOT, 'assets/rifat-knowledge.js'), 'utf8') + '\n' });
  check(kb.includes('assets/rifat.js -> ./rifat-knowledge.js') && kb.includes('site.js -> ./assets/rifat.js') && kb.includes('index.html -> site.js'),
    `a changed module renews the address of every module that imports it, up to the page (${kb.join(', ')})`);
  const frame = refs({ 'assets/film/m/001.webp': Buffer.from('a different frame') });
  check(frame.includes('index.html -> assets/film/d/030.webp') && frame.includes('site.js -> assets/film/') && frame.includes('styles.css -> assets/film/m/190.webp'),
    `one changed film frame renews the address of every frame, the poster and the backdrop (${frame.join(', ')})`);
}

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
const tags = stamp ? stamp.plan().tags : null;

async function journey(name, options, desktop) {
  const ctx = await browser.newContext(options);
  const p = await ctx.newPage();
  const seen = new Set();
  p.on('request', (r) => { if (r.url().startsWith(ORIGIN)) seen.add(r.url().slice(ORIGIN.length)); });
  await p.goto(ORIGIN + '/'); await p.waitForTimeout(2500);
  const film = (x) => p.evaluate((k) => { const f = document.getElementById('film'); scrollTo(0, f.offsetTop + (f.offsetHeight - innerHeight) * k); }, x);
  for (const x of [0.1, 0.3, 0.55, 0.9]) { await film(x); await p.waitForTimeout(900); }
  if (desktop) {
    await p.evaluate(() => { const e = document.getElementById('explore'); scrollTo(0, e.offsetTop + (e.offsetHeight - innerHeight) * (2 / 3 + 0.12)); });
    await p.waitForTimeout(3500); // the 3D specimens and their photographs load
    await p.keyboard.press('Tab'); // the visitor's first gesture starts the sound (on by default)
    await p.waitForFunction(() => document.documentElement.dataset.score === 'playing', null, { timeout: 8000 }).catch(() => {});
    { // a story is told on the film's rings (Explore lists the products): a visitor enters the film, goes on to the
      // showroom and taps the bark ring, which tells its story (bark.mp3), in the same browser as the journey above
      const q = await ctx.newPage();
      q.on('request', (r) => { if (r.url().startsWith(ORIGIN)) seen.add(r.url().slice(ORIGIN.length)); });
      await q.goto(ORIGIN + '/');
      await q.waitForFunction(() => !document.documentElement.classList.contains('gate-intro'), null, { timeout: 40000 }).catch(() => {});
      await q.click('.gate-enter');
      await q.waitForFunction(() => document.querySelector('.hud-name')?.textContent === 'The grove', null, { timeout: 20000 }).catch(() => {});
      await q.click('.hud-next');
      await q.waitForFunction(() => document.querySelector('.hud-name')?.textContent === 'The showroom', null, { timeout: 10000 }).catch(() => {});
      await q.waitForTimeout(2600);
      await q.click('.spot.on[data-key="bark"]', { timeout: 10000 }).catch(() => {}); await q.waitForTimeout(1500);
      await q.close();
    }
  }
  await p.evaluate(() => document.getElementById('p-bamboo-poles').click()); await p.waitForTimeout(1200);
  const files = [...seen].filter((u) => u !== '/' && !u.startsWith('/api/'));
  const bad = files.filter((u) => {
    const [file, query = ''] = u.slice(1).split('?');
    return !tags || query !== `v=${stamp.tagFor(file, tags)}`;
  });
  check(files.length > 20, `${name}: the journey loaded the page's files (${files.length} requests)`);
  check(bad.length === 0, `${name}: every file is fetched at its current versioned address (${bad.length} not: ${bad.slice(0, 4).join(', ')})`);
  if (desktop) {
    const kinds = ['/styles.css', '/site.js', '/assets/rifat.js', '/assets/rifat-knowledge.js', '/assets/sound.js', '/assets/vendor/specimens.js', '/assets/voice/bark.mp3', '/assets/img/cutout/', '/assets/img/bamboo-poles.webp'];
    const missed = kinds.filter((k) => !files.some((u) => u.startsWith(k)));
    check(missed.length === 0, `${name}: the journey reached every kind of file the page loads (missed: ${missed.join(', ') || 'none'})`);
  }
  await ctx.close();
}

await journey('desktop', { viewport: { width: 1440, height: 900 } }, true);
await journey('phone', { ...devices['iPhone 13'], defaultBrowserType: undefined }, false);
await browser.close();
server.close();
console.log(failures ? `\n${failures} failing` : '\nall passing');
process.exit(failures ? 1 : 0);
