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
  groveP = reduced || Math.abs(g - groveP) < 1e-3 ? g : groveP + (g - groveP) * 0.1;
  const r = groveEl.getBoundingClientRect();
  const busy = Math.abs(g - groveP) > 1e-4 || Math.abs(target[0] - pointer[0]) + Math.abs(target[1] - pointer[1]) > 1e-3;
  if (busy) lastMove = now;
  const live = now - lastMove < 1000 || !groveDrawn; // still scene: stop redrawing (battery), keep the last frame
  if (grove && r.bottom > 0 && r.top < innerHeight && live) { passed = grove.render(groveP, now, pointer); groveDrawn = true; }
  else passed = [];
  if (r.bottom <= 0 || r.top >= innerHeight) groveDrawn = false;
  beats(groveBeats, groveP);

  root.style.setProperty('--page', (scrollY / Math.max(1, root.scrollHeight - innerHeight)).toFixed(4));
  pointer[0] += (target[0] - pointer[0]) * 0.06; pointer[1] += (target[1] - pointer[1]) * 0.06;
  const vel = (scrollY - yPrev) / dt / innerHeight; yPrev = scrollY;
  if (sound.on) sound.update({ zone: zoneAt(), p: groveP, vel: reduced ? 0 : vel, pointer, passed });
  if (!reduced) requestAnimationFrame(tick);
}
function zoneAt() {
  const mid = innerHeight / 2;
  for (const [id, zone] of [['film', 'film'], ['grove', 'grove'], ['catalogue', 'light']]) {
    const r = document.getElementById(id).getBoundingClientRect();
    if (r.top <= mid && r.bottom >= mid) return zone;
  }
  return 'dark';
}

// ------------------------------------------------------------------ sound (opt-in, spatial, generated in the browser)
// Off until the visitor asks: the click creates the audio context (browsers require a gesture); sound.js loads then.
const sound = (() => {
  const btn = $('#soundToggle'), label = $('.sound-label', btn), hint = $('#soundHint');
  let actx = null, engine = null, on = false, hinted = false;
  const guard = (fn) => { try { fn(); } catch (e) { console.error('sound stopped:', e); engine = null; actx?.suspend().catch(() => {}); } };
  function set(v) {
    on = v;
    btn.setAttribute('aria-pressed', String(v));
    label.textContent = v ? 'Sound on' : 'Sound off';
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
if (reduced) addEventListener('scroll', () => requestAnimationFrame(tick), { passive: true });
requestAnimationFrame(tick);
(window.requestIdleCallback || setTimeout)(() => loadGrove().then(() => { if (reduced) tick(); }));
if (fine && !reduced) {
  addEventListener('pointermove', (e) => { target[0] = e.clientX / innerWidth - 0.5; target[1] = e.clientY / innerHeight - 0.5; }, { passive: true });
  import('./assets/vendor/smooth.js').then(({ default: Lenis }) => {
    const lenis = new Lenis({ lerp: 0.1, anchors: true });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }).catch(() => { /* native scrolling stays */ });
}

// ------------------------------------------------------------------ reveals, tilt, cursor, magnetic controls
addEventListener('DOMContentLoaded', () => {
  const M = window.Motion;
  $$('.products li').forEach((li, i) => { li.dataset.i = i; });
  if (M && !reduced) {
    const out = [0.16, 1, 0.3, 1]; // ease-out-expo-like; reveals stay at or under 0.5 s
    // Content is visible by default; reveals start just before an element scrolls in (positive bottom margin),
    // so nothing flashes and nothing stays hidden if an observer never fires.
    const early = { margin: '0px 0px 20% 0px' };
    M.inView('.reveal', (el) => { M.animate(el, { opacity: [0, 1], y: [32, 0] }, { duration: 0.5, ease: out }); }, early);
    M.inView('.products', (list) => { M.animate(list.querySelectorAll('.product'), { opacity: [0, 1], y: [24, 0] }, { duration: 0.5, delay: M.stagger(0.04), ease: out }); }, early);
  }
});
if (fine && !reduced) {
  for (const card of $$('[data-tilt]')) {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `rotateY(${(x * 10).toFixed(2)}deg) rotateX(${(-y * 8).toFixed(2)}deg)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  }
  const cur = $('.cursor'), magnets = $$('.btn, .nav a, .sound-toggle');
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
  addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; root.classList.add('has-cursor'); cur.classList.toggle('is-link', !!e.target.closest('a, button, label, select')); }, { passive: true });
  document.addEventListener('pointerleave', () => root.classList.remove('has-cursor'));
  (function follow() {
    cx += (x - cx) * 0.22; cy += (y - cy) * 0.22;
    cur.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
    for (const m of magnets) {
      const r = m.getBoundingClientRect(), dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
      m.style.translate = Math.hypot(dx, dy) < Math.max(r.width, r.height) * 0.9 ? `${(dx * 0.18).toFixed(1)}px ${(dy * 0.18).toFixed(1)}px` : '';
    }
    requestAnimationFrame(follow);
  })();
}

// ------------------------------------------------------------------ catalogue filter, product sheet, enquiry
const filterButtons = $$('[data-filter]');
function filter(cat) {
  for (const b of filterButtons) b.setAttribute('aria-pressed', String(b.dataset.filter === cat));
  for (const li of $$('.products li')) li.hidden = cat !== 'all' && li.dataset.cat !== cat;
}
filterButtons.forEach((b) => b.addEventListener('click', () => { filter(b.dataset.filter); sound.cue('press', b); }));
$$('[data-filter-link]').forEach((a) => a.addEventListener('click', () => filter(a.dataset.filterLink)));
$$('.product, .filters button, .family, .palette label').forEach((el) => el.addEventListener('pointerenter', () => sound.cue('hover', el)));
$$('.palette input').forEach((i) => i.addEventListener('change', () => sound.cue('press', i.parentElement)));

const sheet = $('#productSheet');
for (const btn of $$('.product')) {
  btn.addEventListener('click', () => {
    const name = btn.querySelector('b').textContent;
    $('#sheetImg').src = `assets/img/${btn.dataset.img}.webp`;
    $('#sheetKicker').textContent = btn.querySelector('.pn').textContent;
    $('#sheetTitle').textContent = name;
    $('#sheetNote').textContent = btn.dataset.note;
    $('#sheetEnquire').onclick = () => { $('#productSelect').value = name; sheet.close(); };
    sheet.showModal();
    sound.cue('open', btn);
  });
}
sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });

// Preview: nothing leaves the page.
$('#enquiryForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target, d = new FormData(f), out = $('#summary');
  if (!f.reportValidity()) return;
  const families = d.getAll('family').join(', ') || 'not selected';
  out.textContent = `Enquiry ready for review (not sent):\nMaterials: ${families}\nProduct: ${d.get('product') || 'not selected'}\nFrom: ${d.get('name')}, ${d.get('company') || 'company not given'}, ${d.get('country') || 'country not given'}\nRequirements: ${d.get('notes') || '—'}`;
  sound.cue('send', f.querySelector('button[type=submit]'));
});
