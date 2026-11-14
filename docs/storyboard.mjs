// Storyboard: the owner's two reference videos beside the built site, scene by scene. Writes docs/storyboard.html with
// stills in docs/storyboard/ (reference stills come from the videos; site stills are captured from the built page).
// Run: CHROMIUM_PATH=<chrome> node docs/storyboard.mjs <97f87dc2.mp4> <43a4edb4.mp4>
// (without the video paths the reference stills already in docs/storyboard/ are kept).
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/storyboard');
fs.mkdirSync(OUT, { recursive: true });
const [showroomClip, studioClip] = process.argv.slice(2);

const filmAt = (q) => `(() => { const f = document.getElementById('film'); scrollTo({ top: f.offsetTop + (f.offsetHeight - innerHeight) * ${q}, behavior: 'instant' }); })()`;
const exploreAt = (q) => `(() => { const e = document.getElementById('explore'); scrollTo({ top: e.offsetTop + (e.offsetHeight - innerHeight) * ${q}, behavior: 'instant' }); })()`;
const SCENES = [
  { title: 'Arrive: darkness', feel: 'Mystery. Nothing but dark, then the first light between bamboo.',
    ref: ['A', 0.6], go: filmAt(0.02),
    site: 'The film opens on the same dark grove. Over it: Materials in Motion., the three facts (3 families, 9 products, Bangladesh), Explore the materials and Ask Rifat. Gold dust drifts in the light shafts.' },
  { title: 'Into the light', feel: 'Release. The grove opens onto a bright showroom.',
    ref: ['A', 1.8], go: filmAt(0.27),
    site: 'Scrolling walks forward through the grove toward the light; caption: Out of the grove, into the light.',
    left: 'The clip’s close-up of the showroom (2.0–2.9 s) is cut: its plinth cards misspell the company name.' },
  { title: 'The material, close', feel: 'Intimacy. Wet bamboo, fibres lifting in warm light.',
    ref: ['A', 3.6], go: filmAt(0.44),
    site: 'The same macro shot; caption: Bamboo, up close. (never claiming bamboo becomes SB’s yarn, which is banana fibre).',
    left: 'Glass cards with invented text drift at the frame edges; the shot is zoomed slightly and its edges softened so none is legible.' },
  { title: 'Fibre in motion', feel: 'Flow. Golden fibres twisting through the air.',
    ref: ['A', 5.2], go: filmAt(0.68),
    site: 'The same twist; caption: Natural fibre, close up.' },
  { title: 'The gallery', feel: 'Clarity. Three lit cases, numbered: 01 Bamboo, 02 Banana fibre yarn, 03 Banana bark.',
    ref: ['A', 6.6], go: filmAt(0.94),
    site: 'The film ends in the same gallery. Caption Bamboo, yarn and bark. with the three family cards, each going straight to that family.' },
  { title: 'One family, on its plinth', feel: 'Focus. The camera moves in on one case.',
    ref: ['A', 7.6], go: exploreAt(0.15),
    site: 'Explore is the bright showroom: the family’s real photograph in an arch on a plinth (01 / 03 Bamboo, arrows to the next), its products as chips beside it.' },
  { title: 'The spec drawer', feel: 'Confidence. The product’s facts on a pane of glass.',
    ref: ['B', 7.0], go: exploreAt(0.15), click: '.fam.on .product',
    site: 'A product opens a white frosted glass drawer: photograph, family, grade, supplied from Bangladesh, specification and minimum order (confirmed in the quotation), Request a quote in brand blue.',
    left: 'The clip’s invented figures (minimum order, composition) are not shown: SB Trading has not confirmed them.' },
  { title: 'Request a quote', feel: 'Ease. The form appears beside the product, product already chosen.',
    ref: ['A', 9.5], go: exploreAt(0.15), click: '.fam.on .product', then: '#sheetQuote',
    site: 'Request a quote turns the drawer into the enquiry form with the product chosen and the cursor in Your name.' },
  { title: 'Hand-off', feel: 'Trust. The enquiry goes to Rifat and on to WhatsApp.',
    ref: ['B', 9.5], go: exploreAt(0.15), click: '.fam.on .product', then: '#sheetQuote', fill: true,
    site: 'After Prepare enquiry: nothing has been sent yet; Send on WhatsApp (+880 1878-707910) or Review your enquiry with Rifat.' },
];

// reference stills
SCENES.forEach((s, i) => {
  const clip = s.ref[0] === 'A' ? showroomClip : studioClip, file = path.join(OUT, `ref-${i + 1}.jpg`);
  if (clip) execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(s.ref[1]), '-i', clip, '-frames:v', '1', '-vf', 'scale=640:-1', '-q:v', '5', file]);
  if (!fs.existsSync(file)) throw new Error(`missing ${file}: pass the reference video paths`);
});

// site stills
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
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [i, s] of SCENES.entries()) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 0.5 });
  const p = await ctx.newPage();
  await p.goto(ORIGIN + '/'); await p.waitForTimeout(2500);
  await p.evaluate(s.go); await p.waitForTimeout(2500);
  if (s.click) { await p.evaluate((sel) => document.querySelector(sel).click(), s.click); await p.waitForTimeout(1500); }
  if (s.then) { await p.click(s.then); await p.waitForTimeout(800); }
  if (s.fill) {
    await p.fill('#f-name', 'Ayesha Rahman'); await p.fill('#f-email', 'ayesha@example.com'); await p.fill('#f-qty', '500'); await p.fill('#f-country', 'Belgium');
    await p.click('#enquiryForm button[type=submit]'); await p.waitForTimeout(900);
  }
  await p.screenshot({ path: path.join(OUT, `site-${i + 1}.jpg`), type: 'jpeg', quality: 70 });
  await ctx.close();
}
await browser.close(); server.close();

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const refName = { A: 'Showroom video (97f87dc2)', B: 'Studio video (43a4edb4)' };
const cards = SCENES.map((s, i) => `<section class="scene">
  <header><p class="num">Scene ${i + 1}</p><h2>${esc(s.title)}</h2><p class="feel">${esc(s.feel)}</p></header>
  <div class="pair">
    <figure><img src="storyboard/ref-${i + 1}.jpg" alt="Reference: ${esc(s.title)}" width="640" height="360"><figcaption>Reference · ${refName[s.ref[0]]}, ${s.ref[1].toFixed(1)} s</figcaption></figure>
    <figure><img src="storyboard/site-${i + 1}.jpg" alt="Website: ${esc(s.title)}" width="640" height="360"><figcaption>Website</figcaption></figure>
  </div>
  <p class="site">${esc(s.site)}</p>${s.left ? `\n  <p class="left">Left out on purpose: ${esc(s.left)}</p>` : ''}
</section>`).join('\n');
fs.writeFileSync(path.join(ROOT, 'docs/storyboard.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SB Trading Storyboard</title>
<meta name="description" content="The owner's reference videos beside the SB Trading website, scene by scene.">
<style>
:root{--bg:#f4f5f2;--ink:#1d2329;--dim:#5b6570;--line:#d3d8dc;--accent:#8a6a3a}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#11161b;--ink:#e6eaee;--dim:#a2acb6;--line:#3a444e;--accent:#d7be93}}
:root[data-theme="dark"]{--bg:#11161b;--ink:#e6eaee;--dim:#a2acb6;--line:#3a444e;--accent:#d7be93}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1180px;margin:0 auto;padding:40px 16px 80px}
h1{font-size:clamp(28px,4vw,40px);line-height:1.1;margin:0 0 12px}
.intro{max-width:72ch;color:var(--dim);margin:0}
.scene{margin-top:48px;padding-top:28px;border-top:1px solid var(--line)}
.num{margin:0;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);font-weight:600}
.scene h2{margin:4px 0 4px;font-size:24px}
.feel{margin:0;color:var(--dim);font-style:italic}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}
figure{margin:0}
img{display:block;width:100%;height:auto;border-radius:8px;background:#000}
figcaption{margin-top:6px;font-size:13px;color:var(--dim)}
.site{max-width:80ch;margin:14px 0 0}
.left{max-width:80ch;margin:8px 0 0;color:var(--dim);font-size:15px}
@media (max-width:700px){.pair{grid-template-columns:1fr}}
</style></head><body><main>
<h1>SB Trading: storyboard</h1>
<p class="intro">The owner's two reference videos beside the built website (${new Date().toISOString().slice(0, 10)}), scene by scene: the feeling each moment carries, what the site shows and does there, and what was left out of the reference on purpose. Scenes 1 to 5 are the scroll film (built from the showroom video by tools/build-film.py); scenes 6 to 9 are the interactive showroom, drawer and quote. Layout wireframes: wireframes.html.</p>
${cards}
</main></body></html>
`);
console.log(`wrote docs/storyboard.html: ${SCENES.length} scenes`);
