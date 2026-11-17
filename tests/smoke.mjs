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
    await q.route(/\/assets\/film\/[dm]\/0(0[1-9]|[12][0-9]|30)\.webp(\?|$)/, (r) => r.abort());
    await q.goto(ORIGIN + '/'); await q.waitForTimeout(2500);
    await q.evaluate(() => { const f = document.getElementById('film'); scrollTo(0, f.offsetTop + (f.offsetHeight - innerHeight) * (29 / 216)); });
    await q.waitForFunction(() => /generated footage, not/i.test(document.querySelector('.film-label').textContent), null, { timeout: 15000 }).catch(() => {});
    const t = await q.evaluate(() => document.querySelector('.film-label').textContent.trim());
    check(/generated footage, not SB Trading's own/.test(t) && !/Pexels/.test(t), `${name}: the label follows the frame drawn, not the frame asked for (${t})`);
    await q.close();
  }
  { // entering, the live 3D grove gives way to lines traced from the footage itself (on its stalks and leaves, not
    // beside them); the footage brightens under them and they dissolve before the first chapter
    const q = await ctx.newPage();
    await q.goto(ORIGIN + '/');
    await q.waitForFunction(() => document.documentElement.classList.contains('gate-live'), null, { timeout: 10000 }).catch(() => {});
    const at = async (x) => { await q.evaluate((v) => { const f = document.getElementById('film'); scrollTo({ top: f.offsetTop + (f.offsetHeight - innerHeight) * v, behavior: 'instant' }); }, x); await q.waitForTimeout(3000); };
    await at(0.075);
    // the film glides to the scroll position frame by frame; a slow machine takes longer, so wait for it to arrive
    await q.waitForFunction(() => Number(document.querySelector('.film-trace')?.dataset.want) >= 14, null, { timeout: 20000 }).catch(() => {});
    await q.waitForTimeout(600);
    const melt = await q.evaluate(() => {
      const t = document.querySelector('.film-trace'), f = document.querySelector('.film-canvas');
      if (!t) return { trace: false };
      const w = t.width, h = t.height, td = t.getContext('2d').getImageData(0, 0, w, h).data, fd = f.getContext('2d').getImageData(0, 0, w, h).data;
      const L = (i) => 0.2126 * fd[i] + 0.7152 * fd[i + 1] + 0.0722 * fd[i + 2];
      const grad = (x, y) => { const i = (y * w + x) * 4; return Math.abs(L(i + 4) - L(i - 4)) + Math.abs(L(i + w * 4) - L(i - w * 4)); };
      let n = 0, on = 0, all = 0, m = 0;
      for (let y = 2; y < h - 2; y += 2) for (let x = 2; x < w - 2; x += 2) {
        const g = grad(x, y); all += g; m++;
        if (td[(y * w + x) * 4 + 3] > 60) { n++; on += g; }
      }
      return { trace: true, n, ratio: +((on / Math.max(1, n)) / (all / m)).toFixed(2), frame: Number(t.dataset.frame), want: Number(t.dataset.want), same: w === f.width && h === f.height };
    });
    await at(0.25);
    const after = await q.evaluate(() => { const t = document.querySelector('.film-trace'); if (!t) return -1; const d = t.getContext('2d').getImageData(0, 0, t.width, t.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 24) n++; return n; });
    check(melt.trace && melt.same && melt.n > (touch ? 300 : 1500) && melt.ratio > 1.8 && Math.abs(melt.frame - melt.want) <= 1 && after === 0,
      `${name}: entering, the 3D grove gives way to lines traced on the footage's own bamboo, which dissolve by the first chapter (${JSON.stringify({ ...melt, after })})`);
    await q.close();
  }
  { // a click (or tap) during the opening skips it to the title, and is not taken as "Click to enter"
    const q = await ctx.newPage();
    await q.goto(ORIGIN + '/');
    await q.waitForFunction(() => document.querySelector('.gate-3d')?.dataset.phase === 'micro', null, { timeout: 5000 }).catch(() => {});
    const before = await q.evaluate(() => document.documentElement.classList.contains('gate-intro'));
    if (touch) await q.touchscreen.tap(viewport.width / 2, viewport.height * 0.3); else await q.mouse.click(viewport.width / 2, viewport.height * 0.3);
    await q.waitForTimeout(1500);
    // the title fades in over 1.1 s once the opening ends; a slow machine takes longer, so wait for it (up to 5 s)
    await q.waitForFunction(() => Number(getComputedStyle(document.querySelector('.gate h1')).opacity) > 0.95, null, { timeout: 5000 }).catch(() => {});
    const after = await q.evaluate(() => { const f = document.getElementById('film'), r = f.getBoundingClientRect();
      return { intro: document.documentElement.classList.contains('gate-intro'), phase: document.querySelector('.gate-3d')?.dataset.phase, title: Number(getComputedStyle(document.querySelector('.gate h1')).opacity), p: +(-r.top / (r.height - innerHeight)).toFixed(3), ac: window.__ac }; });
    check(before && !after.intro && after.phase === 'grove' && after.title > 0.95 && after.p < 0.01 && !after.ac,
      `${name}: a ${touch ? 'tap' : 'click'} during the opening skips to the title and does not enter the film (${JSON.stringify({ before, ...after })})`);
    await q.close();
  }
  { // the film is a journey after hatom.com: a gate drawn in fine lines, then a clean picture where only rings on the
    // materials, one subtitle line and small edge labels sit over the footage. Its own page, so Sound starts off below.
    const q = await ctx.newPage();
    // record each phase of the opening as it happens (a slow machine shows few frames; polling could miss one)
    await q.addInitScript(() => { window.__phases = []; new MutationObserver(() => { const c = document.querySelector('.gate-3d'); const ph = c?.dataset.phase, d = Number(c?.dataset.dist || 0);
      const last = window.__phases.at(-1); if (ph && (!last || last.phase !== ph)) window.__phases.push({ phase: ph, dist: d }); else if (last && ph === last.phase) last.max = Math.max(last.max || d, d); })
      .observe(document, { subtree: true, attributes: true, attributeFilter: ['data-phase', 'data-dist'] }); });
    await q.goto(ORIGIN + '/');
    { // the opening plays on its own: micro (inside the banana stem, among its fibres), macro (the whole banana plant),
      // then the camera moves across to the bamboo grove and the title fades in. The title waits for the camera.
      const cam = () => q.evaluate(() => { const c = document.querySelector('.gate-3d'), h = document.querySelector('.gate h1');
        return { intro: document.documentElement.classList.contains('gate-intro'), phase: c?.dataset.phase, dist: Number(c?.dataset.dist || 0), title: Number(getComputedStyle(h).opacity) }; });
      await q.waitForFunction(() => document.querySelector('.gate-3d')?.dataset.phase, null, { timeout: 5000 }).catch(() => {});
      const micro = await cam();
      await q.waitForFunction(() => !document.documentElement.classList.contains('gate-intro'), null, { timeout: 20000 }).catch(() => {});
      await q.waitForFunction(() => Number(getComputedStyle(document.querySelector('.gate h1')).opacity) > 0.95, null, { timeout: 5000 }).catch(() => {}); // the title fades in
      const rest = await cam();
      const seen = await q.evaluate(() => window.__phases);
      const order = seen.map((s) => s.phase), far = Math.max(0, ...seen.filter((s) => s.phase !== 'micro' && s.phase !== 'grove').map((s) => s.max || s.dist));
      const inOrder = order[0] === 'micro' && order.at(-1) === 'grove' && order.slice(1, -1).every((ph, i, a) => ['macro', 'cross'].includes(ph) && (i === 0 || a[i - 1] !== 'cross' || ph === 'cross'));
      check(micro.intro && micro.phase === 'micro' && micro.dist < 1 && micro.title < 0.1 && inOrder && order.length >= 3 && far > micro.dist * 3 && rest.phase === 'grove' && !rest.intro && rest.title > 0.95,
        `${name}: the opening zooms out from the banana's fibres to the whole plant, crosses to the bamboo grove, then shows the title (${JSON.stringify({ micro, order, far, rest })})`);
    }
    const prog = () => q.evaluate(() => { const f = document.getElementById('film'), r = f.getBoundingClientRect(); return +(-r.top / (r.height - innerHeight)).toFixed(3); });
    const gate = await q.evaluate(() => {
      const g = document.querySelector('.gate'), lines = [...g.querySelectorAll('.gate-art .ln')];
      const drawn = lines.filter((l) => parseFloat(getComputedStyle(l).strokeDashoffset) < 0.02).length;
      const visible = (el) => { if (!el) return false; const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05; };
      return { title: g.querySelector('h1').textContent.trim(), enter: visible(g.querySelector('.gate-enter')) && g.querySelector('.gate-enter').textContent.trim(), lines: lines.length, drawn,
        foot: /headphones/i.test(g.querySelector('.gate-foot').textContent), card: !!document.querySelector('.spec-card'),
        captions: [...document.querySelectorAll('#film .beat[data-ch]')].filter(visible).length, cards: visible(document.querySelector('#film .fam-cards')),
        inFilm: document.documentElement.classList.contains('in-film'), bar: Number(getComputedStyle(document.querySelector('.chapters')).opacity), ask: Number(getComputedStyle(document.querySelector('.top > .btn-small')).opacity),
        // links and buttons inside the chapters read to screen readers must not be keyboard stops while hidden (Codex on #20)
        hiddenStops: [...document.querySelectorAll('#film .beat[data-ch] a[href], #film .beat[data-ch] button')].filter((el) => el.getClientRects().length > 0 && !el.closest('[inert]')).map((el) => el.textContent.trim()) };
    });
    check(gate.hiddenStops.length === 0, `${name}: no link or button hidden in the film's chapters is a keyboard stop (${JSON.stringify(gate.hiddenStops)})`);
    check(gate.title === 'From leaf to fibre.' && gate.enter === 'Click to enter' && gate.lines > 40 && gate.drawn === gate.lines && gate.foot,
      `${name}: the film opens on a gate drawn in fine lines, with its title and "Click to enter" (${JSON.stringify({ title: gate.title, enter: gate.enter, lines: gate.lines, drawn: gate.drawn })})`);
    { // the gate is live 3D: a wireframe drawn every frame (counted on the canvas), turning toward the pointer
      const lit = () => q.evaluate(() => { const c = document.querySelector('.gate-3d'); if (!c) return { live: false };
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0, h = 0;
        for (let i = 3; i < d.length; i += 16) if (d[i] > 24) { n++; h = (h * 31 + i) >>> 0; }
        return { live: document.documentElement.classList.contains('gate-live'), n, h, frames: Number(c.dataset.frames || 0) }; });
      const w0 = await lit();
      if (!touch) { await q.mouse.move(60, 60); await q.waitForTimeout(1500); } else await q.waitForTimeout(1500);
      const w1 = await lit();
      check(w0.live && w0.n > 1500 && w1.frames > w0.frames && w1.h !== w0.h,
        `${name}: the gate is a live 3D wireframe, drawn every frame${touch ? '' : ' and turning toward the pointer'} (${JSON.stringify({ w0, w1 })})`);
    }
    check(!gate.card && gate.captions === 0 && !gate.cards && gate.inFilm && gate.bar === 0 && gate.ask === 0,
      `${name}: nothing is laid over the picture: no card, no captions, no family cards, and the chapter bar and Ask Rifat step aside (${JSON.stringify(gate)})`);
    // "Click to enter" is the gesture that turns Sound on; the camera flies to the first chapter as the narrator speaks
    await q.click('.gate-enter');
    await q.waitForFunction(() => { const f = document.getElementById('film'), r = f.getBoundingClientRect(); return Math.abs(-r.top / (r.height - innerHeight) - 0.125) < 0.004; }, null, { timeout: 8000 }).catch(() => {});
    await q.waitForFunction(() => document.querySelector('.hud-name').textContent !== '', null, { timeout: 5000 }).catch(() => {}); // the film eases in after the scroll
    const grove = await q.evaluate(() => ({ ac: window.__ac, sound: document.getElementById('soundToggle').getAttribute('aria-pressed'), sub: document.querySelector('.subtitle').textContent.trim(), on: document.querySelector('.subtitle').classList.contains('on'),
      voice: window.__story?.src.includes('/assets/voice/ch-grove.mp3') && !window.__story.paused, idx: document.querySelector('.hud-name').textContent }));
    check(grove.ac === 1 && grove.sound === 'true' && (await prog()) > 0.12 && grove.on && /^Everything SB Trading supplies begins as a living plant/.test(grove.sub) && grove.voice && grove.idx === 'The grove',
      `${name}: "Click to enter" turns Sound on and flies to the grove as the narrator speaks it, with its subtitle (${JSON.stringify(grove)})`);
    { // once the film is under way the gate's 3D stops drawing (it costs nothing while the footage plays)
      const frames = () => q.evaluate(() => Number(document.querySelector('.gate-3d')?.dataset.frames || 0));
      const f1 = await frames(); await q.waitForTimeout(900); const f2 = await frames();
      check(f1 > 0 && f2 === f1, `${name}: past the gate the live 3D stops drawing (${f1} -> ${f2} frames)`);
    }
    // "Click to continue" flies to the showroom: the products behind glass, each family's ring on its own case
    await q.click('.hud-next');
    await q.waitForFunction(() => document.querySelector('.hud-name').textContent === 'The showroom' && /^Behind the glass/.test(document.querySelector('.subtitle').textContent), null, { timeout: 8000 }).catch(() => {});
    await q.waitForTimeout(2600);
    const room = await q.evaluate(() => ({ idx: document.querySelector('.hud-n').textContent, sub: document.querySelector('.subtitle').textContent.trim(), rings: [...document.querySelectorAll('.spot.on .spot-name')].map((e) => e.textContent),
      tabbable: [...document.querySelectorAll('.spot.on')].every((s) => s.tabIndex === 0) && [...document.querySelectorAll('.spot:not(.on)')].every((s) => s.tabIndex === -1) }));
    room.p = await prog();
    check(Math.abs(room.p - 0.2315) < 0.004 && room.idx === '02' && /^Behind the glass, nine products in three families/.test(room.sub) && ['Bamboo', 'Banana fibre', 'Bark and leaves'].every((w) => room.rings.includes(w)) && room.rings.length === 3 && room.tabbable,
      `${name}: "Click to continue" rests on the showroom, the products behind glass, a ring on each family's case, reachable by keyboard only while shown (${JSON.stringify(room)})`);
    { // press and hold on a ring: the scene leans in on that material and a 3D glass board with its products fades in
      // while the narrator reads them; letting go returns the scene (and is not taken as a tap)
      const ring = await q.evaluate(() => { const r = document.querySelector('.spot.on[data-key="bamboo"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
      const cdp = touch ? await ctx.newCDPSession(q) : null;
      const press = async (down) => {
        if (touch) await cdp.send('Input.dispatchTouchEvent', { type: down ? 'touchStart' : 'touchEnd', touchPoints: down ? [{ x: ring.x, y: ring.y }] : [] });
        else { await q.mouse.move(ring.x, ring.y); if (down) await q.mouse.down(); else await q.mouse.up(); }
      };
      await press(true); await q.waitForTimeout(1400);
      const held = await q.evaluate(() => { const b = document.querySelector('.board'); return { on: !!b?.classList.contains('on'), title: b?.querySelector('.board-title')?.textContent, items: [...(b?.querySelectorAll('.board-list li') || [])].map((li) => li.textContent),
        zoom: getComputedStyle(document.querySelector('.film-canvas')).transform, sub: document.querySelector('.subtitle').textContent.trim(), others: [...document.querySelectorAll('.spot.on:not(.held)')].filter((s) => getComputedStyle(s).visibility === 'visible').length }; });
      await press(false); await q.waitForTimeout(1400);
      // the scene eases back over its transition; a slow machine is still finishing it, so wait (up to 5 s) for it to rest
      await q.waitForFunction(() => /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/.test(getComputedStyle(document.querySelector('.film-canvas')).transform), null, { timeout: 5000 }).catch(() => {});
      const gone = await q.evaluate(() => ({ on: !!document.querySelector('.board')?.classList.contains('on'), zoom: getComputedStyle(document.querySelector('.film-canvas')).transform, sub: document.querySelector('.subtitle').classList.contains('on'), story: !!window.__story && !window.__story.paused }));
      const flat = (m) => m === 'none' || m === 'matrix(1, 0, 0, 1, 0, 0)';
      check(held.on && held.title === 'Bamboo' && ['Bamboo poles', 'Bamboo splits', 'Ski poles', 'Woven mats'].every((p) => held.items.includes(p)) && !flat(held.zoom) && /^Bamboo: poles, splits/.test(held.sub) && held.others === 0,
        `${name}: holding the bamboo ring leans the scene in and fades in a glass board with bamboo's products as the narrator reads them (${JSON.stringify(held)})`);
      check(!gone.on && flat(gone.zoom) && !gone.sub && !gone.story, `${name}: letting go returns the scene, and the release is not taken as a tap (${JSON.stringify(gone)})`);
    }
    // a ring tells that material's story, with its words as the subtitle; pressing again stops it
    await q.click('.spot.on[data-key="bamboo"]');
    await q.waitForTimeout(1200);
    const told = await q.evaluate(() => ({ pressed: document.querySelector('.spot.on[data-key="bamboo"]').getAttribute('aria-pressed'), sub: document.querySelector('.subtitle').textContent.trim(), voice: window.__story?.src.includes('/assets/voice/bamboo.mp3') && !window.__story.paused }));
    await q.click('.spot.on[data-key="bamboo"]'); await q.waitForTimeout(400);
    const hushed = await q.evaluate(() => ({ pressed: document.querySelector('.spot.on[data-key="bamboo"]').getAttribute('aria-pressed'), playing: !!window.__story && !window.__story.paused, on: document.querySelector('.subtitle').classList.contains('on') }));
    check(told.pressed === 'true' && /^In Bangladesh, bamboo has held up homes/.test(told.sub) && told.voice && hushed.pressed === 'false' && !hushed.playing && !hushed.on,
      `${name}: the bamboo ring tells bamboo's story with subtitles, and stops on a second press (${JSON.stringify({ told, hushed })})`);
    // on to the hall: the specimen in the beam, under a plate over the footage's own prompt that says "Click to open"
    await q.click('.hud-next');
    await q.waitForFunction(() => document.querySelector('.hud-name').textContent === 'Inside', null, { timeout: 8000 }).catch(() => {});
    await q.waitForTimeout(2600);
    const inside = await q.evaluate(() => { const s = document.querySelector('.spot.on'); return { idx: document.querySelector('.hud-n').textContent, plate: s?.classList.contains('cover') && s.textContent.trim(), rings: document.querySelectorAll('.spot.on').length }; });
    inside.p = await prog();
    check(Math.abs(inside.p - 0.407) < 0.004 && inside.idx === '03' && /Click to open/.test(inside.plate || '') && inside.rings === 1,
      `${name}: inside, a plate over the footage's own prompt says "Click to open", and no family ring repeats (${JSON.stringify(inside)})`);
    // the plate opens it: the camera flies through the opening to the fibres twisting into yarn
    await q.click('.spot.on.cover');
    await q.waitForFunction(() => document.querySelector('.hud-name').textContent === 'Fibre to yarn', null, { timeout: 8000 }).catch(() => {});
    // the longest flight in the film: a slow machine is still in the air after the usual pause, so wait for it to land
    await q.waitForFunction(() => { const f = document.getElementById('film'), r = f.getBoundingClientRect(); return Math.abs(-r.top / (r.height - innerHeight) - 0.727) < 0.004; }, null, { timeout: 12000 }).catch(() => {});
    await q.waitForTimeout(600);
    const yarn = { p: await prog(), rings: await q.evaluate(() => document.querySelectorAll('.spot.on').length) };
    check(Math.abs(yarn.p - 0.727) < 0.004 && yarn.rings === 0, `${name}: opening it flies through the split to the fibres twisting into yarn, with no ring repeated (${JSON.stringify(yarn)})`);
    // a click anywhere on the picture moves on
    const stage = await q.evaluate(() => { const r = document.querySelector('.film-stage').getBoundingClientRect(); return { x: r.width * 0.5, y: r.height * 0.2 }; });
    if (touch) await q.touchscreen.tap(stage.x, stage.y); else await q.mouse.click(stage.x, stage.y);
    await q.waitForFunction(() => document.querySelector('.hud-name').textContent === 'Bark and leaves', null, { timeout: 8000 }).catch(() => {});
    await q.waitForTimeout(2600);
    check(Math.abs((await prog()) - 0.787) < 0.004, `${name}: a click on the picture flies to the next chapter (${await prog()})`);
    // after the last chapter, "Continue to the materials" leaves the film for Explore, and stays there
    for (const ch of ['The whole range']) { await q.click('.hud-next'); await q.waitForFunction((c) => document.querySelector('.hud-name').textContent === c, ch, { timeout: 8000 }).catch(() => {}); await q.waitForTimeout(2600); }
    const last = await q.evaluate(() => document.querySelector('.hud-next').textContent.trim());
    await q.click('.hud-next');
    // the flight takes 1.6 s; a slow machine takes longer, so wait (up to 12 s) for it to land, then check it stays
    await q.waitForFunction(() => Math.abs(document.getElementById('explore').getBoundingClientRect().top) < 40, null, { timeout: 12000 }).catch(() => {});
    await q.waitForTimeout(2000);
    const out = await q.evaluate(() => ({ explore: Math.round(document.getElementById('explore').getBoundingClientRect().top), inFilm: document.documentElement.classList.contains('in-film') }));
    check(last === 'Continue to the materials' && Math.abs(out.explore) < 40 && !out.inFilm, `${name}: past the last chapter, "Continue to the materials" lands in Explore and stays there (${JSON.stringify({ last, ...out })})`);
    await q.close();
  }
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(600);
  const toExplore = async (q) => { await p.evaluate((x) => { const e = document.getElementById('explore'); scrollTo(0, e.offsetTop + (e.offsetHeight - innerHeight) * x); }, q); await p.waitForTimeout(1800); };

  { // the storyteller: every family offers "Hear its story"; pressing it plays that family's narration (one voice for all
    // three) and shows its words as subtitles; pressing again stops it.
    const famY = (i) => p.evaluate((k) => { const e = document.getElementById('explore'); scrollTo(0, e.offsetTop + (e.offsetHeight - innerHeight) * (k / 3 + 0.12)); }, i);
    await famY(2); await p.waitForTimeout(1800);
    // with Sound on, arriving at a family tells its story once by itself; let that settle and stop it, so the presses
    // below start from silence (on a slow machine it can begin just as the test arrives)
    await p.waitForTimeout(800);
    if (await p.evaluate(() => document.querySelector('#bark .story')?.getAttribute('aria-pressed') === 'true')) { await p.evaluate(() => document.querySelector('#bark .story').click()); await p.waitForTimeout(500); }
    const btn = await p.evaluate(() => { const b = document.querySelector('#bark .story'); return b && !b.hidden ? b.textContent.trim() : null; });
    await p.evaluate(() => document.querySelector('#bark .story').click()); await p.waitForTimeout(1500);
    const playing = await p.evaluate(() => ({ pressed: document.querySelector('#bark .story').getAttribute('aria-pressed'), cap: document.querySelector('.story-caption').textContent.trim(), shown: !document.querySelector('.story-caption').hidden, audio: !!window.__story && !window.__story.paused }));
    await p.evaluate(() => document.querySelector('#bark .story').click()); await p.waitForTimeout(400);
    const stopped = await p.evaluate(() => ({ pressed: document.querySelector('#bark .story').getAttribute('aria-pressed'), shown: !document.querySelector('.story-caption').hidden }));
    check(btn === 'Hear its story' && playing.pressed === 'true' && playing.shown && /banana plant/i.test(playing.cap) && playing.audio && stopped.pressed === 'false' && !stopped.shown,
      `${name}: "Hear its story" narrates banana bark and leaves with subtitles, and stops on a second press (${JSON.stringify({ btn, playing, stopped })})`);
    { // switching Sound off also silences a story that Sound started (Codex finding on #18)
      await p.click('#soundToggle'); await p.waitForTimeout(800);
      await p.evaluate(() => document.querySelector('#bark .story').click()); await p.waitForTimeout(800);
      const on = await p.evaluate(() => !!window.__story && !window.__story.paused);
      await p.click('#soundToggle'); await p.waitForTimeout(500);
      const off = await p.evaluate(() => ({ playing: !!window.__story && !window.__story.paused, pressed: document.querySelector('#bark .story').getAttribute('aria-pressed') }));
      check(on && !off.playing && off.pressed === 'false', `${name}: switching Sound off stops the storyteller too (${JSON.stringify({ on, off })})`);
    }
    { // bamboo and banana fibre tell their own stories too, each from its own recording, with its own subtitles
      const told = [];
      for (const [i, fam, words] of [[0, 'bamboo', /bamboo has held up homes/i], [1, 'fibre', /banana plant fruits only once/i]]) {
        await famY(i); await p.waitForTimeout(1800);
        const offered = await p.evaluate((f) => { const b = document.querySelector(`#${f} .story`); return !!b && !b.hidden; }, fam);
        await p.evaluate((f) => document.querySelector(`#${f} .story`)?.click(), fam); await p.waitForTimeout(1200);
        const s = await p.evaluate(() => ({ cap: document.querySelector('.story-caption').textContent.trim(), audio: !!window.__story && !window.__story.paused, src: window.__story?.src || '' }));
        await p.evaluate((f) => document.querySelector(`#${f} .story`)?.click(), fam); await p.waitForTimeout(300);
        told.push({ fam, offered, cap: s.cap.slice(0, 40), audio: s.audio, own: s.src.includes(`/voice/${fam}.mp3`), ok: offered && words.test(s.cap) && s.audio && s.src.includes(`/voice/${fam}.mp3`) });
      }
      check(told.every((t) => t.ok), `${name}: bamboo and banana fibre each tell their own story, with subtitles (${JSON.stringify(told)})`);
    }
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
  { // closing a product steps back over its address, and the browser lands that step a moment later: a product opened
    // at once must still be the one shown, and closing it must leave the drawer closed (the late step used to land on the
    // old product's address and reopen it; on CI, closing then reopened an earlier product)
    const q = await ctx.newPage(); await q.goto(ORIGIN + '/'); await q.waitForTimeout(1500);
    const sheetOpen = () => q.evaluate(() => document.getElementById('productSheet').open);
    await q.evaluate(() => document.getElementById('p-bamboo-poles').click());
    await q.waitForFunction(() => document.getElementById('productSheet').open, null, { timeout: 5000 }).catch(() => {});
    await q.waitForTimeout(700); await q.keyboard.press('Escape');
    await q.waitForFunction(() => !document.getElementById('productSheet').open, null, { timeout: 5000 }).catch(() => {});
    await q.evaluate(() => document.getElementById('p-banana-leaves').click());
    await q.waitForFunction(() => document.getElementById('productSheet').open && location.hash === '#p-banana-leaves', null, { timeout: 6000 }).catch(() => {});
    await q.waitForTimeout(500);
    const shown = await q.evaluate(() => ({ open: document.getElementById('productSheet').open, title: document.getElementById('sheetTitle').textContent, hash: location.hash }));
    await q.keyboard.press('Escape');
    await q.waitForFunction(() => !document.getElementById('productSheet').open, null, { timeout: 6000 }).catch(() => {});
    await q.waitForTimeout(1500); // and it stays closed
    const after = { open: await sheetOpen(), hash: await q.evaluate(() => location.hash) };
    check(shown.open && shown.title === 'Banana leaves' && shown.hash === '#p-banana-leaves' && !after.open && after.hash === '',
      `${name}: a product opened just after closing another is the one shown, and closing it leaves the drawer closed (${JSON.stringify({ shown, after })})`);
    // the same while the first drawer is still sliding out
    await q.evaluate(() => document.getElementById('p-bamboo-poles').click());
    await q.waitForFunction(() => document.getElementById('productSheet').open, null, { timeout: 5000 }).catch(() => {});
    await q.waitForTimeout(700); await q.keyboard.press('Escape'); await q.waitForTimeout(60);
    await q.evaluate(() => document.getElementById('p-banana-leaves').click());
    await q.waitForFunction(() => document.getElementById('productSheet').open && location.hash === '#p-banana-leaves', null, { timeout: 6000 }).catch(() => {});
    await q.waitForTimeout(500);
    const mid = await q.evaluate(() => ({ open: document.getElementById('productSheet').open, title: document.getElementById('sheetTitle').textContent, hash: location.hash }));
    await q.keyboard.press('Escape');
    await q.waitForFunction(() => !document.getElementById('productSheet').open, null, { timeout: 6000 }).catch(() => {});
    await q.waitForTimeout(1500); // and it stays closed
    const midAfter = { open: await sheetOpen(), hash: await q.evaluate(() => location.hash) };
    check(mid.open && mid.title === 'Banana leaves' && mid.hash === '#p-banana-leaves' && !midAfter.open && midAfter.hash === '',
      `${name}: a product opened while another is still sliding out is the one shown, at its own address (${JSON.stringify({ mid, midAfter })})`);
    await q.close();
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
    { // the drawer still closes when its exit animation cannot run (a starved software renderer on CI, #18, or a hidden tab):
      // here every animation is paused the moment Escape is pressed (so it never finishes), and the dialog must still close
      // on its own: the code allows 0.6 s; a loaded machine fires that timer late, so this waits up to 3 s
      await q.evaluate(() => document.getElementById('p-banana-leaves').click());
      await q.waitForFunction(() => document.getElementById('productSheet').open, null, { timeout: 5000 }).catch(() => {});
      await q.waitForTimeout(900);
      await q.keyboard.press('Escape');
      await q.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
      await q.waitForFunction(() => !document.getElementById('productSheet').open, null, { timeout: 3000 }).catch(() => {});
      const stuck = await q.evaluate(() => ({ open: document.getElementById('productSheet').open, parent: document.getElementById('enquiryForm').parentElement.className }));
      check(!stuck.open && stuck.parent === 'form-alt', `${name}: the drawer closes on its own even when its exit animation cannot run (${JSON.stringify(stuck)})`);
    }
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
  { // Rifat appears at the end of the journey: his portrait in a cyan ring, always labelled AI, and his face in the chat bar.
    // His ring lights once the page has scrolled him into view; "Ask Rifat" focuses the input at about the same moment
    // (a near-tie measured at ~1 s on a phone, scroll still moving), so wait for the arrival rather than read mid-scroll
    await p.waitForFunction(() => document.querySelector('.enquire .presence')?.classList.contains('here'), null, { timeout: 8000 }).catch(() => {});
    const pres = await p.evaluate(() => { const f = document.querySelector('.enquire .presence'), img = f?.querySelector('img'), r = img?.getBoundingClientRect();
      return { here: f?.classList.contains('here'), loaded: !!img?.complete && img.naturalWidth > 0, w: Math.round(r?.width || 0), ai: f?.querySelector('.ai-tag')?.textContent.trim(), alt: img?.alt || '',
        face: !!document.querySelector('.rifat-top .orb img')?.naturalWidth }; });
    check(pres.here && pres.loaded && pres.w >= 140 && pres.ai === 'AI' && /AI assistant/.test(pres.alt) && pres.face, `${name}: Rifat appears in his ring, labelled AI, with his face in the chat bar (${JSON.stringify(pres)})`);
  }
  { // even without the AI, Rifat answers questions from its knowledge base (assets/rifat-knowledge.js), then carries on
    const before = (await p.textContent('#rifatLog')).length;
    await say('How does ordering work?');
    const said = (await p.textContent('#rifatLog')).slice(before);
    check(/three steps/i.test(said) && /quotation/i.test(said), `${name}: in guided mode Rifat answers "How does ordering work?" from its knowledge base (${said.slice(0, 90).replace(/\s+/g, ' ')})`);
  }
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
      // On a software renderer the GPU process can be saturated; if this capture times out, say what the page was doing
      // (frame rate, long tasks, 3D state, renderer) before failing, so a CI-only stall leaves evidence (#18).
      // CI's software renderer has stalled a capture while the page stayed healthy (60 fps, 3D idle): record what the page
      // was doing, then try the capture once more; the pixel comparison below still has to pass on real captures.
      const diag = () => Promise.race([p.evaluate(() => new Promise((r) => { let n = 0; const t = performance.now(); const f = () => { n++; if (performance.now() - t < 2000) requestAnimationFrame(f); else r({ fps: n / 2, cls: document.documentElement.className, state: document.querySelector('.studies')?.dataset.renderState, dialogs: [...document.querySelectorAll('dialog[open]')].map((d) => d.id), media: [...document.querySelectorAll('audio, video')].filter((m) => !m.paused).length + (window.__story && !window.__story.paused ? 1 : 0), animations: document.getAnimations().filter((a) => a.playState === 'running').length, renderer: (() => { const g = document.createElement('canvas').getContext('webgl2'), d = g?.getExtension('WEBGL_debug_renderer_info'); return d ? String(g.getParameter(d.UNMASKED_RENDERER_WEBGL)) : 'none'; })() }); }; requestAnimationFrame(f); })), new Promise((r) => setTimeout(() => r('page did not answer within 20 s'), 20000))]);
      const shot = (o) => p.screenshot({ ...o, timeout: 30000 }).catch(async (err) => {
        console.log('DIAG screenshot timeout (trying once more):', JSON.stringify(await diag()));
        return p.screenshot({ ...o, timeout: 30000 }).catch(async (again) => { console.log('DIAG second capture timeout:', JSON.stringify(await diag())); throw again; });
      });
      const withObj = (await shot({ clip: box })).toString('base64');
      await p.evaluate(() => { document.querySelector('.studies').style.visibility = 'hidden'; });
      const without = (await shot({ clip: box })).toString('base64');
      await p.evaluate(() => { document.querySelector('.studies').style.visibility = ''; });
      const drawn = await p.evaluate(async ([a, b]) => {
        const px = async (s) => { const im = new Image(); im.src = 'data:image/png;base64,' + s; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, c.width, c.height).data; };
        const [d1, d2] = await Promise.all([px(a), px(b)]); let n = 0;
        for (let i = 0; i < d1.length; i += 4) if (Math.abs(d1[i] - d2[i]) + Math.abs(d1[i + 1] - d2[i + 1]) + Math.abs(d1[i + 2] - d2[i + 2]) > 60) n++;
        return +(n / (d1.length / 4)).toFixed(3);
      }, [withObj, without]);
      check(st.arch === '0' && st.inExhibit && st.ready === '0' && drawn > 0.08, `${name}: the family on stage is a 3D cut-out drawn in WebGL in place of the photo (${JSON.stringify(st)}, ${Math.round(drawn * 100)}% of the exhibit drawn)`);
    }
    { // a lost WebGL context (GPU reset, too many contexts) must give the products back their photographs (Codex finding on
      // #18); on its own page, so the 3D in the main page stays alive for the checks that follow
      const q = await ctx.newPage();
      await q.goto(ORIGIN + '/'); await q.waitForTimeout(1500);
      await q.evaluate(() => { const e = document.getElementById('explore'); scrollTo(0, e.offsetTop + (e.offsetHeight - innerHeight) * 0.15); });
      await q.waitForFunction(() => document.documentElement.classList.contains('has-3d'), null, { timeout: 20000 }).catch(() => {});
      await q.waitForTimeout(1000);
      const lost = await q.evaluate(async () => {
        document.querySelector('.studies').getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
        await new Promise((r) => setTimeout(r, 400));
        return { has3d: document.documentElement.classList.contains('has-3d'), no3d: document.documentElement.classList.contains('no-3d'), arch: getComputedStyle(document.querySelector('#bamboo .arch')).opacity };
      });
      check(!lost.has3d && lost.no3d && lost.arch === '1', `${name}: when the WebGL context is lost, the product photographs come back (${JSON.stringify(lost)})`);
      await q.close();
    }
    { // on a slow machine (CI's software renderer ran this page at 1 frame a second, #18) the 3D must still come to rest
      // soon after the visitor stops: easing is measured in time, not frames. Frame-based easing needed ~50 frames, which
      // at 1 fps kept the page drawing for close to a minute. Here frames are fed 1 s apart, as on that machine.
      const q = await ctx.newPage();
      await q.goto(ORIGIN + '/'); await q.waitForTimeout(800);
      const frames = await q.evaluate(async () => {
        const { createSpecimens } = await import('/assets/vendor/specimens.js');
        const c = document.createElement('canvas'); c.width = 400; c.height = 500;
        const sp = createSpecimens(c, { low: true }); sp.setSize(400, 500); await sp.whenReady(0);
        let now = 1000; sp.render({ fam: 0, t: 0.5, pointer: [0, 0], now, settle: true });
        for (let i = 0; i < 6; i++) sp.render({ fam: 0, t: 0.95, pointer: [0.5, 0.4], now: (now += 16) }); // the visitor turns it
        let n = 0; while (n < 120 && sp.render({ fam: 0, t: 0.95, pointer: [0, 0], now: (now += 1000), settle: true })) n++;
        return n + 1;
      });
      check(frames <= 3, `${name}: at 1 frame a second, the 3D comes to rest within 3 frames of the last input (${frames} frames)`);
      await q.close();
    }
    // keyboard reaches every family: Tab past the last bamboo product reaches its story, the plinth's next arrow, then
    // the first fibre product, and back the same way
    // wait until the Bamboo family is the live one (an inert family cannot take focus), then focus its last product
    await toExplore(0.15); await p.waitForSelector('#bamboo.on', { timeout: 10000 }).catch(() => {});
    await p.focus('#bamboo .product >> nth=3');
    await p.waitForFunction(() => document.activeElement?.textContent.trim() === 'Woven mats', null, { timeout: 5000 }).catch(() => {});
    const focused = () => p.evaluate(() => document.activeElement?.textContent.trim() || document.activeElement?.tagName);
    await p.keyboard.press('Tab'); // past the products, to the family's story
    const toStory = await focused();
    await p.keyboard.press('Tab'); // then the plinth's next arrow
    const toArrow = await p.evaluate(() => document.activeElement?.getAttribute('aria-label') || '');
    await p.keyboard.press('Tab');
    await p.waitForFunction(() => document.activeElement?.textContent.trim() === 'Grade A: banana silk', null, { timeout: 5000 }).catch(() => {});
    const afterTab = await focused();
    check(toStory === 'Hear its story' && toArrow === 'Next family: Banana fibre yarn' && afterTab === 'Grade A: banana silk', `${name}: Tab moves from the bamboo products to its story, the plinth's next arrow, then into the fibre products (focus: ${toStory} -> ${toArrow} -> ${afterTab})`);
    await p.keyboard.press('Shift+Tab'); // back to Bamboo's plinth arrow, then its last product
    await p.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Next family: Banana fibre yarn', null, { timeout: 5000 }).catch(() => {});
    const backArrow = await p.evaluate(() => document.activeElement?.getAttribute('aria-label') || '');
    await p.keyboard.press('Shift+Tab');
    const backStory = await focused();
    await p.keyboard.press('Shift+Tab');
    await p.waitForFunction(() => document.activeElement?.textContent.trim() === 'Woven mats', null, { timeout: 5000 }).catch(() => {});
    const afterShift = await focused();
    check(backArrow === 'Next family: Banana fibre yarn' && backStory === 'Hear its story' && afterShift === 'Woven mats', `${name}: Shift+Tab returns through Bamboo's plinth arrow and story to its products (focus: ${backArrow} -> ${backStory} -> ${afterShift})`);
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
// Android hero regression: accidental text selection and constrained phone viewports.
for (const [width, height] of [[320, 568], [390, 844]]) {
  const mobileContext = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(ORIGIN + '/', { waitUntil: 'domcontentloaded' });
  await mobilePage.evaluate(async () => { await document.fonts.ready; });
  const layout = await mobilePage.evaluate(() => {
    const box = (el) => el.getBoundingClientRect();
    const headline = document.querySelector('.beat-hero h1');
    const heading = box(headline), header = box(document.querySelector('.top'));
    const action = box(document.querySelector('.beat-hero .hero-actions'));
    const label = box(document.querySelector('.film-label'));
    const controls = [...document.querySelectorAll('.top > .brand, .top > .menu-toggle, .top > .sound-toggle, .top > .btn')]
      .filter((el) => getComputedStyle(el).display !== 'none').map(box);
    const bounds = ({ x, y, width, height }) => [Math.round(x), Math.round(y), Math.round(width), Math.round(height)];
    return {
      checks: {
        noTitleSelection: getComputedStyle(headline).userSelect === 'none',
        headlineFits: heading.left >= 0 && heading.right <= innerWidth && headline.scrollWidth <= headline.clientWidth + 1,
        controlsFit: controls.every((r) => r.left >= 0 && r.right <= innerWidth),
        controlsSeparated: controls.every((r, i) => i === 0 || r.left >= controls[i - 1].right - 1),
        headlineClearOfHeader: heading.top >= header.bottom + 8,
        sourceClearOfAction: action.bottom + 8 <= label.top,
        sourceVisible: label.left >= 0 && label.right <= innerWidth && label.bottom <= innerHeight,
      },
      boxes: { heading: bounds(heading), header: bounds(header), action: bounds(action), label: bounds(label), controls: controls.map(bounds) },
    };
  });
  for (const [rule, passed] of Object.entries(layout.checks)) check(passed, `phone ${width}x${height}: ${rule}${passed ? '' : ' (' + JSON.stringify(layout.boxes) + ')'}`);
  await mobileContext.close();
}
await browser.close(); server.close();
console.log(failures ? `\n${failures} failing` : '\nall passing');
process.exit(failures ? 1 : 0);
