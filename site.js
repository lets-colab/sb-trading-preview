// SB Trading · Materials in Motion (client review draft).
// One loop reads the scroll position and drives: the film (WebP frames on a canvas, stages 01–03), the pinned
// Explore stage (three families in arched windows, stage 04), the ordering fibre line, the chapter bar, and the
// opt-in sound. Motion (motion.dev, MIT) runs reveals; Lenis (MIT) smooths wheel scrolling. Rifat (stage 05) lives
// in assets/rifat.js. All content is in the HTML: without JavaScript, or with reduced motion, it reads as a document.
import { createRifat } from './assets/rifat.js';

const root = document.documentElement;
root.classList.add('js');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
if (!reduced) root.classList.add('motion');
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const progressOf = (el) => { const r = el.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight)); };
const pointer = [0, 0], target = [0, 0];
let lastInput = 0; // the 3D studies draw only while the visitor scrolls or moves the pointer, then settle and stop

// ------------------------------------------------------------------ sound (opt-in, generated in the browser)
// Off until the visitor asks: the click creates the audio context (browsers require a gesture); sound.js loads then.
// With sound on, a generated score plays under the cues. Its chord follows the chapter, its air follows scroll speed,
// and two visuals answer it: --audio (its live level) brightens the light, and each mallet note leaves a ripple of
// light where it sounds. Reduced motion keeps the music but drops both visuals.
const sound = (() => {
  const btn = $('#soundToggle'), hint = $('#soundHint'), fx = $('.score-fx');
  let actx = null, engine = null, on = false, hinted = false, scene = { chapter: 0, family: 0 }, raf = 0;
  const guard = (fn) => { try { fn(); } catch (e) { console.error('sound stopped:', e); engine = null; actx?.suspend().catch(() => {}); } };
  root.dataset.score = 'off';
  function light() { // runs only while the score plays and the tab is visible
    raf = 0;
    if (!on || !engine || document.hidden || reduced) return;
    root.style.setProperty('--audio', engine.level().toFixed(3));
    raf = requestAnimationFrame(light);
  }
  function ripple(n) {
    if (reduced || !fx) return;
    setTimeout(() => {
      if (!on || document.hidden || fx.childElementCount > 7) return;
      const i = document.createElement('i');
      i.style.left = `${(n.x * 100).toFixed(1)}%`; i.style.top = `${(n.y * 100).toFixed(1)}%`;
      i.style.setProperty('--v', n.v.toFixed(2));
      i.addEventListener('animationend', () => i.remove(), { once: true });
      fx.appendChild(i);
    }, Math.max(0, (n.at - actx.currentTime) * 1000));
  }
  function start() {
    guard(() => { engine.scene(scene); engine.music(true); });
    root.dataset.score = 'playing';
    if (!raf) raf = requestAnimationFrame(light);
  }
  function set(v) {
    on = v;
    btn.setAttribute('aria-pressed', String(v));
    if (v && !actx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      actx = new C({ latencyHint: 'interactive' });
      import('./assets/sound.js').then((m) => {
        engine = m.createSoundEngine(actx);
        engine.onNote(ripple);
        guard(() => engine.cue('toggle', 0.5));
        if (on) start();
      }).catch(() => { /* the page stays silent */ });
    }
    if (!actx) return;
    if (v) { actx.resume().catch(() => {}); if (engine) { guard(() => engine.cue('toggle', 0.5)); start(); } }
    if (v && !hinted) { hinted = true; hint.textContent = 'Sound on: a generated score and cues, best on headphones'; setTimeout(() => { hint.textContent = ''; }, 3600); }
    if (!v) {
      if (engine) guard(() => engine.music(false));
      root.dataset.score = 'off'; root.style.setProperty('--audio', '0');
      fx?.replaceChildren();
      setTimeout(() => { if (!on && actx.state === 'running') actx.suspend().catch(() => {}); }, 1700); // after the fade
    }
  }
  btn.addEventListener('click', () => set(!on));
  document.addEventListener('visibilitychange', () => {
    if (!actx || !on) return;
    (document.hidden ? actx.suspend() : actx.resume()).catch(() => {});
    if (!document.hidden && !raf) raf = requestAnimationFrame(light);
  });
  return {
    cue(name, el) {
      if (!on || !engine) return;
      const r = el?.getBoundingClientRect?.();
      guard(() => engine.cue(name, r ? (r.left + r.width / 2) / innerWidth : 0.5));
    },
    scene(chapter, family) {
      if (chapter === scene.chapter && family === scene.family) return;
      scene = { chapter, family };
      root.dataset.scoreScene = chapter === 3 ? `e${family}` : String(chapter);
      if (on && engine) guard(() => engine.scene(scene));
    },
    motion(speed) { if (on && engine) guard(() => engine.motion(speed)); },
  };
})();

// ------------------------------------------------------------------ film (stages 01–03)
const FRAMES = 255;
const SET = innerWidth / innerHeight < 0.9 ? 'm' : 'd';
const film = $('#film'), canvas = $('.film-canvas'), ctx = canvas.getContext('2d');
const frames = new Array(FRAMES);
let shown = -1, filmP = 0;
const filmBeats = $$('.beat', film).map((el) => ({ el, at: el.dataset.at.split(',').map(Number) }));

function size() {
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(innerHeight * dpr);
  shown = -1;
}
function nearest(i) {
  for (let d = 0; d < FRAMES; d++) { if (frames[i - d]) return frames[i - d]; if (frames[i + d]) return frames[i + d]; }
  return null;
}
let wanted = 0, drawnFrom = -1; // the frame the scroll asks for, and the loaded frame actually on the canvas
function draw(i) {
  wanted = i;
  const img = nearest(i);
  if (!img) return;
  const cw = canvas.width, ch = canvas.height, s = Math.max(cw / img.width, ch / img.height);
  ctx.drawImage(img, (cw - img.width * s) / 2, (ch - img.height * s) / 2, img.width * s, img.height * s);
  shown = i; drawnFrom = frames.indexOf(img);
}
// Coarse to fine: every 8th frame first, so the whole film scrubs early; the finer passes wait for an idle moment, so
// 255 downloads and decodes do not compete with the first paint on a phone. A newly decoded frame triggers a redraw
// only when it is closer to the frame the scroll asks for than the one on the canvas.
const idle = () => new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(r, { timeout: 1500 }) : setTimeout(r, 200)));
async function loadFrames() {
  const seen = new Set();
  for (const step of [8, 4, 2, 1]) {
    const order = [];
    for (let i = 0; i < FRAMES; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
    let next = 0;
    const worker = async () => {
      while (next < order.length) {
        const i = order[next++], img = new Image();
        img.src = `assets/film/${SET}/${String(i + 1).padStart(3, '0')}.webp`;
        try { await img.decode(); frames[i] = img; if (drawnFrom < 0 || Math.abs(i - wanted) < Math.abs(drawnFrom - wanted)) shown = -1; }
        catch (e) { /* a missing frame is covered by its neighbours */ }
      }
    };
    await Promise.all(Array.from({ length: step === 8 ? 6 : 3 }, worker));
    await idle();
  }
}
// The label names the source of the frame drawn on the canvas (frame ranges in data-shots; while frames load, or if one
// fails, a neighbouring shot may be on screen, and the label follows it), so stock and generated footage are
// never blurred together and nothing reads as SB Trading's own. Without motion the HTML's whole-film sentence stays.
const filmLabel = $('.film-label', film);
const filmShots = (filmLabel?.dataset.shots || '').split('|').filter(Boolean).map((s) => { const [r, src] = s.split(':'), [a, b] = r.split('-').map(Number); return { a, b, src }; });
let filmShot = null, studioOn = true;
const STUDIO_SHOT = { src: 'studio' };
function labelShot(i) { // i: the index of the loaded frame on the canvas (not the one the scroll asked for), -1 before any
  if (!filmLabel) return;
  if (studioOn) { // the studio covers the film: what is on screen is SB Trading's photograph, not footage
    if (filmShot !== STUDIO_SHOT) { filmShot = STUDIO_SHOT; filmLabel.textContent = "This shot: SB Trading's own photograph."; }
    return;
  }
  if (i < 0) return;
  const shot = filmShots.find((s) => i + 1 >= s.a && i + 1 <= s.b);
  if (!shot || shot === filmShot) return;
  filmShot = shot;
  filmLabel.textContent = `This shot: ${shot.src}, not SB Trading's own.`;
}
const studio = $('.studio', film);
let studioO = 1;
function beats(p) {
  for (const { el, at: [a, b] } of filmBeats) {
    const fade = 0.035;
    const o = a <= 0 ? 1 - clamp((p - (b - fade)) / fade) : clamp((p - a) / fade) * (1 - clamp((p - (b - fade)) / fade));
    el.style.opacity = o.toFixed(3);
    el.style.transform = `translateY(${((1 - o) * 28).toFixed(1)}px)`;
    el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
    if (a <= 0) { // the opening: the scroll ring fills as the film begins; the studio fades with the title
      el.style.setProperty('--hp', clamp(p / b).toFixed(3));
      studioO = o;
      studioOn = o > 0.9; // the opening starts at the arch, so footage shows there first
      if (studio) { studio.style.setProperty('--open', (1 - o).toFixed(3)); studio.style.visibility = o < 0.01 ? 'hidden' : 'visible'; }
    }
  }
}

// Dust: slow gold motes that rise through the film, bright inside the studio's beam and faint over the footage. Seeded,
// so every visit draws the same air; drawn only while the film is on screen, and not at all with reduced motion.
const dust = (() => {
  const cv = $('.dust', film), g = cv?.getContext('2d');
  if (!g || reduced) return { size() {}, draw() {} };
  let seed = 20261113;
  const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const motes = Array.from({ length: fine ? 70 : 40 }, () => ({ x: rnd(), y: rnd(), r: 0.6 + rnd() * rnd() * 2.2, up: 5 + rnd() * 14, sway: 6 + rnd() * 18, ph: rnd() * 6.28, a: 0.25 + rnd() * 0.6 }));
  let w = 0, h = 0, dpr = 1, last = 0;
  const lx = () => (innerWidth <= 760 ? 0.5 : 0.7);
  return {
    size() { dpr = Math.min(devicePixelRatio || 1, 1.5); w = innerWidth; h = innerHeight; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); },
    draw(now) {
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      const t = now / 1000, cx = lx(), halfBeam = innerWidth <= 760 ? 0.36 : 0.17;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
      g.globalCompositeOperation = 'lighter';
      for (const m of motes) {
        m.y -= (m.up * dt) / h; if (m.y < -0.02) { m.y = 1.02; m.x = rnd(); }
        const x = m.x * w + Math.sin(t * 0.35 + m.ph) * m.sway, y = m.y * h;
        const inBeam = Math.exp(-(((x / w - cx) / halfBeam) ** 2) * (1 + (1 - m.y))) * studioO;
        const a = m.a * (0.22 + 0.78 * inBeam) * (0.7 + 0.3 * Math.sin(t * 1.3 + m.ph * 3));
        if (a < 0.02) continue;
        const r = m.r * (1 + inBeam * 0.6);
        g.fillStyle = `rgba(231,214,182,${a.toFixed(3)})`;
        g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
        if (r > 1.6) { g.fillStyle = `rgba(231,214,182,${(a * 0.18).toFixed(3)})`; g.beginPath(); g.arc(x, y, r * 3.2, 0, 6.2832); g.fill(); }
      }
    },
  };
})();

// ------------------------------------------------------------------ explore (stage 04): one pinned stage, three families
const explore = $('#explore');
const fams = $$('.fam', explore), ambient = $$('.ambient img', explore);
let famActive = -1;
function setFamily(i) {
  if (i === famActive) return;
  const forward = i > famActive;
  famActive = i;
  fams.forEach((f, k) => {
    f.classList.toggle('on', k === i);
    f.classList.toggle('past', k < i);
    f.inert = k !== i;
  });
  ambient.forEach((img, k) => img.classList.toggle('on', k === i));
  sound.cue(forward ? 'knock' : 'knock-soft', fams[i].querySelector('.arch'));
}

// Keyboard: only the visible family is focusable (the others are inert), so Tab past its last product moves the
// stage to the next family and focuses its first product; Shift+Tab from a first product goes back.
const famScrollY = (i) => explore.offsetTop + (explore.offsetHeight - innerHeight) * (i / fams.length + 0.12);
explore.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab' || reduced) return;
  const fam = e.target.closest('.fam');
  if (!fam) return;
  const i = Number(fam.dataset.i), list = $$('.product', fam);
  const to = e.shiftKey ? (e.target === list[0] ? i - 1 : -1) : (e.target === list.at(-1) ? i + 1 : -1);
  if (to < 0 || to >= fams.length) return;
  e.preventDefault();
  const y = famScrollY(to);
  scrollTo(0, y); // synchronous, so the loop reads the same family on its next frame
  lenis?.scrollTo(y, { immediate: true, force: true });
  setFamily(to);
  const next = $$('.product', fams[to]);
  (e.shiftKey ? next.at(-1) : next[0]).focus({ preventScroll: true });
});

// Photographs in depth (raw WebGL2): each family's real photo drawn with its depth map, inside the active arch.
// No WebGL2, reduced motion or a lost context: the plain <img> in the arch carries it.
const studiesCanvas = $('.studies', explore), stage = $('.explore-stage', explore);
let studies = null, settling = true, restDrawn = false, mountedFam = -1;
function sizeStudies() { const a = studiesCanvas.parentElement.getBoundingClientRect(); studies?.setSize(a.width, a.height); }
async function loadStudies() {
  try {
    if (reduced) throw new Error('reduced motion: no 3D');
    const probe = document.createElement('canvas').getContext('webgl2');
    if (!probe) throw new Error('no WebGL2');
    const dbg = probe.getExtension('WEBGL_debug_renderer_info');
    const soft = /swiftshader|llvmpipe|software/i.test(dbg ? String(probe.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '');
    probe.getExtension('WEBGL_lose_context')?.loseContext(); // browsers cap live contexts; release the probe
    const { createPhotoDepth } = await import('./assets/photodepth.js');
    studies = createPhotoDepth(studiesCanvas, { low: soft || innerWidth < 820 });
    sizeStudies();
    studiesCanvas.addEventListener('webglcontextlost', () => { studies = null; root.classList.add('no-3d'); });
    root.classList.add('has-3d');
    restDrawn = false;
  } catch (e) {
    root.classList.add('no-3d');
  }
}

// ------------------------------------------------------------------ ordering line, chapters, page progress
const ordering = $('#ordering'), steps = $$('.steps li', ordering), line = $('.fibre-line', ordering);
const chapterLinks = $$('.chapters a');
const enquireEl = $('#enquire');
let chapter = -1, lastY = scrollY;
function setChapter(c) {
  if (c === chapter) return;
  chapter = c;
  chapterLinks.forEach((a, k) => { a.classList.toggle('on', k === c); if (k === c) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
}

// ------------------------------------------------------------------ the loop
function tick(now = performance.now()) {
  const p = progressOf(film);
  filmP = reduced ? p : filmP + (p - filmP) * 0.16;
  if (Math.abs(p - filmP) < 1e-4) filmP = p;
  const i = Math.round(filmP * (FRAMES - 1));
  if (i !== shown) draw(i);
  if (!reduced) {
    beats(filmP); labelShot(drawnFrom);
    const fr0 = film.getBoundingClientRect();
    if (fr0.bottom > 0 && fr0.top < innerHeight && !document.hidden) dust.draw(now);
  }

  if (!reduced) {
    const e = progressOf(explore), n = fams.length;
    const idx = Math.min(n - 1, Math.floor(e * n));
    setFamily(idx);
    const t = clamp(e * n - idx);
    fams[idx].style.setProperty('--t', t.toFixed(4));
    const active = now - lastInput < 1000;
    if (active) { pointer[0] += (target[0] - pointer[0]) * 0.08; pointer[1] += (target[1] - pointer[1]) * 0.08; }
    else { pointer[0] = target[0]; pointer[1] = target[1]; }
    const er = explore.getBoundingClientRect();
    const inView = er.top < innerHeight && er.bottom > 0;
    if (studies && inView && (active || settling || !restDrawn || studies.dirty)) { // dirty: a texture arrived or the canvas moved/resized
      if (idx !== mountedFam) { mountedFam = idx; studies.mount(fams[idx].querySelector('.arch')); sizeStudies(); }
      settling = studies.render({ fam: idx, t, pointer, now, settle: !active });
      restDrawn = !active && !settling;
    }
    if (!inView) restDrawn = false;
    studiesCanvas.dataset.renderState = !inView ? 'offscreen' : restDrawn && !studies?.dirty ? 'idle' : 'active';
    stage.style.setProperty('--ry', `${(pointer[0] * 10).toFixed(2)}deg`);
    stage.style.setProperty('--rx', `${(-pointer[1] * 7).toFixed(2)}deg`);
  }

  const r = ordering.getBoundingClientRect();
  const draw01 = clamp((innerHeight * 0.85 - r.top) / (innerHeight * 0.7));
  if (line) line.style.setProperty('--draw', draw01.toFixed(3));
  steps.forEach((li, k) => li.classList.toggle('lit', draw01 > 0.12 + k * 0.33));

  // chapters: 01 Arrive, 02 Discover, 03 Transition (film), 04 Explore, 05 Enquire
  const mid = innerHeight / 2, fr = film.getBoundingClientRect(), er = explore.getBoundingClientRect();
  let c = 4;
  if (fr.bottom > mid) c = p < 0.115 ? 0 : p < 0.4 ? 1 : 2;
  else if (er.bottom > mid) c = 3;
  setChapter(c);
  sound.scene(c, Math.max(0, famActive));
  sound.motion(Math.abs(scrollY - lastY) / innerHeight * 12);
  lastY = scrollY;
  const max = Math.max(1, root.scrollHeight - innerHeight);
  root.style.setProperty('--page', (scrollY / max).toFixed(4));
  // the chapter bar steps aside once Rifat's section is on screen, so it never covers the chat or its buttons
  root.classList.toggle('at-end', enquireEl.getBoundingClientRect().top < innerHeight * 0.75);

  if (!reduced) requestAnimationFrame(tick);
}

// ------------------------------------------------------------------ start
size(); dust.size();
addEventListener('resize', () => { size(); dust.size(); sizeStudies(); lastInput = performance.now(); if (reduced) tick(); });
addEventListener('scroll', () => { lastInput = performance.now(); }, { passive: true });
if (fine && !reduced) addEventListener('pointermove', (e) => { target[0] = e.clientX / innerWidth - 0.5; target[1] = e.clientY / innerHeight - 0.5; lastInput = performance.now(); }, { passive: true });
// The 3D studies (shader compile, photographs, depth maps) load when Explore is within two screens, not at page load.
if ('IntersectionObserver' in window) {
  const near = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { near.disconnect(); loadStudies(); } }, { rootMargin: '200% 0px' });
  near.observe(explore);
} else loadStudies();
if (reduced) tick(); else loadFrames(); // with reduced motion the film is a poster: no frames are fetched
if (reduced) addEventListener('scroll', () => requestAnimationFrame(tick), { passive: true });
requestAnimationFrame(tick);
let lenis = null;
if (fine && !reduced) {
  import('./assets/vendor/smooth.js').then(({ default: Lenis }) => {
    lenis = new Lenis({ lerp: 0.1, anchors: true });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }).catch(() => { /* native scrolling stays */ });
}
// Family cards at the end of the film land on that family inside the pinned Explore stage.
for (const a of $$('.fam-cards a')) {
  a.addEventListener('click', (e) => {
    if (reduced) return; // without the pinned stage the plain anchor is right
    e.preventDefault();
    const y = explore.offsetTop + (explore.offsetHeight - innerHeight) * (Number(a.dataset.fam) / 3 + 0.12);
    if (lenis) lenis.scrollTo(y); else scrollTo({ top: y, behavior: 'smooth' });
    sound.cue('open', a);
  });
  a.addEventListener('pointerenter', () => sound.cue('hover', a));
}
// Chapter links into the middle of the film jump to that stage's scroll position.
for (const a of chapterLinks) {
  if (!a.dataset.p) continue;
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const y = film.offsetTop + (film.offsetHeight - innerHeight) * Number(a.dataset.p) + 2;
    if (lenis) lenis.scrollTo(y); else scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  });
}

// ------------------------------------------------------------------ reveals (Motion), menu
const M = window.Motion;
if (M && !reduced) {
  const out = [0.16, 1, 0.3, 1];
  const early = { margin: '0px 0px 15% 0px' }; // content is visible by default; reveals start just before it scrolls in
  M.inView('.reveal', (el) => { M.animate(el, { opacity: [0, 1], y: [30, 0] }, { duration: 0.6, ease: out }); }, early);
  M.inView('.enq-head', (el) => { M.animate(el.children, { opacity: [0, 1], y: [30, 0] }, { duration: 0.6, delay: M.stagger(0.08), ease: out }); }, early);
  M.inView('.rifat', (el) => { M.animate(el.children, { opacity: [0, 1], y: [40, 0], scale: [0.98, 1] }, { duration: 0.7, delay: M.stagger(0.1), ease: out }); }, early);
}
const menuBtn = $('.menu-toggle'), nav = $('#mainNav');
function setMenu(open) { nav.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', String(open)); }
menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });

// ------------------------------------------------------------------ Rifat (stage 05)
// The enquiry tray mirrors "Your enquiry": how many products, which ones, one tap from Rifat.
const tray = $('#enquiryTray'), trayCount = $('#trayCount'), trayItems = $('#trayItems');
let trayN = 0;
function updateTray(enquiry) {
  const list = enquiry.products || [];
  tray.hidden = list.length === 0;
  trayCount.textContent = String(list.length);
  trayItems.textContent = list.join(', ');
  tray.setAttribute('aria-label', `Your enquiry: ${list.length} ${list.length === 1 ? 'product' : 'products'}, ${list.join(', ')}. Open Rifat.`);
  if (list.length > trayN && !reduced) { tray.classList.remove('bump'); void tray.offsetWidth; tray.classList.add('bump'); }
  trayN = list.length;
}
const rifat = createRifat({ root: $('#rifat'), whatsapp: document.body.dataset.whatsapp || '', cue: sound.cue, reduced, onChange: updateTray });
tray.addEventListener('click', (e) => { e.preventDefault(); const t = $('#enquire'); if (lenis) lenis.scrollTo(t, { offset: -40 }); else t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); });

// ------------------------------------------------------------------ product sheet
$$('.product').forEach((el) => el.addEventListener('pointerenter', () => sound.cue('hover', el)));
const sheet = $('#productSheet');
let sheetProduct = '';
// The drawer arrives on a gentle spring and leaves on a short ease-in (Motion); the native dialog closes only after the
// exit has played, so Escape, the close button, the backdrop and "Ask Rifat" all leave the same way. Reduced motion,
// or Motion missing: it opens and closes instantly. Desktop slides from the right, phones (bottom sheet) from below.
const sheetOff = () => (matchMedia('(max-width: 700px)').matches ? { x: 0, y: '100%' } : { x: '100%', y: 0 });
let sheetLeaving = null;
function openSheet() {
  if (sheetLeaving) { sheetLeaving.then(openSheet); return; } // asked to open while the exit is still playing
  if (sheet.open) return;                                     // already open: the caller has updated its content
  delete sheet.dataset.closing;
  sheet.showModal();
  if (reduced || !M) return;
  const off = sheetOff();
  M.animate(sheet, { x: [off.x, 0], y: [off.y, 0], opacity: [0.5, 1] }, { type: M.spring, visualDuration: 0.5, bounce: 0.12 });
}
/** Plays the exit and closes the dialog; resolves once it is closed (the browser then returns focus to the opener). */
function closeSheet() {
  if (sheetLeaving) return sheetLeaving;
  if (!sheet.open) return Promise.resolve();
  if (reduced || !M) { sheet.close(); return Promise.resolve(); }
  sheet.dataset.closing = '';
  const off = sheetOff();
  sheetLeaving = M.animate(sheet, { x: off.x, y: off.y, opacity: 0.5 }, { duration: 0.28, ease: [0.4, 0, 1, 1] }).finished
    .catch(() => {}).then(() => { sheet.close(); delete sheet.dataset.closing; sheetLeaving = null; });
  return sheetLeaving;
}
sheet.addEventListener('cancel', (e) => { e.preventDefault(); closeSheet(); }); // Escape
$('.sheet-close', sheet).addEventListener('submit', (e) => { e.preventDefault(); closeSheet(); });
// Each product has its own address (#p-<slug>, the button's id): opening one pushes that address and sets the page
// title, so it can be shared; Back closes it, Forward reopens it, and loading the address opens it directly.
const pageTitle = document.title;
const productAt = () => (/^#p-[a-z0-9-]+$/.test(location.hash) ? document.getElementById(location.hash.slice(1)) : null);
// Before adding, the drawer's main action is "Add to enquiry"; once added, the actions swap roles so the next step,
// finishing the enquiry with Rifat (the same hand-off as "Ask Rifat about it"), is the main button.
function setSheetActions(added) {
  const add = $('#sheetAdd'), ask = $('#sheetAsk'), label = ask.lastChild;
  add.classList.toggle('btn-ghost', added);
  ask.classList.toggle('btn-ghost', !added);
  add.textContent = added ? 'Added ✓' : 'Add to enquiry';
  label.textContent = added ? 'Finish enquiry with Rifat' : 'Ask Rifat about it';
  add.parentElement.prepend(added ? ask : add);
}
function showProduct(btn, { push = true } = {}) {
  sheetProduct = btn.textContent.trim();
  $('#sheetImg').src = `assets/img/${btn.dataset.img}.webp`;
  $('#sheetImg').alt = `${btn.dataset.family} photograph`;
  $('#sheetFamily').textContent = btn.dataset.family;
  $('#sheetTitle').textContent = sheetProduct;
  $('#sheetNote').textContent = btn.dataset.note;
  const grade = /^Grade ([A-C])\b/.exec(sheetProduct);
  $('#sheetGradeRow').hidden = !grade;
  $('#sheetGrade').textContent = grade ? grade[1] : '';
  $('#sheetStatus').textContent = '';
  setSheetActions(false);
  if (push && location.hash !== `#${btn.id}`) history.pushState({ product: btn.id }, '', `#${btn.id}`);
  document.title = `${sheetProduct} · SB Trading`;
  openSheet();
}
for (const btn of $$('.product')) btn.addEventListener('click', () => { showProduct(btn); sound.cue('open', btn); });
// Closed from the page: the product leaves the address. If this visit pushed the entry, step back over it so browsing
// several products does not fill the Back history; "Ask Rifat" has started scrolling to Enquire, and a shared link has
// no entry of its own, so those rewrite the address in place instead (stepping back would restore the old scroll).
let sheetKeepsScroll = false;
sheet.addEventListener('close', () => {
  document.title = pageTitle;
  if (productAt()) { if (history.state?.product && !sheetKeepsScroll) history.back(); else history.replaceState(null, '', location.pathname + location.search); }
  sheetKeepsScroll = false;
});
addEventListener('popstate', () => { const btn = productAt(); if (btn?.classList.contains('product')) showProduct(btn, { push: false }); else closeSheet(); });
{ // a shared product link: bring its family on stage, then open it
  const btn = productAt();
  if (btn?.classList.contains('product')) {
    const fam = btn.closest('.fam'), n = fams.length, k = fams.indexOf(fam);
    const toFamily = () => {
      if (reduced || k < 0) { btn.scrollIntoView({ block: 'center' }); return; }
      const y = explore.offsetTop + (explore.offsetHeight - innerHeight) * ((k + 0.35) / n);
      scrollTo(0, y); lenis?.scrollTo(y, { immediate: true, force: true });
    };
    toFamily();
    // the browser's own jump to the #anchor comes at load and lands on the stage's first family; go back to this one
    if (document.readyState !== 'complete') addEventListener('load', () => { if (productAt() === btn) requestAnimationFrame(toFamily); }, { once: true });
    setTimeout(() => showProduct(btn, { push: false }), 60);
  }
}
$('#sheetAsk').addEventListener('click', () => {
  sheetKeepsScroll = true;
  const target = $('#enquire');
  if (lenis) lenis.scrollTo(target, { offset: -40 }); else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  rifat.askAbout(sheetProduct);
  // focus only after the drawer has closed, or the dialog's own focus return would take it back to the product
  const t0 = performance.now();
  closeSheet().then(() => setTimeout(() => $('#rifatInput').focus({ preventScroll: true }), Math.max(30, (reduced ? 30 : 900) - (performance.now() - t0))));
});
$('#sheetAdd').addEventListener('click', (e) => {
  const list = rifat.addProduct(sheetProduct);
  const n = list ? list.split(', ').length : 0;
  $('#sheetStatus').textContent = `Added. Your enquiry has ${n} product${n === 1 ? '' : 's'}.`;
  setSheetActions(true);
  sound.cue('tick', e.currentTarget);
});
sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });

// ------------------------------------------------------------------ the plain form (an alternative to Rifat)
const form = $('#enquiryForm'), toggle = $('#formToggle');
form.hidden = true;
toggle.addEventListener('click', () => {
  const open = form.hidden;
  form.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
  if (open) $('#f-product').focus();
});
const messages = {
  product: 'Choose a product, or “Not sure yet”.',
  name: 'Enter your name.',
  email: 'Enter a business email, for example name@company.com.',
  country: 'Enter the country the order should be delivered to.',
  quantity: 'Enter a quantity greater than zero, or leave it empty.',
};
function check(field) {
  const out = $(`#e-${field.name}`);
  if (!out) return true;
  const ok = field.checkValidity();
  field.setAttribute('aria-invalid', String(!ok));
  out.textContent = ok ? '' : messages[field.name];
  return ok;
}
form.addEventListener('blur', (e) => { if (e.target.required && e.target.getAttribute('aria-invalid')) check(e.target); }, true);
form.addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid') === 'true') check(e.target); });
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const invalid = [...form.querySelectorAll('[required], #f-qty')].filter((f) => !check(f));
  if (invalid.length) { invalid[0].focus(); return; }
  const d = Object.fromEntries(new FormData(form));
  const enquiry = { product: d.product, country: d.country, name: d.name, email: d.email, company: d.company, notes: d.notes };
  if (d.quantity) { enquiry.quantity = Number(d.quantity); enquiry.unit = d.unit; }
  rifat.setEnquiry(enquiry);
  $('#summary').textContent = 'Enquiry prepared. Review it under “Your enquiry” above, then send it on WhatsApp or copy it. Nothing has been sent yet.';
  sound.cue('send', form.querySelector('button[type=submit]'));
  $('.ticket').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
});
