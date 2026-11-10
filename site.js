// SB Trading — Materials in Motion (client review draft).
// One loop drives everything from the scroll position: the film (WebP frames on a canvas), the real-time 3D grove,
// the golden thread and, once the visitor turns it on, the spatial sound. Motion (motion.dev, MIT) drives reveals;
// Lenis (MIT) smooths wheel scrolling on desktop. All content is in the HTML; without JavaScript it reads as a document.
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

// ------------------------------------------------------------------ film
const FRAMES = 173;
const SET = innerWidth / innerHeight < 0.9 ? 'm' : 'd';
const film = $('#film'), canvas = $('.film-canvas'), ctx = canvas.getContext('2d'), bar = $('.film-bar');
const frames = new Array(FRAMES);
let shown = -1, filmP = 0;
const beatsOf = (section) => $$('.beat', section).map((el) => ({ el, at: el.dataset.at.split(',').map(Number) }));
const filmBeats = beatsOf(film);

function size() {
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(innerHeight * dpr);
  shown = -1;
  grove?.setSize(innerWidth, innerHeight);
  groveDrawn = false; // the resized canvas needs one fresh frame, even while the page is idle
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
function beats(list, p) {
  for (const { el, at: [a, b] } of list) {
    const fade = 0.04;
    const o = a <= 0 ? 1 - clamp((p - (b - fade)) / fade) : clamp((p - a) / fade) * (1 - clamp((p - (b - fade)) / fade));
    el.style.opacity = o.toFixed(3);
    el.style.transform = reduced ? 'none' : `translateY(${((1 - o) * 24).toFixed(1)}px)`;
    el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
  }
}

// ------------------------------------------------------------------ grove (real-time 3D, loaded after first paint)
const groveEl = $('#grove'), groveBeats = beatsOf(groveEl);
let grove = null, groveP = 0, passed = [], lastMove = 0, groveDrawn = false;
async function loadGrove() {
  try {
    const test = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    if (!test) throw new Error('no WebGL');
    if (innerWidth < 700) throw new Error('phone: still photograph instead of 3D');
    const dbg = test.getExtension('WEBGL_debug_renderer_info');
    const low = /swiftshader|llvmpipe|software/i.test(dbg ? String(test.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '') || innerWidth < 700;
    test.getExtension('WEBGL_lose_context')?.loseContext(); // browsers cap live contexts; release the probe
    const { createGrove } = await import('./assets/grove.js');
    grove = createGrove($('.grove-canvas'), { reduced, low });
    grove.setSize(innerWidth, innerHeight);
    $('.grove-canvas').addEventListener('webglcontextlost', () => { grove = null; root.classList.add('no-3d'); });
  } catch (e) {
    root.classList.add('no-3d'); // no WebGL: a still photograph and the text carry the chapter
  }
}

// ------------------------------------------------------------------ the loop
let last = 0, yPrev = scrollY;
function tick(now = performance.now()) {
  const dt = clamp((now - (last || now)) / 1000, 0.001, 0.1); last = now;
  const p = progressOf(film);
  filmP = reduced ? p : filmP + (p - filmP) * 0.14;
  const i = Math.round(filmP * (FRAMES - 1));
  if (i !== shown) draw(i);
  bar.style.setProperty('--p', filmP.toFixed(4));
  beats(filmBeats, filmP);

  const g = progressOf(groveEl);
  const r = groveEl.getBoundingClientRect();
  const inputActive = now - lastMove < 1000;
  const previousGroveP = groveP;
  const pointerDelta = Math.abs(target[0] - pointer[0]) + Math.abs(target[1] - pointer[1]);
  if (reduced || !inputActive) {
    // Settle to the exact final scroll/pointer state once the visitor stops; idle time is input-based.
    groveP = g;
    pointer[0] = target[0]; pointer[1] = target[1];
  } else {
    groveP = Math.abs(g - groveP) < 1e-3 ? g : groveP + (g - groveP) * 0.1;
    pointer[0] += (target[0] - pointer[0]) * 0.06;
    pointer[1] += (target[1] - pointer[1]) * 0.06;
  }
  const needsFinalDraw = !inputActive && (Math.abs(g - previousGroveP) > 1e-4 || pointerDelta > 1e-3);
  const live = inputActive || !groveDrawn || needsFinalDraw; // stop after 1 s without input, after one exact final frame
  if (grove && r.bottom > 0 && r.top < innerHeight && live) { passed = grove.render(groveP, now, pointer); groveDrawn = true; }
  else passed = [];
  if (r.bottom <= 0 || r.top >= innerHeight) groveDrawn = false;
  beats(groveBeats, groveP);

  root.style.setProperty('--page', (scrollY / Math.max(1, root.scrollHeight - innerHeight)).toFixed(4));
  root.classList.toggle('past-intro', groveEl.getBoundingClientRect().bottom < innerHeight * 0.6);
  const vel = (scrollY - yPrev) / dt / innerHeight; yPrev = scrollY;
  if (sound.on) sound.update({ zone: zoneAt(), p: groveP, vel: reduced ? 0 : vel, pointer, passed });
  if (!reduced) requestAnimationFrame(tick);
}
function zoneAt() {
  const mid = innerHeight / 2;
  for (const [id, zone] of [['film', 'film'], ['grove', 'grove'], ['materials', 'light']]) {
    const r = document.getElementById(id).getBoundingClientRect();
    if (r.top <= mid && r.bottom >= mid) return zone;
  }
  return 'dark';
}

// ------------------------------------------------------------------ sound (opt-in, spatial, generated in the browser)
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
      actx = new C({ latencyHint: 'playback' });
      import('./assets/sound.js').then((m) => { engine = m.createSoundEngine(actx); engine.enable(on); }).catch(() => { /* the page stays silent */ });
    }
    if (!actx) return;
    if (v) actx.resume().catch(() => {});
    engine?.enable(v);
    if (v && !hinted) { hinted = true; hint.textContent = 'Best with headphones'; setTimeout(() => { hint.textContent = ''; }, 4200); }
    if (!v) setTimeout(() => { if (!on && actx.state === 'running') actx.suspend().catch(() => {}); }, 1200);
    if (reduced) tick();
  }
  btn.addEventListener('click', () => set(!on));
  document.addEventListener('visibilitychange', () => { if (actx && on) (document.hidden ? actx.suspend() : actx.resume()).catch(() => {}); });
  return {
    get on() { return on && !!engine; },
    update(s) { if (on && engine) guard(() => engine.update(s)); },
    cue(name, el) { if (on && engine) guard(() => { const r = el.getBoundingClientRect(); engine.cue(name, (r.left + r.width / 2) / innerWidth); }); },
  };
})();

// ------------------------------------------------------------------ start
size();
addEventListener('resize', size);
loadFrames();
addEventListener('scroll', () => { lastMove = performance.now(); if (reduced) requestAnimationFrame(tick); }, { passive: true });
requestAnimationFrame(tick);
(window.requestIdleCallback || setTimeout)(() => loadGrove().then(() => { if (reduced) tick(); }));
if (fine && !reduced) {
  addEventListener('pointermove', (e) => { target[0] = e.clientX / innerWidth - 0.5; target[1] = e.clientY / innerHeight - 0.5; lastMove = performance.now(); }, { passive: true });
  import('./assets/vendor/smooth.js').then(({ default: Lenis }) => {
    const lenis = new Lenis({ lerp: 0.1, anchors: true });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }).catch(() => { /* native scrolling stays */ });
}

// ------------------------------------------------------------------ reveals (Motion), mobile menu
addEventListener('DOMContentLoaded', () => {
  const M = window.Motion;
  if (M && !reduced) {
    const out = [0.16, 1, 0.3, 1]; // reveals stay at or under 0.5 s
    // Content is visible by default; reveals start just before an element scrolls in (positive bottom margin),
    // so nothing flashes and nothing stays hidden if an observer never fires.
    const early = { margin: '0px 0px 20% 0px' };
    M.inView('.reveal', (el) => { M.animate(el, { opacity: [0, 1], y: [28, 0] }, { duration: 0.5, ease: out }); }, early);
    M.inView('.rows', (list) => { M.animate(list.querySelectorAll('li'), { opacity: [0, 1], x: [-12, 0] }, { duration: 0.4, delay: M.stagger(0.05), ease: out }); }, early);
  }
});
const menuBtn = $('.menu-toggle'), nav = $('#mainNav');
function setMenu(open) { nav.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', String(open)); }
menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });

// ------------------------------------------------------------------ product sheet
$$('.product').forEach((el) => el.addEventListener('pointerenter', () => sound.cue('hover', el)));
const sheet = $('#productSheet');
for (const btn of $$('.product')) {
  btn.addEventListener('click', () => {
    const name = btn.querySelector('b').textContent;
    $('#sheetImg').src = `assets/img/${btn.dataset.img}.webp`;
    $('#sheetFamily').textContent = btn.dataset.family;
    $('#sheetTitle').textContent = name;
    $('#sheetNote').textContent = btn.dataset.note;
    $('#sheetEnquire').onclick = () => { $('#f-product').value = name; sheet.close(); setTimeout(() => $('#f-product').focus({ preventScroll: true }), 60); };
    sheet.showModal();
    sound.cue('open', btn);
  });
}
sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });

// ------------------------------------------------------------------ enquiry: inline validation (preview: nothing leaves the page)
const form = $('#enquiryForm');
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
  const d = new FormData(form);
  const qty = d.get('quantity') ? `${d.get('quantity')} ${d.get('unit')}` : 'not given';
  $('#summary').textContent = `Enquiry prepared (not sent):\nProduct: ${d.get('product')}\nQuantity: ${qty}\nDeliver to: ${d.get('country')}\nFrom: ${d.get('name')}, ${d.get('company') || 'company not given'}, ${d.get('email')}\nRequirements: ${d.get('notes') || 'none given'}`;
  sound.cue('send', form.querySelector('button[type=submit]'));
});
