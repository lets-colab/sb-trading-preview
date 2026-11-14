// Wireframes of the built site, measured, not drawn: opens the site at each chapter on desktop (1440x900) and phone
// (390x844), records where each labelled element sits, and writes docs/wireframes.html (grey boxes, labels, and a
// written description of every frame). Re-run after layout changes: CHROMIUM_PATH=<chrome> node docs/wireframes.mjs
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
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

// kind: media (pictures and film), text, control (buttons, links, inputs), chrome (header, bars, labels), panel
const PARTS = [
  ['.film-canvas', 'Film: scroll-scrubbed footage, full bleed', 'media'],
  ['.studio .beam', 'Overhead light beam', 'light'],
  ['.studio .floor', 'Floor light', 'light'],
  ['.studio .lit', "Arch window: SB Trading's bamboo photograph", 'media'],
  ['.dust', 'Gold dust (drawn over the film)', 'none'],
  ['.top', 'Header', 'chrome', ''],
  ['.brand', 'SB mark', 'control', 'SB'],
  ['.nav', 'Nav: About Us · Products · Contact Us', 'control'],
  ['.menu-toggle', 'Menu', 'control', 'Menu'],
  ['#soundToggle', 'Sound (opt-in)', 'control', 'Sound'],
  ['.top .btn-small', 'Ask Rifat (AI)', 'control'],
  ['.beat-hero h1', 'Headline: Materials in Motion.', 'text'],
  ['.beat-hero .lede', 'Lede: what SB supplies', 'text'],
  ['.beat-hero .specimen', 'Facts: 3 families · 9 products · Bangladesh', 'text'],
  ['.hero-actions', 'Explore the materials · Ask Rifat', 'control'],
  ['.scroll-ring', 'Scroll ring: fills as the film begins', 'control'],
  ['#film .beat:not(.beat-hero) h2', 'Caption', 'text'],
  ['.fam-cards', 'Family cards ×3: Bamboo · Banana fibre yarn · Bark and leaves', 'control'],
  ['.film-label', 'Source label (names each shot)', 'chrome'],
  ['.fam.on .fam-text h3', 'Family name', 'text'],
  ['.fam.on .fam-lede', 'Family lede', 'text'],
  ['.fam.on .products', 'Product chips (open the spec drawer)', 'control'],
  ['.fam.on .arch', 'Arch window: photograph in depth (WebGL)', 'media'],
  ['.fam.on .plinth', 'Plinth: 01 / 03 · family name · ← →', 'control'],
  ['.study-label', 'Depth-effect label', 'chrome'],
  ['.explore-note', 'Note: names and grades being confirmed', 'chrome'],
  ['#productSheet', 'Spec drawer (frosted glass)', 'panel'],
  ['#sheetImg', 'Product photograph', 'media'],
  ['#sheetTitle', 'Product name', 'text'],
  ['#productSheet .spec', 'Spec list: family, grade, origin, specification, minimum order', 'text'],
  ['#productSheet .sheet-body > .sheet-actions', 'Request a quote · Add to enquiry', 'control'],
  ['#sheetAsk', 'Ask Rifat about it (AI)', 'control'],
  ['#productSheet .handoff', 'Hand-off line: Rifat, then WhatsApp', 'chrome'],
  ['.sheet-close', 'Close', 'control', '✕'],
  ['#about h2', 'About Us heading', 'text'],
  ['.about-lede', 'About Us: what SB Trading supplies', 'text'],
  ['.ordering h3', 'How ordering works', 'text'],
  ['.steps-wrap', '3 ordering steps on a fibre line', 'control'],
  ['.pending', 'Still to be confirmed (box)', 'chrome'],
  ['.enq-head', 'Contact Us heading and lede', 'text'],
  ['.rifat-chat', 'Rifat chat (AI, labelled), suggested answers, input', 'panel'],
  ['.ticket', 'Your enquiry: fields fill in, Send on WhatsApp', 'panel'],
  ['.form-alt', 'Prefer a form? (plain form toggle)', 'control'],
  ['.tray', 'Enquiry tray (count, opens Rifat)', 'control'],
  ['.chapters', 'Chapter bar: Arrive · Discover · Transition · Explore · Enquire', 'chrome'],
];

const filmAt = (q) => `(() => { const f = document.getElementById('film'); scrollTo(0, f.offsetTop + (f.offsetHeight - innerHeight) * ${q}); })()`;
const exploreAt = (q) => `(() => { const e = document.getElementById('explore'); scrollTo(0, e.offsetTop + (e.offsetHeight - innerHeight) * ${q}); })()`;
const FRAMES = [
  { id: 'arrive', chapter: '01 Arrive', title: 'The studio', go: filmAt(0), wait: 2500,
    note: 'The page opens in a dark room. One beam falls from an overhead skylight onto an arch window holding SB Trading’s own split-bamboo photograph; a pool of light sits under it, and gold dust rises through the beam. The title, the three facts and the two actions sit on the left (above the arch on phones). Scrolling opens the dark outward from the arch into the film.' },
  { id: 'discover', chapter: '02 Discover', title: 'The film', go: filmAt(0.16), wait: 2500,
    note: 'The scroll is the film’s playhead: full-bleed footage moves forward and back with the scroll. One short caption at a time sits bottom-left; the source label names each shot (stock, generated, or SB Trading’s own). Dust stays faintly over the footage.' },
  { id: 'transition', chapter: '03 Transition', title: 'The end of the film', go: filmAt(0.95), wait: 2500,
    note: 'The last caption, “Bamboo, yarn and bark.”, with three family cards that jump straight to each family in Explore.' },
  { id: 'explore', chapter: '04 Explore', title: 'A family on stage', go: exploreAt(0.12), wait: 2500,
    note: 'One pinned stage, three families in turn. Text and product chips on the left; on the right, an arch window with the family’s photograph drawn in depth (it tilts with the pointer). Under the arch, a plinth carries the family’s number (01 / 03), its name and arrows to the families either side. On phones the arch and plinth sit above the text.' },
  { id: 'drawer', chapter: '04 Explore', title: 'The spec drawer', go: exploreAt(0.12), wait: 2000, click: '.fam.on .product', after: 1500,
    note: 'A product chip opens a pane of frosted glass that floats clear of the edges (from the right on desktop, from the bottom on phones), with the family still visible behind it. Photograph, name, spec list, Request a quote (the main action) and Add to enquiry, Ask Rifat about it, and the hand-off line. Request a quote turns the drawer into the enquiry form beside the same product, then offers Send on WhatsApp there. Each product has its own shareable address.' },
  { id: 'about', chapter: 'About Us', title: 'How ordering works', go: `document.querySelector('.steps-wrap').scrollIntoView({ block: 'center' })`, wait: 2000,
    note: 'Plain reading space: what SB Trading supplies, then three ordering steps on a fibre line that draws in as you scroll, and a box naming what is still to be confirmed.' },
  { id: 'enquire', chapter: '05 Enquire', title: 'Rifat and the enquiry', go: `document.getElementById('rifat').scrollIntoView({ block: 'center' })`, wait: 2500,
    note: 'Rifat, an AI assistant labelled as AI, asks for the missing details one at a time, with suggested answers. Beside it (below on phones), “Your enquiry” fills in as you answer; the buyer sends it on WhatsApp. A plain form is offered for anyone who prefers it.' },
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const views = [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true }]];
const measured = {};
for (const [vname, viewport] of views) {
  for (const fr of FRAMES) {
    const ctx = await browser.newContext({ viewport, isMobile: !!viewport.isMobile, hasTouch: !!viewport.hasTouch });
    const p = await ctx.newPage();
    await p.goto(ORIGIN + '/'); await p.waitForTimeout(2500);
    await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; }); // land exactly, no glide
    await p.evaluate(fr.go); await p.waitForTimeout(fr.wait);
    if (fr.click) { await p.evaluate((s) => document.querySelector(s).click(), fr.click); await p.waitForTimeout(fr.after); }
    measured[`${vname}:${fr.id}`] = await p.evaluate((parts) => {
      const shown = (el) => {
        if (!el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) return false;
        let o = 1; for (let e = el; e; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity);
        return o > 0.15;
      };
      const out = [];
      for (const [sel, label, kind, short] of parts) {
        for (const el of document.querySelectorAll(sel)) {
          if (!shown(el)) continue;
          const r = el.getBoundingClientRect();
          const x = Math.max(0, r.left), y = Math.max(0, r.top), x2 = Math.min(innerWidth, r.right), y2 = Math.min(innerHeight, r.bottom);
          if (x2 - x < 4 || y2 - y < 4) continue;
          if ((x2 - x) * (y2 - y) < 0.6 * r.width * r.height) continue; // mostly off screen: sliding in or out, not part of this frame
          out.push({ label: label === 'Caption' ? `Caption: ${el.textContent.trim()}` : label, kind, short, top: !!el.closest('dialog[open]'), x: Math.round(x), y: Math.round(y), w: Math.round(x2 - x), h: Math.round(y2 - y) });
        }
      }
      return { w: innerWidth, h: innerHeight, boxes: out };
    }, PARTS);
    await ctx.close();
  }
}
await browser.close(); server.close();

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function frameSvg({ w, h, boxes }, vname) {
  const fs_ = vname === 'phone' ? 13 : 15;
  const drawerOpen = boxes.some((b) => b.top);
  const order = { film: 0, light: 1, none: 1, panel: 2, media: 3, chrome: 4, text: 5, control: 6 };
  const rank = (b) => order[b.label.startsWith('Film:') ? 'film' : b.kind];
  const items = [...boxes].sort((a, b) => (a.top - b.top) || (rank(a) - rank(b)) || (b.w * b.h - a.w * a.h));
  const shapes = items.map((b) => {
    if (b.kind === 'none') return '';
    const cls = `${b.kind}${drawerOpen && !b.top ? ' behind' : ''}`;
    const tip = `<title>${esc(b.label)}</title>`;
    if (b.label === 'Overhead light beam') { const t = b.w * 0.33; return `<g class="light">${tip}<polygon points="${b.x + t},${b.y} ${b.x + b.w - t},${b.y} ${b.x + b.w},${b.y + b.h} ${b.x},${b.y + b.h}"/></g>`; }
    if (b.kind === 'light') return `<g class="light">${tip}<ellipse cx="${b.x + b.w / 2}" cy="${b.y + b.h / 2}" rx="${b.w / 2}" ry="${b.h / 2}"/></g>`;
    const text0 = b.short ?? b.label;
    let text = '';
    if (b.kind === 'media' && b.label.startsWith('Film:')) text = `<text class="m" x="${b.x + b.w - 14}" y="${b.y + b.h * 0.79}" text-anchor="end" font-size="${fs_}">${esc(b.label)}</text>`;
    else if (b.kind === 'media') text = `<text class="m" x="${b.x + b.w / 2}" y="${b.y + b.h / 2}" text-anchor="middle" font-size="${fs_}">${esc(b.label)}</text>`;
    else if (text0 && (b.w > 100 && b.h > 18 || (b.short && b.w >= 26 && b.h >= 22))) text = `<text x="${b.x + (b.short && b.w < 120 ? b.w / 2 : 10)}" y="${b.y + Math.min(b.h / 2 + fs_ / 2.8, 10 + fs_)}" text-anchor="${b.short && b.w < 120 ? 'middle' : 'start'}" font-size="${fs_}">${esc(text0)}</text>`;
    const cross = b.kind === 'media' ? `<path d="M${b.x} ${b.y}L${b.x + b.w} ${b.y + b.h}M${b.x + b.w} ${b.y}L${b.x} ${b.y + b.h}"/>` : '';
    if (b.label.startsWith('Arch')) { // rounded top, nearly square foot, as the site's arch window
      const R = Math.min(b.w / 2, b.h / 2), r = 10;
      const d = `M${b.x} ${b.y + R}A${b.w / 2} ${R} 0 0 1 ${b.x + b.w} ${b.y + R}L${b.x + b.w} ${b.y + b.h - r}Q${b.x + b.w} ${b.y + b.h} ${b.x + b.w - r} ${b.y + b.h}L${b.x + r} ${b.y + b.h}Q${b.x} ${b.y + b.h} ${b.x} ${b.y + b.h - r}Z`;
      return `<g class="${cls}">${tip}<path class="shape" d="${d}"/>${cross}${text}</g>`;
    }
    const rx = b.kind === 'panel' ? 16 : 6;
    return `<g class="${cls}">${tip}<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${rx}"/>${cross}${text}</g>`;
  }).join('');
  const scrim = drawerOpen ? (() => { const i = shapes.indexOf('<g class="panel">'); return i; })() : -1;
  const body = scrim >= 0 ? shapes.slice(0, scrim) + `<rect class="scrim" width="${w}" height="${h}"/>` + shapes.slice(scrim) : shapes;
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${vname} wireframe"><rect class="screen" width="${w}" height="${h}"/>${body}</svg>`;
}
const listFor = (m) => m.boxes.filter((b) => b.kind !== 'light' && b.kind !== 'none').map((b) => `<li>${esc(b.label)}</li>`).join('');

const sections = FRAMES.map((fr, i) => {
  const d = measured[`desktop:${fr.id}`], ph = measured[`phone:${fr.id}`];
  return `<section class="frame" id="${fr.id}">
  <header><p class="num">Frame ${i + 1} · ${esc(fr.chapter)}</p><h2>${esc(fr.title)}</h2><p class="note">${esc(fr.note)}</p></header>
  <div class="pair">
    <figure class="desk">${frameSvg(d, 'desktop')}<figcaption>Desktop 1440 × 900</figcaption></figure>
    <figure class="phone">${frameSvg(ph, 'phone')}<figcaption>Phone 390 × 844</figcaption></figure>
  </div>
  <details><summary>Everything on screen in this frame</summary><div class="lists"><div><h3>Desktop</h3><ul>${listFor(d)}</ul></div><div><h3>Phone</h3><ul>${listFor(ph)}</ul></div></div></details>
</section>`;
}).join('\n');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SB Trading Wireframes</title>
<meta name="description" content="Wireframes of the SB Trading immersive site, measured from the built page at each chapter on desktop and phone.">
<style>
:root{--bg:#f4f5f2;--ink:#1d2329;--dim:#5b6570;--line:#c9cfd4;--box:#ffffff;--media:#e3e7ea;--panel:#eef1f3;--accent:#8a6a3a;--light:#f6e8c8}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#11161b;--ink:#e6eaee;--dim:#a2acb6;--line:#3a444e;--box:#1a2128;--media:#232c35;--panel:#1d252d;--accent:#d7be93;--light:#3b3320}}
:root[data-theme="dark"]{--bg:#11161b;--ink:#e6eaee;--dim:#a2acb6;--line:#3a444e;--box:#1a2128;--media:#232c35;--panel:#1d252d;--accent:#d7be93;--light:#3b3320}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1240px;margin:0 auto;padding:40px 16px 80px}
h1{font-size:clamp(28px,4vw,40px);line-height:1.1;margin:0 0 12px;letter-spacing:-.01em}
.intro{max-width:70ch;color:var(--dim);margin:0 0 8px}
.key{display:flex;flex-wrap:wrap;gap:14px;margin:20px 0 8px;padding:0;list-style:none;font-size:14px;color:var(--dim)}
.key li{display:flex;align-items:center;gap:8px}
.key i{display:inline-block;width:22px;height:14px;border:1.5px solid var(--line);border-radius:3px;background:var(--box)}
.key .k-media i{background:var(--media)}.key .k-control i{border-color:var(--accent)}.key .k-panel i{background:var(--panel);border-style:dashed}.key .k-light i{background:var(--light);border-color:transparent}
nav.toc{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0 0}
nav.toc a{padding:6px 12px;border:1px solid var(--line);border-radius:999px;color:var(--ink);text-decoration:none;font-size:14px}
.frame{margin-top:56px;padding-top:32px;border-top:1px solid var(--line)}
.num{margin:0;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);font-weight:600}
.frame h2{margin:4px 0 8px;font-size:26px;line-height:1.2}
.note{max-width:75ch;margin:0;color:var(--dim)}
.pair{display:grid;grid-template-columns:minmax(0,3.4fr) minmax(0,1fr);gap:20px;align-items:start;margin-top:20px}
figure{margin:0}
figcaption{margin-top:6px;font-size:13px;color:var(--dim)}
svg{display:block;width:100%;height:auto;border-radius:10px}
svg .screen{fill:var(--bg);stroke:var(--line);stroke-width:2}
svg g rect{fill:var(--box);stroke:var(--line);stroke-width:1.5}
svg g.media rect,svg g.media path.shape{fill:var(--media);stroke:var(--line);stroke-width:1.5}svg g.media path{stroke:var(--line);stroke-width:1}
svg g.control rect{stroke:var(--accent);stroke-width:2}
svg g.panel rect{fill:var(--panel);stroke-dasharray:8 6;stroke-width:2}
svg g.chrome rect{fill:none;stroke-dasharray:3 4}
svg g.light polygon,svg g.light ellipse{fill:var(--light);stroke:none;opacity:.75}
svg .scrim{fill:var(--bg);opacity:.55}
svg text.m{fill:var(--dim)}
svg text{fill:var(--ink);font-family:system-ui,sans-serif}
details{margin-top:14px}
summary{cursor:pointer;color:var(--dim);font-size:14px}
.lists{display:grid;grid-template-columns:1fr 1fr;gap:20px;font-size:14px}
.lists h3{font-size:14px;margin:12px 0 4px}
.lists ul{margin:0;padding-left:18px;color:var(--dim)}
@media (max-width:760px){.pair{grid-template-columns:1fr}.phone{max-width:300px}.lists{grid-template-columns:1fr}}
</style></head><body><main>
<h1>SB Trading: wireframes</h1>
<p class="intro">The immersive site's seven key frames, measured from the built page (${new Date().toISOString().slice(0, 10)}) on desktop and phone. Boxes are where each element really sits; hover a box for its name. Each frame is also written out in words, and "Everything on screen" lists every element. No colour, footage or type here: this is layout only.</p>
<ul class="key"><li class="k-media"><i></i>Picture or film</li><li class="k-control"><i></i>Something to press</li><li class="k-panel"><i></i>Panel</li><li><i></i>Text</li><li class="k-light"><i></i>Light (studio)</li></ul>
<nav class="toc" aria-label="Frames">${FRAMES.map((f, i) => `<a href="#${f.id}">${i + 1}. ${esc(f.title)}</a>`).join('')}</nav>
${sections}
</main></body></html>
`;
fs.writeFileSync(path.join(ROOT, 'docs/wireframes.html'), html);
console.log(`wrote docs/wireframes.html: ${FRAMES.length} frames x 2 viewports, ${Object.values(measured).reduce((n, m) => n + m.boxes.length, 0)} boxes`);
