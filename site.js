// SB Trading — Materials in Motion (client review draft).
// The scroll is the playhead: the film is a WebP frame sequence drawn to a canvas. Motion (motion.dev, MIT) drives the
// section reveals. All content is in the HTML; without JavaScript the page reads as a plain document.
const root = document.documentElement;
root.classList.add('js');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
if (!reduced) root.classList.add('motion');
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

// ------------------------------------------------------------------ film
const FRAMES = 173;
const SET = innerWidth / innerHeight < 0.9 ? 'm' : 'd';
const film = $('#film'), canvas = $('.film-canvas'), ctx = canvas.getContext('2d');
const bar = $('.film-bar'), beats = $$('.beat').map((el) => ({ el, at: el.dataset.at.split(',').map(Number) }));
const frames = new Array(FRAMES);
let shown = -1, smooth = 0;

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
  const w = img.width * s, h = img.height * s;
  ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  shown = i;
}
// Coarse to fine: every 8th frame first, so the whole film scrubs within the first few hundred KB.
async function load() {
  const order = [], seen = new Set();
  for (const step of [8, 4, 2, 1]) for (let i = 0; i < FRAMES; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
  let next = 0;
  const worker = async () => {
    while (next < order.length) {
      const i = order[next++], img = new Image();
      img.src = `assets/film/${SET}/${String(i + 1).padStart(3, '0')}.webp`;
      try { await img.decode(); frames[i] = img; if (shown < 0 || Math.abs(i - smooth * (FRAMES - 1)) < 4) shown = -1; } catch (e) { /* a missing frame is covered by its neighbours */ }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
}
function progress() {
  const r = film.getBoundingClientRect();
  return clamp(-r.top / Math.max(1, r.height - innerHeight));
}
function tick() {
  const p = progress();
  smooth = reduced ? p : smooth + (p - smooth) * 0.14;
  const i = Math.round(smooth * (FRAMES - 1));
  if (i !== shown) draw(i);
  bar.style.setProperty('--p', smooth.toFixed(4));
  for (const { el, at: [a, b] } of beats) {
    const fade = 0.04;
    const o = a <= 0 ? 1 - clamp((smooth - (b - fade)) / fade) : clamp((smooth - a) / fade) * (1 - clamp((smooth - (b - fade)) / fade));
    el.style.opacity = o.toFixed(3);
    el.style.transform = reduced ? 'none' : `translateY(${((1 - o) * 24).toFixed(1)}px)`;
    el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
  }
  if (!reduced) requestAnimationFrame(tick);
}
size();
addEventListener('resize', size);
load();
if (reduced) { addEventListener('scroll', () => requestAnimationFrame(tick), { passive: true }); setInterval(() => { if (shown < 0) tick(); }, 300); }
requestAnimationFrame(tick);

// ------------------------------------------------------------------ reveals and tilt
addEventListener('DOMContentLoaded', () => {
  const M = window.Motion;
  if (M && !reduced) {
    M.inView('.reveal', (el) => { M.animate(el, { opacity: 1, y: 0 }, { duration: 1.1, ease: [0.16, 1, 0.3, 1] }); }, { margin: '0px 0px -12% 0px' });
    M.inView('.product', (el) => { M.animate(el, { opacity: [0, 1], y: [30, 0] }, { duration: 0.8, delay: (+el.closest('li').dataset.i || 0) * 0.04, ease: [0.16, 1, 0.3, 1] }); });
  } else {
    $$('.reveal').forEach((el) => { el.style.opacity = 1; el.style.transform = 'none'; });
  }
  $$('.products li').forEach((li, i) => { li.dataset.i = i; });
});
if (fine && !reduced) {
  for (const card of $$('[data-tilt]')) {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `rotateY(${(x * 10).toFixed(2)}deg) rotateX(${(-y * 8).toFixed(2)}deg) translateZ(0)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  }
}

// ------------------------------------------------------------------ catalogue filter and product sheet
const filterButtons = $$('[data-filter]');
function filter(cat) {
  for (const b of filterButtons) b.setAttribute('aria-pressed', String(b.dataset.filter === cat));
  for (const li of $$('.products li')) li.hidden = cat !== 'all' && li.dataset.cat !== cat;
}
filterButtons.forEach((b) => b.addEventListener('click', () => filter(b.dataset.filter)));
$$('[data-filter-link]').forEach((a) => a.addEventListener('click', () => filter(a.dataset.filterLink)));

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
  });
}
sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });

// ------------------------------------------------------------------ enquiry (preview: nothing leaves the page)
$('#enquiryForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target, d = new FormData(f), out = $('#summary');
  if (!f.reportValidity()) return;
  const families = d.getAll('family').join(', ') || 'not selected';
  out.textContent = `Enquiry ready for review (not sent):\nMaterials: ${families}\nProduct: ${d.get('product') || 'not selected'}\nFrom: ${d.get('name')}, ${d.get('company') || 'company not given'}, ${d.get('country') || 'country not given'}\nRequirements: ${d.get('notes') || '—'}`;
});
