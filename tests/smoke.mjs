// Browser smoke test for the SB Trading preview. Run: npm test (set CHROMIUM_PATH to an installed browser when needed).
// Serves the repo root on a random local port (no /api/rifat here, so Rifat runs in guided mode), then checks desktop
// and phone in Chromium with software GL. Passes only if: no page errors, no external requests, no horizontal overflow,
// no AudioContext before the Sound press, the product sheet hands the product to Rifat, Rifat's guided flow fills the
// enquiry and rejects a bad email, WhatsApp opens SB Trading's number with the enquiry filled in, the plain form validates
// inline, and (desktop) the 3D studies draw nothing while the visitor is still.
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
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
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
  p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text()); });
  p.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith('/api/rifat')) errors.push(`${r.status()} ${r.url()}`); });
  p.on('request', (r) => { const u = r.url(); if (!u.startsWith(ORIGIN) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u); });
  await p.goto(ORIGIN + '/'); await p.waitForTimeout(3000);
  check((await p.evaluate(() => window.__ac)) === 0, `${name}: no AudioContext before the Sound press`);
  // the film names the source of the shot on screen (stock or generated), and never claims it as SB Trading's own
  const labelAt = async (x, want) => {
    await p.evaluate((q) => { const f = document.getElementById('film'); scrollTo(0, f.offsetTop + (f.offsetHeight - innerHeight) * q); }, x);
    await p.waitForFunction((src) => new RegExp(src, 'i').test(document.querySelector('.film-label').textContent), want.source, { timeout: 15000 }).catch(() => {}); // the film eases to the scroll position
    return p.evaluate(() => document.querySelector('.film-label').textContent.trim());
  };
  const studioLabel = await labelAt(0.02, /own photograph/);
  check(/^This shot: SB Trading's own photograph\.$/.test(studioLabel), `${name}: under the title, the studio shows SB Trading's own photograph and the label says so (${studioLabel})`);
  const studioShot = await p.evaluate(() => { const s = document.querySelector('.studio'), img = s.querySelector('img'); return { shown: getComputedStyle(s).visibility === 'visible', own: /assets\/img\//.test(img.currentSrc), loaded: img.complete && img.naturalWidth > 0 }; });
  check(studioShot.shown && studioShot.own && studioShot.loaded, `${name}: the studio arch holds a loaded site photograph (${JSON.stringify(studioShot)})`);
  const dustLit = await p.evaluate(() => { const c = document.querySelector('.dust'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++; return n; });
  check(dustLit > 20, `${name}: dust motes are drawn over the opening (${dustLit} lit pixels)`);
  const shots = [[0.105, /stock footage \(Pexels\)/i], [0.5, /generated footage/i], [0.8, /stock footage \(Pexels\)/i], [0.95, /generated footage/i]];
  const seen = [];
  for (const [x, want] of shots) { const t = await labelAt(x, want); seen.push(`${x}: ${t}`); if (!want.test(t) || !/not SB Trading's own/.test(t) || (/generated/i.test(t) && /Pexels/.test(t))) seen.push('MISMATCH'); }
  check(!seen.includes('MISMATCH'), `${name}: once the studio opens, the film label names each shot's own source (${seen.filter((s) => s !== 'MISMATCH').join(' | ')})`);
  { // the label follows the frame actually on the canvas: with frames 1-30 (stock) failing to load, frame 30 is drawn from
    // the nearest loaded frame, which is generated footage, so the label must say generated (Codex finding on #16)
    const q = await ctx.newPage();
    await q.route(/\/assets\/film\/[dm]\/0(0[1-9]|[12][0-9]|30)\.webp$/, (r) => r.abort());
    await q.goto(ORIGIN + '/'); await q.waitForTimeout(2500);
    await q.evaluate(() => { const f = document.getElementById('film'); scrollTo(0, f.offsetTop + (f.offsetHeight - innerHeight) * (29 / 254)); });
    await q.waitForFunction(() => /generated footage, not/i.test(document.querySelector('.film-label').textContent), null, { timeout: 15000 }).catch(() => {});
    const t = await q.evaluate(() => document.querySelector('.film-label').textContent.trim());
    check(/generated footage, not SB Trading's own/.test(t) && !/Pexels/.test(t), `${name}: the label follows the frame drawn, not the frame asked for (${t})`);
    await q.close();
  }
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(600);
  const toExplore = async (q) => { await p.evaluate((x) => { const e = document.getElementById('explore'); scrollTo(0, e.offsetTop + (e.offsetHeight - innerHeight) * x); }, q); await p.waitForTimeout(1800); };

  // product sheet -> Rifat
  await toExplore(0.15);
  // every product has its own link: opening one sets the address and the page title; Back closes it, Forward reopens it
  const title0 = await p.title();
  await p.click('#bamboo.on .product >> nth=1'); await p.waitForTimeout(700);
  check((await p.evaluate(() => location.hash)) === '#p-bamboo-splits' && /^Bamboo splits/.test(await p.title()), `${name}: opening a product gives it its own address and page title (${await p.evaluate(() => location.hash)}, "${await p.title()}")`);
  await p.goBack(); // the dialog's close event (which restores the title) is delivered just after it closes
  await p.waitForFunction((t) => !document.getElementById('productSheet').open && document.title === t, title0, { timeout: 5000 }).catch(() => {});
  check(await p.evaluate(() => !document.getElementById('productSheet').open && location.hash === '') && (await p.title()) === title0, `${name}: Back closes the product and restores the address and title`);
  await p.goForward(); await p.waitForFunction(() => document.getElementById('productSheet').open, null, { timeout: 5000 }).catch(() => {});
  check(await p.evaluate(() => document.getElementById('productSheet').open && document.getElementById('sheetTitle').textContent === 'Bamboo splits'), `${name}: Forward reopens the same product`);
  await p.keyboard.press('Escape'); await p.waitForFunction(() => !document.getElementById('productSheet').open && location.hash === '', null, { timeout: 5000 }).catch(() => {});
  check((await p.evaluate(() => location.hash)) === '', `${name}: closing the product clears its address`);
  { // browsing products must not pile up history: three opened and closed leave at most one extra entry
    const before = await p.evaluate(() => history.length);
    for (let k = 0; k < 3; k++) {
      await p.click(`#bamboo.on .product >> nth=${k}`); await p.waitForFunction(() => document.getElementById('productSheet').open && /^#p-/.test(location.hash), null, { timeout: 5000 }).catch(() => {});
      await p.waitForTimeout(700); await p.keyboard.press('Escape');
      await p.waitForFunction(() => !document.getElementById('productSheet').open && location.hash === '', null, { timeout: 5000 }).catch(() => {});
      await p.waitForTimeout(250);
    }
    const grew = (await p.evaluate(() => history.length)) - before;
    check(grew <= 1, `${name}: opening and closing three products does not fill the Back history (${grew} extra entries)`);
  }
  { // a shared product link opens that product directly
    const q = await ctx.newPage(); await q.goto(ORIGIN + '/#p-grade-a-banana-silk');
    const direct = await q.waitForFunction(() => document.getElementById('productSheet').open, null, { timeout: 12000 }).then(() => true, () => false);
    const got = await q.evaluate(() => `${document.getElementById('sheetTitle').textContent} / ${document.getElementById('sheetFamily').textContent}`);
    check(direct && got === 'Grade A: banana silk / Banana fibre yarn', `${name}: a shared product link opens that product directly (${got})`);
    await q.waitForTimeout(2500); // past the load event, when the browser's own jump to the anchor happens
    const behind = await q.evaluate(() => document.querySelector('.fam.on')?.id);
    const why = behind === 'fibre' ? '' : await q.evaluate(() => { const e = document.getElementById('explore'), r = e.getBoundingClientRect(); return JSON.stringify({ y: Math.round(scrollY), p: +(Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)))).toFixed(3), on: [...document.querySelectorAll('.fam.on')].map((f) => f.id), open: document.getElementById('productSheet').open, vis: document.visibilityState, hash: location.hash }); });
    check(behind === 'fibre', `${name}: behind the glass drawer, the stage shows that product's family (${behind}${why ? ' ' + why : ''})`);
    // what a late jump to the #anchor does; the stage must be back within four frames (an instant jump, not a glide that a
    // busy phone keeps restarting)
    const kept = await q.evaluate(() => new Promise((res) => {
      scrollTo({ top: document.getElementById('explore').offsetTop, behavior: 'instant' });
      let n = 0; const f = () => (++n < 4 ? requestAnimationFrame(f) : res(document.querySelector('.fam.on')?.id)); requestAnimationFrame(f);
    }));
    check(kept === 'fibre', `${name}: while the drawer is open, its family is back on stage within four frames when the page is moved (${kept})`);
    const spec = await q.evaluate(() => ({ grade: document.getElementById('sheetGradeRow').hidden ? null : document.getElementById('sheetGrade').textContent, rows: document.querySelectorAll('#productSheet .spec div:not([hidden])').length }));
    check(spec.grade === 'A' && spec.rows === 5, `${name}: the drawer's spec sheet shows the grade for a graded yarn (${JSON.stringify(spec)})`);
    const look = await q.evaluate(() => {
      const lum = (c) => { const [r, g, b] = c.match(/[\d.]+/g).map(Number); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
      const d = document.getElementById('productSheet');
      return { panel: +lum(getComputedStyle(d).backgroundColor).toFixed(2), title: +lum(getComputedStyle(document.getElementById('sheetTitle')).color).toFixed(2), primary: getComputedStyle(document.getElementById('sheetQuote')).backgroundColor };
    });
    check(look.panel > 0.85 && look.title < 0.2 && look.primary === 'rgb(0, 74, 152)', `${name}: the spec drawer is white frosted glass with ink text and a brand-blue main button, as in the showroom reference (${JSON.stringify(look)})`);
    await q.close();
  }
  { // "Request a quote" opens the enquiry form inside the drawer, beside the product (owner's references). It is the same
    // form as Contact Us's, so there is still one enquiry; it goes home when the drawer closes.
    const q = await ctx.newPage(); await q.goto(ORIGIN + '/#p-grade-b-standard-banana-fibre-yarn');
    await q.waitForFunction(() => document.getElementById('productSheet').open, null, { timeout: 12000 }).catch(() => {});
    await q.waitForTimeout(1200);
    await q.click('#sheetQuote'); await q.waitForTimeout(600);
    const open = await q.evaluate(() => ({ inside: !!document.querySelector('#productSheet #enquiryForm'), shown: !document.getElementById('enquiryForm').hidden, product: document.getElementById('f-product').value, focus: document.activeElement?.id }));
    check(open.inside && open.shown && open.product === 'Grade B: standard banana fibre yarn' && open.focus === 'f-name', `${name}: "Request a quote" opens the enquiry form in the drawer with the product chosen (${JSON.stringify(open)})`);
    await q.fill('#f-name', 'Ayesha Rahman'); await q.fill('#f-email', 'ayesha@example.com'); await q.fill('#f-qty', '500'); await q.fill('#f-country', 'Belgium');
    await q.click('#enquiryForm button[type=submit]'); await q.waitForTimeout(700);
    const done = await q.evaluate(() => ({ wa: document.getElementById('quoteWa')?.getAttribute('href') || '', shown: !document.getElementById('quoteDone')?.hidden, ticket: document.getElementById('ticketList').textContent }));
    check(done.shown && /^https:\/\/wa\.me\/8801878707910\?text=/.test(done.wa) && /Grade B/.test(done.ticket) && /Belgium/.test(done.ticket),
      `${name}: the quote is prepared in the drawer, fills "Your enquiry", and offers Send on WhatsApp there (${done.wa.slice(0, 40)})`);
    await q.keyboard.press('Escape');
    await q.waitForFunction(() => !document.getElementById('productSheet').open, null, { timeout: 5000 }).catch(() => {});
    const home = await q.evaluate(() => ({ parent: document.getElementById('enquiryForm').parentElement.className, open: document.getElementById('productSheet').open }));
    check(home.parent === 'form-alt' && !home.open, `${name}: closing the drawer returns the form to Contact Us (${JSON.stringify(home)})`);
    await q.close();
  }
  { // Explore is a bright showroom (owner's reference 97f87dc2): light walls, ink text, an ink header over it; it starts
    // dark as it rises into view after the film, so the visitor walks out of the dark into the light
    const q = await ctx.newPage(); await q.goto(ORIGIN + '/'); await q.waitForTimeout(2000);
    await q.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; const e = document.getElementById('explore'); scrollTo(0, e.offsetTop - innerHeight * 0.6); });
    await q.waitForTimeout(800);
    const entering = await q.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.dawn')).opacity));
    await q.evaluate(() => { const e = document.getElementById('explore'); scrollTo(0, e.offsetTop + (e.offsetHeight - innerHeight) * 0.15); });
    await q.waitForSelector('#bamboo.on', { timeout: 10000 }).catch(() => {}); await q.waitForTimeout(1500);
    const s = await q.evaluate(() => {
      const lum = (c) => { const [r, g, b] = c.match(/[\d.]+/g).map(Number); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
      return { wall: +lum(getComputedStyle(document.querySelector('.explore-stage')).backgroundColor).toFixed(2), h3: +lum(getComputedStyle(document.querySelector('.fam.on h3')).color).toFixed(2),
        header: document.documentElement.classList.contains('light-top'), dawn: parseFloat(getComputedStyle(document.querySelector('.dawn')).opacity), logo: getComputedStyle(document.querySelector('.brand-mark-ink')).display !== 'none' };
    });
    check(entering > 0.4 && s.wall > 0.85 && s.h3 < 0.2 && s.header && s.logo && s.dawn < 0.05,
      `${name}: Explore is a bright showroom reached out of the dark, with ink text and an ink header (entering dark ${entering.toFixed(2)}, ${JSON.stringify(s)})`);
    await q.close();
  }
  { // the showroom opens on all three families side by side (the reference's establishing shot), then moves in on one;
    // choosing one from the keyboard lands on that family's first product
    const q = await ctx.newPage(); await q.goto(ORIGIN + '/'); await q.waitForTimeout(2000);
    await q.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; const e = document.getElementById('explore'); scrollTo(0, e.offsetTop + (e.offsetHeight - innerHeight) * 0.02); });
    await q.waitForTimeout(1200);
    const g = await q.evaluate(() => ({ overview: document.querySelector('.explore-stage').classList.contains('overview'), items: [...document.querySelectorAll('.gallery a')].filter((a) => a.checkVisibility({ visibilityProperty: true, opacityProperty: true })).map((a) => a.innerText.replace(/\s+/g, ' ').trim()), fam: [...document.querySelectorAll('.fam')].some((f) => f.checkVisibility({ visibilityProperty: true, opacityProperty: true })) }));
    check(g.overview && g.items.length === 3 && /^01 \/ 03 Bamboo/.test(g.items[0]) && !g.fam, `${name}: the showroom opens on all three families side by side (${JSON.stringify(g)})`);
    await q.focus('.gallery a[data-fam="1"]'); await q.keyboard.press('Enter');
    const landed = await q.waitForFunction(() => document.querySelector('.fam.on')?.id === 'fibre' && document.activeElement?.textContent.trim() === 'Grade A: banana silk', null, { timeout: 6000 }).then(() => true, () => false);
    check(landed, `${name}: choosing a family from the showroom with the keyboard brings it on stage with focus on its first product`);
    await q.close();
  }
  { // each family stands on a plinth: its number and name, and arrows to the families either side (owner's references)
    const q = await ctx.newPage(); await q.goto(ORIGIN + '/'); await q.waitForTimeout(2000);
    await q.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; const e = document.getElementById('explore'); scrollTo(0, e.offsetTop + (e.offsetHeight - innerHeight) * 0.15); });
    await q.waitForSelector('#bamboo.on', { timeout: 10000 }).catch(() => {});
    const plinth = await q.evaluate(() => document.querySelector('#bamboo .plinth')?.innerText.replace(/\s+/g, ' ').trim() || '');
    check(/^01 \/ 03 Bamboo/.test(plinth), `${name}: the family on stage stands on a numbered plinth (${plinth})`);
    await q.click('#bamboo .plinth a[rel=next]');
    const moved = await q.waitForFunction(() => document.querySelector('.fam.on')?.id === 'fibre', null, { timeout: 8000 }).then(() => true, () => false);
    check(moved, `${name}: the plinth's next arrow brings the next family on stage`);
    await q.close();
  }
  // the drawer leaves with an exit animation, then the dialog closes (Escape and the close button alike)
  for (const how of ['Escape', 'the close button']) {
    await p.click('#bamboo.on .product >> nth=0'); await p.waitForTimeout(800);
    // record the dialog's states as they happen: on a slow runner the whole exit can finish before a later poll
    await p.evaluate(() => { const s = document.getElementById('productSheet'); window.__sheet = [];
      window.__sheetObs?.disconnect(); window.__sheetObs = new MutationObserver(() => window.__sheet.push(s.open ? ('closing' in s.dataset ? 'leaving' : 'open') : 'closed'));
      window.__sheetObs.observe(s, { attributes: true }); });
    if (how === 'Escape') await p.keyboard.press('Escape'); else await p.click('#productSheet .sheet-close button');
    const closed = await p.waitForFunction(() => !document.getElementById('productSheet').open, null, { timeout: 5000 }).then(() => true, () => false);
    const seq = await p.evaluate(() => window.__sheet.join(','));
    const leaving = /leaving.*closed/.test(seq);
    check(leaving && closed, `${name}: ${how} plays the drawer's exit, then closes it (leaving ${leaving}, closed ${closed})`);
  }
  await p.click('#bamboo.on .product >> nth=1'); await p.waitForTimeout(500);
  check(await p.evaluate(() => document.getElementById('productSheet').open), `${name}: a product opens its sheet`);
  check((await p.evaluate(() => document.getElementById('enquiryTray').hidden)), `${name}: the enquiry tray stays hidden while the enquiry is empty`);
  await p.click('#sheetAdd'); await p.waitForTimeout(300);
  check(await p.evaluate(() => !document.getElementById('enquiryTray').hidden && document.getElementById('trayCount').textContent === '1' && /Bamboo splits/.test(document.getElementById('trayItems').textContent)),
    `${name}: "Add to enquiry" in the spec drawer puts the product in the enquiry tray`);
  const after = await p.evaluate(() => { const q = document.getElementById('sheetQuote'), add = document.getElementById('sheetAdd'); return { quote: q.textContent.trim(), quotePrimary: !q.classList.contains('btn-ghost'), add: add.textContent.trim(), addGhost: add.classList.contains('btn-ghost'), ask: !!document.getElementById('sheetAsk'), status: document.getElementById('sheetStatus').textContent }; });
  check(after.quote === 'Request a quote' && after.quotePrimary && after.add === 'Added ✓' && after.addGhost && after.ask && after.status === 'Added. Your enquiry has 1 product.',
    `${name}: the drawer's main action is "Request a quote"; "Add to enquiry" confirms as "Added ✓" (${JSON.stringify(after)})`);
  await p.click('#sheetAsk');
  await p.waitForFunction(() => document.activeElement?.id === 'rifatInput', null, { timeout: 10000 }).catch(() => {});
  check((await p.evaluate(() => document.activeElement.id)) === 'rifatInput', `${name}: focus lands in Rifat's message field after "Ask Rifat"`);
  check(/Bamboo splits/.test(await p.textContent('#ticketList')), `${name}: the product from the sheet is in "Your enquiry"`);
  if (touch) { // phone: the ticket sits below the chat, so a collapsed summary above the input keeps it in view
    const sum = await p.evaluate(() => { const el = document.getElementById('rifatSummary'); return el && getComputedStyle(el).display !== 'none' ? el.textContent : null; });
    check(!!sum && /Bamboo splits/.test(sum) && /1 of 4/.test(sum), `${name}: a collapsed enquiry summary above Rifat's input shows the product and progress (${sum})`);
  }
  check(/guided mode/i.test(await p.textContent('#rifatMode')), `${name}: without the Pages Function Rifat says it is in guided mode`);

  // guided flow
  const say = async (t) => { await p.fill('#rifatInput', t); await p.press('#rifatInput', 'Enter'); await p.waitForTimeout(1500); };
  await say('5 tonnes'); await say('Japan'); await say('Test Buyer'); await say('not-an-email');
  check(/doesn.t look like an email/.test(await p.textContent('#rifatLog')), `${name}: Rifat rejects a malformed email`);
  await say('buyer@example.com'); await say('Skip'); await say('Nothing else');
  const ticket = await p.textContent('#ticketList');
  check(/5 tonnes/.test(ticket) && /Japan/.test(ticket) && /buyer@example\.com/.test(ticket), `${name}: Rifat fills quantity, destination and email`);
  check(/enquiry is ready/i.test(await p.textContent('#rifatLog')), `${name}: Rifat says the enquiry is ready`);
  check((await p.getAttribute('#waSend', 'aria-disabled')) === 'false', `${name}: WhatsApp is enabled once the enquiry is ready`);
  const wa = new URL(await p.getAttribute('#waSend', 'href'));
  check(wa.origin + wa.pathname === 'https://wa.me/8801878707910' && /Japan/.test(wa.searchParams.get('text') || ''), `${name}: WhatsApp opens SB Trading's number with the enquiry filled in`);
  check((await p.getAttribute('#waSend', 'target')) === '_blank', `${name}: WhatsApp opens in a new tab`);

  // plain form alternative
  await p.click('#formToggle'); await p.waitForTimeout(300);
  await p.fill('#f-qty', '-3'); await p.click('#enquiryForm button[type=submit]'); await p.waitForTimeout(400);
  check((await p.textContent('#e-quantity')).length > 0, `${name}: a negative quantity shows an inline error`);
  check((await p.evaluate(() => document.querySelectorAll('.err:not(:empty)').length)) >= 3, `${name}: empty required fields show inline errors`);
  check((await p.textContent('#summary')) === '', `${name}: an invalid form prepares nothing`);
  check((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, `${name}: no horizontal overflow`);

  if (!touch) {
    check(await p.evaluate(() => document.documentElement.classList.contains('has-3d')), `${name}: the 3D studies load`);
    // keyboard reaches every family: Tab past the last bamboo product lands on the first fibre product, and back
    // wait until the Bamboo family is the live one (an inert family cannot take focus), then focus its last product
    await toExplore(0.15); await p.waitForSelector('#bamboo.on', { timeout: 10000 }).catch(() => {});
    await p.focus('#bamboo .product >> nth=3');
    await p.waitForFunction(() => document.activeElement?.textContent.trim() === 'Woven mats', null, { timeout: 5000 }).catch(() => {});
    const focused = () => p.evaluate(() => document.activeElement?.textContent.trim() || document.activeElement?.tagName);
    await p.keyboard.press('Tab'); // past the products, to the plinth's next arrow
    const toArrow = await p.evaluate(() => document.activeElement?.getAttribute('aria-label') || '');
    await p.keyboard.press('Tab');
    await p.waitForFunction(() => document.activeElement?.textContent.trim() === 'Grade A: banana silk', null, { timeout: 5000 }).catch(() => {});
    const afterTab = await focused();
    check(toArrow === 'Next family: Banana fibre yarn' && afterTab === 'Grade A: banana silk', `${name}: Tab moves from the bamboo products to the plinth's next arrow, then into the fibre products (focus: ${toArrow} -> ${afterTab})`);
    await p.keyboard.press('Shift+Tab'); // back to Bamboo's plinth arrow, then its last product
    await p.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Next family: Banana fibre yarn', null, { timeout: 5000 }).catch(() => {});
    const backArrow = await p.evaluate(() => document.activeElement?.getAttribute('aria-label') || '');
    await p.keyboard.press('Shift+Tab');
    await p.waitForFunction(() => document.activeElement?.textContent.trim() === 'Woven mats', null, { timeout: 5000 }).catch(() => {});
    const afterShift = await focused();
    check(backArrow === 'Next family: Banana fibre yarn' && afterShift === 'Woven mats', `${name}: Shift+Tab returns through Bamboo's plinth arrow to its products (focus: ${backArrow} -> ${afterShift})`);
    await p.click('#soundToggle'); await p.waitForTimeout(1200);
    check((await p.evaluate(() => window.__ac)) === 1, `${name}: pressing Sound creates the audio context`);
    const playing = await p.waitForFunction(() => document.documentElement.dataset.score === 'playing', null, { timeout: 6000 }).then(() => true, () => false);
    check(playing, `${name}: pressing Sound starts the generated score`);
    const lit = await p.waitForFunction(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--audio')) > 0.05, null, { timeout: 8000 }).then(() => true, () => false);
    check(lit, `${name}: the score's level reaches the page's light (--audio rises)`);
    const rippled = await p.waitForFunction(() => document.querySelectorAll('.score-fx i').length > 0, null, { timeout: 12000 }).then(() => true, () => false);
    check(rippled, `${name}: each note shows as light where it sounds`);
    await toExplore(0.5); await p.waitForTimeout(4000);
    check(/^e\d$/.test(await p.evaluate(() => document.documentElement.dataset.scoreScene)), `${name}: the score follows the chapter (Explore harmony)`);
    await p.waitForFunction(() => document.querySelector('.studies')?.dataset.renderState === 'idle', null, { timeout: 15000 });
    const a = await p.evaluate(() => window.__draws); await p.waitForTimeout(1500); const b = await p.evaluate(() => window.__draws);
    check(b === a, `${name}: the 3D studies stop drawing after settling (${b - a} draw calls)`);
    await p.evaluate(() => window.dispatchEvent(new Event('resize')));
    // a redraw must happen (draw count rises); the 'active' state itself can be too brief to observe on a slow runner
    const redrew = await p.waitForFunction((before) => window.__draws > before, b, { timeout: 10000 }).then(() => true, () => false);
    const diag = redrew ? '' : await p.evaluate((before) => { const r = document.getElementById('explore').getBoundingClientRect();
      return ` [draws ${before}->${window.__draws}, class "${document.documentElement.className}", state ${document.querySelector('.studies')?.dataset.renderState}, explore top ${Math.round(r.top)} bottom ${Math.round(r.bottom)}, viewport ${innerWidth}x${innerHeight}]`; }, b);
    check(redrew, `${name}: the 3D studies redraw after a resize${diag}`);
    await p.waitForFunction(() => document.querySelector('.studies')?.dataset.renderState === 'idle', null, { timeout: 15000 }).catch(() => {});
    const resized = await p.evaluate(() => window.__draws); await p.waitForTimeout(1500);
    check((await p.evaluate(() => window.__draws)) === resized, `${name}: after the resize redraw the 3D studies return to idle`);
    await p.click('#soundToggle'); await p.waitForTimeout(600);
    check(await p.evaluate(() => document.documentElement.dataset.score === 'off' && parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--audio') || '0') === 0),
      `${name}: pressing Sound again stops the score and its light`);
  }
  check(errors.length === 0, `${name}: no page errors or failed loads${errors.length ? ' - ' + errors.slice(0, 2).join(' | ') : ''}`);
  check(external.length === 0, `${name}: no external requests${external.length ? ' - ' + external.slice(0, 2).join(' | ') : ''}`);
  await ctx.close();
}
await browser.close(); server.close();
console.log(failures ? `\n${failures} failing` : '\nall passing');
process.exit(failures ? 1 : 0);
