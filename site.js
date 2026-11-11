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
const sound = (() => {
  const btn = $('#soundToggle'), hint = $('#soundHint');
  let actx = null, engine = null, on = false, hinted = false;
  const guard = (fn) => { try { fn(); } catch (e) { console.error('sound stopped:', e); engine = null; actx?.suspend().catch(() => {}); } };
  function set(v) {
    on = v;
    btn.setAttribute('aria-pressed', String(v));
    if (v && !actx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      actx = new C({ latencyHint: 'interactive' });
      import('./assets/sound.js').then((m) => { engine = m.createSoundEngine(actx); guard(() => engine.cue('toggle', 0.5)); }).catch(() => { /* the page stays silent */ });
    }
    if (!actx) return;
    if (v) { actx.resume().catch(() => {}); if (engine) guard(() => engine.cue('toggle', 0.5)); }
    if (v && !hinted) { hinted = true; hint.textContent = 'Sound on: small cues as you move through the page'; setTimeout(() => { hint.textContent = ''; }, 3600); }
    if (!v) setTimeout(() => { if (!on && actx.state === 'running') actx.suspend().catch(() => {}); }, 400);
  }
  btn.addEventListener('click', () => set(!on));
  document.addEventListener('visibilitychange', () => { if (actx && on) (document.hidden ? actx.suspend() : actx.resume()).catch(() => {}); });
  return {
    cue(name, el) {
      if (!on || !engine) return;
      const r = el?.getBoundingClientRect?.();
      guard(() => engine.cue(name, r ? (r.left + r.width / 2) / innerWidth : 0.5));
    },
  };
})();

// ------------------------------------------------------------------ film (stages 01–03)
const FRAMES = 279;
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
function draw(i) {
  const img = nearest(i);
  if (!img) return;
  const cw = canvas.width, ch = canvas.height, s = Math.max(cw / img.width, ch / img.height);
  ctx.drawImage(img, (cw - img.width * s) / 2, (ch - img.height * s) / 2, img.width * s, img.height * s);
  shown = i;
}
// Coarse to fine: every 8th frame first, so the whole film scrubs early.
async function loadFrames() {
  const order = [], seen = new Set();
  for (const step of [8, 4, 2, 1]) for (let i = 0; i < FRAMES; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
  let next = 0;
  const worker = async () => {
    while (next < order.length) {
      const i = order[next++], img = new Image();
      img.src = `assets/film/${SET}/${String(i + 1).padStart(3, '0')}.webp`;
      try { await img.decode(); frames[i] = img; shown = -1; } catch (e) { /* a missing frame is covered by its neighbours */ }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
}
function beats(p) {
  for (const { el, at: [a, b] } of filmBeats) {
    const fade = 0.035;
    const o = a <= 0 ? 1 - clamp((p - (b - fade)) / fade) : clamp((p - a) / fade) * (1 - clamp((p - (b - fade)) / fade));
    el.style.opacity = o.toFixed(3);
    el.style.transform = `translateY(${((1 - o) * 28).toFixed(1)}px)`;
    el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
  }
}

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

// 3D material studies (three.js), loaded after first paint. No WebGL, reduced motion or a lost context: the photos carry it.
const studiesCanvas = $('.studies', explore), stage = $('.explore-stage', explore);
let studies = null, settling = true, restDrawn = false;
async function loadStudies() {
  try {
    if (reduced) throw new Error('reduced motion: no 3D');
    const probe = document.createElement('canvas').getContext('webgl2');
    if (!probe) throw new Error('no WebGL2');
    const dbg = probe.getExtension('WEBGL_debug_renderer_info');
    const soft = /swiftshader|llvmpipe|software/i.test(dbg ? String(probe.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '');
    probe.getExtension('WEBGL_lose_context')?.loseContext(); // browsers cap live contexts; release the probe
    const { createMaterials } = await import('./assets/materials3d.js');
    studies = createMaterials(studiesCanvas, { low: soft || innerWidth < 820 });
    studies.setSize(innerWidth, innerHeight);
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
let chapter = -1;
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
  if (!reduced) beats(filmP);

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
    if (studies && inView && (active || settling || !restDrawn)) {
      const a = fams[idx].querySelector('.arch').getBoundingClientRect();
      const phone = innerWidth < 820;
      const at = phone ? [(a.right - a.width * 0.2) / innerWidth, (a.bottom - a.height * 0.16) / innerHeight]
                       : [(a.left + a.width * 0.02) / innerWidth, (a.top + a.height * 0.74) / innerHeight];
      settling = studies.render({ fam: idx, t, p: e, pointer, at, now, settle: !active });
      restDrawn = !active && !settling;
    }
    if (!inView) restDrawn = false;
    studiesCanvas.dataset.renderState = !inView ? 'offscreen' : restDrawn ? 'idle' : 'active';
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
  if (fr.bottom > mid) c = p < 0.105 ? 0 : p < 0.365 ? 1 : 2;
  else if (er.bottom > mid) c = 3;
  setChapter(c);
  const max = Math.max(1, root.scrollHeight - innerHeight);
  root.style.setProperty('--page', (scrollY / max).toFixed(4));
  // the chapter bar steps aside once Rifat's section is on screen, so it never covers the chat or its buttons
  root.classList.toggle('at-end', enquireEl.getBoundingClientRect().top < innerHeight * 0.75);

  if (!reduced) requestAnimationFrame(tick);
}

// ------------------------------------------------------------------ start
size();
addEventListener('resize', () => { size(); studies?.setSize(innerWidth, innerHeight); lastInput = performance.now(); if (reduced) tick(); });
addEventListener('scroll', () => { lastInput = performance.now(); }, { passive: true });
if (fine && !reduced) addEventListener('pointermove', (e) => { target[0] = e.clientX / innerWidth - 0.5; target[1] = e.clientY / innerHeight - 0.5; lastInput = performance.now(); }, { passive: true });
(window.requestIdleCallback || setTimeout)(() => loadStudies());
loadFrames().then(() => { if (reduced) tick(); });
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
const rifat = createRifat({ root: $('#rifat'), whatsapp: document.body.dataset.whatsapp || '', cue: sound.cue, reduced });

const selectedProduct = new URLSearchParams(location.search).get('product');
if (selectedProduct && $$('.product').some(el => el.textContent.trim() === selectedProduct)) {
  // Rifat v2 merges this into its multi-product enquiry.
  rifat.setEnquiry({ product: selectedProduct });
}

// ------------------------------------------------------------------ product sheet
$$('.product').forEach((el) => el.addEventListener('pointerenter', () => sound.cue('hover', el)));
const sheet = $('#productSheet');
let sheetProduct = '';
for (const btn of $$('.product')) {
  btn.addEventListener('click', (e) => {
    e.preventDefault(); // Modal with JS; static detail route without JS.
    sheetProduct = btn.textContent.trim();
    $('#sheetImg').src = `assets/img/${btn.dataset.img}.webp`;
    $('#sheetImg').alt = `${btn.dataset.family} photograph`;
    $('#sheetFamily').textContent = btn.dataset.family;
    $('#sheetTitle').textContent = sheetProduct;
    $('#sheetNote').textContent = btn.dataset.note;
    $('#sheetDetails').href = btn.getAttribute('href');
    sheet.showModal();
    sound.cue('open', btn);
  });
}
$('#sheetAsk').addEventListener('click', () => {
  sheet.close();
  const target = $('#enquire');
  if (lenis) lenis.scrollTo(target, { offset: -40 }); else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  rifat.askAbout(sheetProduct);
  setTimeout(() => $('#rifatInput').focus({ preventScroll: true }), reduced ? 30 : 900);
});
sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });

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
