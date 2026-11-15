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
  // the film is the owner's reference journey (tools/build-film.py): generated footage throughout, labelled as such
  const topLabel = await labelAt(0.02, /generated footage/);
  check(/^This shot: generated footage, not SB Trading's own\.$/.test(topLabel), `${name}: from the first frame (the bamboo grove) the label names generated footage (${topLabel})`);
  const dustLit = await p.evaluate(() => { const c = document.querySelector('.dust'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++; return n; });
  check(dustLit > 20, `${name}: dust motes are drawn over the opening (${dustLit} lit pixels)`);
  const shots = [[0.25, /generated footage/i], [0.5, /generated footage/i], [0.95, /generated footage/i]];
  const seen = [];
  for (const [x, want] of shots) { const t = await labelAt(x, want); seen.push(`${x}: ${t}`); if (!want.test(t) || !/not SB Trading's own/.test(t) || /Pexels|stock/i.test(t)) seen.push('MISMATCH'); }
  check(!seen.includes('MISMATCH'), `${name}: through the whole film the label names generated footage and never stock (${seen.filter((s) => s !== 'MISMATCH').join(' | ')})`);
  { // the label follows the frame actually on the canvas: with frames 1-30 failing to load, frame 30 is drawn from the
    // nearest loaded frame and the label still names that frame's source (Codex finding on #16)
    const q = await ctx.newPage();
    await q.route(/\/assets\/film\/[dm]\/0(0[1-9]|[12][0-9]|30)\.webp$/, (r) => r.abort());
    await q.goto(ORIGIN + '/'); await q.waitForTimeout(2500);
    await q.evaluate(() => { const f = document.getElementById('film'); scrollTo(0, f.offsetTop + (f.offsetHeight - innerHeight) * (29 / 195)); });
    await q.waitForFunction(() => /generated footage, not/i.test(document.querySelector('.film-label').textContent), null, { timeout: 15000 }).catch(() => {});
    const t = await q.evaluate(() => document.querySelector('.film-label').textContent.trim());
    check(/generated footage, not SB Trading's own/.test(t) && !/Pexels/.test(t), `${name}: the label follows the frame drawn, not the frame asked for (${t})`);
    await q.close();
  }
  { // the specimen card drawn into the beam shot is blurred out of the footage; a real card with SB Trading's facts and
    // working buttons sits where it was (desktop: it follows the drawn card's track; phone: pinned near the bottom)
    const cardAt = async (q) => {
      await p.evaluate((x) => { const f = document.getElementById('film'); scrollTo(0, f.offsetTop + (f.offsetHeight - innerHeight) * x); }, q);
      await p.waitForTimeout(1600);
      return p.evaluate(() => { const c = document.querySelector('.spec-card'), r = c.getBoundingClientRect(), cs = getComputedStyle(c);
        return { shown: cs.visibility === 'visible' && Number(cs.opacity) > 0.9, top: r.top / innerHeight, left: r.left / innerWidth, right: r.right / innerWidth, bottom: r.bottom / innerHeight,
          text: c.innerText.replace(/\s+/g, ' ').trim(), links: [...c.querySelectorAll('a')].map((a) => a.getAttribute('href')) }; });
    };
    const a = await cardAt(0.3), b = await cardAt(0.65);
    const placed = touch ? a.bottom <= 0.98 && a.top > 0.45 : a.left > 0.2 && a.right < 0.85 && a.top > 0.5 && a.bottom <= 1.001;
    check(a.shown && placed && /Origin Bangladesh/i.test(a.text) && /Families 03/i.test(a.text) && /Products 09/i.test(a.text) && !/Banglies|Dadoin/i.test(a.text) && a.links.join() === '#explore,#enquire',
      `${name}: in the beam a real specimen card (Bangladesh, 03 families, 09 products, Explore, Ask Rifat) covers the drawn one (${JSON.stringify(a)})`);
    check(!b.shown, `${name}: the card leaves once the specimen splits open (${JSON.stringify({ shown: b.shown })})`);
  }
  { // the footage says "hold or scroll to split": in the beam, pressing and holding on the film plays it forward to the split
    await p.evaluate(() => { const f = document.getElementById('film'); scrollTo(0, f.offsetTop + (f.offsetHeight - innerHeight) * 0.3); });
    await p.waitForTimeout(1200);
    const prog = () => p.evaluate(() => { const f = document.getElementById('film'), r = f.getBoundingClientRect(); return -r.top / (r.height - innerHeight); });
    const before = await prog();
    const box = await p.evaluate(() => { const r = document.querySelector('.film-stage').getBoundingClientRect(); return { x: r.width * 0.5, y: r.height * 0.3 }; });
    if (touch) { await p.touchscreen.tap(box.x, box.y); } // a phone has no mouse; holding there is a long touch, tested by hand
    else { await p.mouse.move(box.x, box.y); await p.mouse.down(); await p.waitForTimeout(3000); await p.mouse.up(); }
    await p.waitForTimeout(400);
    const after = await prog();
    if (!touch) check(before < 0.35 && after > 0.55 && after < 0.65, `${name}: holding on the beam plays the film forward to the split (${before.toFixed(2)} -> ${after.toFixed(2)})`);
    const hint = await p.evaluate(() => document.querySelector('.spec-hint').textContent.trim());
    check(/hold or scroll/i.test(hint), `${name}: the card says how to split it (${hint})`);
  }
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(600);
  const toExplore = async (q) => { await p.evaluate((x) => { const e = document.getElementById('explore'); scrollTo(0, e.offsetTop + (e.offsetHeight - innerHeight) * x); }, q); await p.waitForTimeout(1800); };

  { // the storyteller: a family with a recorded narration offers "Hear its story"; pressing it plays the narration and
    // shows its words as subtitles; pressing again stops it. Families without a recording show no button.
    const famY = (i) => p.evaluate((k) => { const e = document.getElementById('explore'); scrollTo(0, e.offsetTop + (e.offsetHeight - innerHeight) * (k / 3 + 0.12)); }, i);
    await famY(2); await p.waitForTimeout(1800);
    const btn = await p.evaluate(() => { const b = document.querySelector('#bark .story'); return b && !b.hidden ? b.textContent.trim() : null; });
    await p.evaluate(() => document.querySelector('#bark .story').click()); await p.waitForTimeout(1500);
    const playing = await p.evaluate(() => ({ pressed: document.querySelector('#bark .story').getAttribute('aria-pressed'), cap: document.querySelector('.story-caption').textContent.trim(), shown: !document.querySelector('.story-caption').hidden, audio: !!window.__story && !window.__story.paused }));
    await p.evaluate(() => document.querySelector('#bark .story').click()); await p.waitForTimeout(400);
    const stopped = await p.evaluate(() => ({ pressed: document.querySelector('#bark .story').getAttribute('aria-pressed'), shown: !document.querySelector('.story-caption').hidden }));
    const noAudio = await p.evaluate(() => document.querySelector('#bamboo .story')?.hidden !== false);
    check(btn === 'Hear its story' && playing.pressed === 'true' && playing.shown && /banana plant/i.test(playing.cap) && playing.audio && stopped.pressed === 'false' && !stopped.shown && noAudio,
      `${name}: "Hear its story" narrates banana bark and leaves with subtitles, and stops on a second press (${JSON.stringify({ btn, playing, stopped, noAudio })})`);
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(600);
  }
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
  { // Explore is a bright showroom (owner's reference 97f87dc2): light walls, ink text, an ink header over it. The film
    // already ends in the lit gallery, so the showroom is not darkened on the way in; it dims to dusk on the way out
    const q = await ctx.newPage(); await q.goto(ORIGIN + '/'); await q.waitForTimeout(2000);
    await q.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; const e = document.getElementById('explore'); scrollTo(0, e.offsetTop - innerHeight * 0.6); });
    await q.waitForTimeout(800);
    const entering = await q.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.dawn')).opacity));
    await q.evaluate(() => { const e = document.getElementById('explore'); scrollTo(0, e.offsetTop + (e.offsetHeight - innerHeight) * 0.15); });
    await q.waitForSelector('#bamboo.on', { timeout: 10000 }).catch(() => {}); await q.waitForTimeout(1500);
    const s = await q.evaluate(() => {
      const lum = (c) => { const [r, g, b] = c.match(/[\d.]+/g).map(Number); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
      return { wall: +lum(getComputedStyle(document.querySelector('.explore-stage')).backgroundColor).toFixed(2), h3: +lum(getComputedStyle(document.querySelector('.fam.on h3')).color).toFixed(2),
        header: document.documentElement.classList.contains('light-top'), logo: getComputedStyle(document.querySelector('.brand-mark-ink')).display !== 'none' };
    });
    await q.evaluate(() => { const e = document.getElementById('explore'); scrollTo(0, e.offsetTop + e.offsetHeight - innerHeight * 0.4); });
    await q.waitForTimeout(800);
    const leaving = await q.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.dawn')).opacity));
    check(entering < 0.05 && leaving > 0.4 && s.wall > 0.85 && s.h3 < 0.2 && s.header && s.logo,
      `${name}: Explore is a bright showroom with ink text and an ink header, entered in the light and left into dusk (entering ${entering.toFixed(2)}, leaving ${leaving.toFixed(2)}, ${JSON.stringify(s)})`);
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
    { // each family is a 3D cut-out of SB Trading's own photograph, drawn in WebGL (three.js) on a pedestal in a glass
      // case, not the flat photo (owner's request); the photo stays in the page for no-WebGL and reduced motion
      await toExplore(0.15); await p.waitForSelector('#bamboo.on', { timeout: 10000 }).catch(() => {});
      await p.waitForFunction(() => document.querySelector('.studies')?.dataset.specimen === '0', null, { timeout: 20000 }).catch(() => {});
      await p.mouse.move(700, 400); await p.mouse.move(760, 430); await p.waitForTimeout(1200);
      const st = await p.evaluate(() => ({ arch: getComputedStyle(document.querySelector('#bamboo .arch')).opacity, inExhibit: !!document.querySelector('#bamboo .exhibit .studies'), ready: document.querySelector('.studies').dataset.specimen }));
      const box = await p.evaluate(() => { const r = document.querySelector('#bamboo .exhibit').getBoundingClientRect(); return { x: Math.max(0, r.left), y: Math.max(0, r.top), width: Math.min(r.width, innerWidth - r.left), height: Math.min(r.height, innerHeight - r.top) }; });
      const withObj = (await p.screenshot({ clip: box })).toString('base64');
      await p.evaluate(() => { document.querySelector('.studies').style.visibility = 'hidden'; });
      const without = (await p.screenshot({ clip: box })).toString('base64');
      await p.evaluate(() => { document.querySelector('.studies').style.visibility = ''; });
      const drawn = await p.evaluate(async ([a, b]) => {
        const px = async (s) => { const im = new Image(); im.src = 'data:image/png;base64,' + s; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, c.width, c.height).data; };
        const [d1, d2] = await Promise.all([px(a), px(b)]); let n = 0;
        for (let i = 0; i < d1.length; i += 4) if (Math.abs(d1[i] - d2[i]) + Math.abs(d1[i + 1] - d2[i + 1]) + Math.abs(d1[i + 2] - d2[i + 2]) > 60) n++;
        return +(n / (d1.length / 4)).toFixed(3);
      }, [withObj, without]);
      check(st.arch === '0' && st.inExhibit && st.ready === '0' && drawn > 0.08, `${name}: the family on stage is a 3D cut-out drawn in WebGL in place of the photo (${JSON.stringify(st)}, ${Math.round(drawn * 100)}% of the exhibit drawn)`);
    }
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
