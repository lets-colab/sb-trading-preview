// SB Trading · From leaf to fibre (client review draft).
// One loop reads the scroll position and drives: the film (WebP frames on a canvas, stages 01–03), the pinned
// Explore stage (three families in arched windows, stage 04), the ordering fibre line, the chapter bar, and the
// opt-in sound. Motion (motion.dev, MIT) runs reveals; Lenis (MIT) smooths wheel scrolling. Rifat (stage 05) lives
// in assets/rifat.js. All content is in the HTML: without JavaScript, or with reduced motion, it reads as a document.
import { createRifat } from './assets/rifat.js?v=205e2f23';

// Every file is loaded at a versioned address (?v= and a hash of its contents, kept current by tools/stamp.mjs), so a
// returning visitor's cache can never pair this page with an old file. The film's frames share one tag for the folder.
const FILM = 'assets/film/?v=c9d6c2ba', filmFile = (p) => FILM.replace('?', `${p}?`);
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
      import('./assets/sound.js?v=64c4a1d1').then((m) => {
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
      document.dispatchEvent(new CustomEvent('sb:sound', { detail: false })); // the storyteller stops too
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
    /** True while the visitor has Sound on. */
    get playing() { return on; },
    /** Turns Sound on (the gate's "Click to enter" is the visitor's gesture). */
    enable() { if (!on) set(true); },
    /** Lowers the score under the storyteller's voice, or brings it back. */
    duck(v) { if (on && engine?.duck) guard(() => engine.duck(v)); },
  };
})();

// ------------------------------------------------------------------ film (stages 01–03)
const FRAMES = 196; // tools/build-film.py (assets/film/film.json)
const SET = innerWidth / innerHeight < 0.9 ? 'm' : 'd';
const film = $('#film'), canvas = $('.film-canvas'), ctx = canvas.getContext('2d');
const frames = new Array(FRAMES);
let shown = -1, filmP = 0;
const gate = $('.gate', film);
const filmBeats = gate ? [{ el: gate, at: gate.dataset.at.split(',').map(Number) }] : [];
// the gate in live 3D (assets/gate3d.js): it opens on its own, from inside the banana's stem among its fibres, pulling
// back to the plant and across to the bamboo grove, where the title fades in (once a visit; a click, tap, key or scroll
// skips it, and the click that skips is not taken as "Click to enter"). At rest the grove turns toward the pointer and
// the camera flies into it as the film begins. The line drawing in the HTML stays until it is ready, and with reduced motion.
let gate3d = null;
if (gate && !reduced) {
  let seen = false;
  try { seen = sessionStorage.getItem('sb-opening') === '1'; sessionStorage.setItem('sb-opening', '1'); } catch { /* storage blocked: play it */ }
  const intro = !seen && progressOf(film) < 0.01;
  if (intro) root.classList.add('gate-intro');
  const ended = () => root.classList.remove('gate-intro');
  const cv = document.createElement('canvas');
  cv.className = 'gate-3d'; cv.setAttribute('aria-hidden', 'true');
  import('./assets/gate3d.js?v=f6b76d72').then(({ createGate3D }) => {
    gate.prepend(cv);
    gate3d = createGate3D(cv, { low: !fine || innerWidth < 700 || (navigator.hardwareConcurrency || 8) < 4, intro, onIntroEnd: ended });
    gate3d.size();
    root.classList.add('gate-live');
  }, ended); // without it the line drawing stays, and the title shows at once
  const skip = (e) => { if (!gate3d?.intro) return false; gate3d.skip(); return true; };
  film.addEventListener('click', (e) => { if (skip()) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  for (const type of ['wheel', 'touchmove', 'keydown']) addEventListener(type, skip, { passive: true });
}

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
let firstPass = 0;
const gateLoadEl = $('.gate-load', film);
function gateLoad(f) { // the gate's ring fills as the film's first pass (every 8th frame) arrives
  root.style.setProperty('--load', f.toFixed(3));
  if (gateLoadEl) gateLoadEl.textContent = `Loading 6 chapters ${Math.round(f * 100)}`;
}
async function loadFrames() {
  const seen = new Set();
  for (const step of [8, 4, 2, 1]) {
    const order = [];
    for (let i = 0; i < FRAMES; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
    let next = 0;
    const worker = async () => {
      while (next < order.length) {
        const i = order[next++], img = new Image();
        img.src = filmFile(`${SET}/${String(i + 1).padStart(3, '0')}.webp`);
        try { await img.decode(); frames[i] = img; if (drawnFrom < 0 || Math.abs(i - wanted) < Math.abs(drawnFrom - wanted)) shown = -1; }
        catch (e) { /* a missing frame is covered by its neighbours */ }
        if (step === 8) gateLoad(++firstPass / order.length);
      }
    };
    await Promise.all(Array.from({ length: step === 8 ? 6 : 3 }, worker));
    if (step === 8) { root.style.setProperty('--load', '1'); root.classList.add('gate-ready'); }
    await idle();
  }
}
// The label names the source of the frame drawn on the canvas (frame ranges in data-shots; while frames load, or if one
// fails, a neighbouring shot may be on screen, and the label follows it), so stock and generated footage are
// never blurred together and nothing reads as SB Trading's own. Without motion the HTML's whole-film sentence stays.
const filmLabel = $('.film-label', film);
const filmShots = (filmLabel?.dataset.shots || '').split('|').filter(Boolean).map((s) => { const [r, src] = s.split(':'), [a, b] = r.split('-').map(Number); return { a, b, src }; });
let filmShot = null;
function labelShot(i) { // i: the index of the loaded frame on the canvas (not the one the scroll asked for), -1 before any
  if (!filmLabel || i < 0) return;
  const shot = filmShots.find((s) => i + 1 >= s.a && i + 1 <= s.b);
  if (!shot || shot === filmShot) return;
  filmShot = shot;
  filmLabel.textContent = `This shot: ${shot.src}, not SB Trading's own.`;
}
// Film sound design (assets/sound.js), fired when scrolling forward crosses each moment: the cut from the grove into the
// hall, the beam, the bamboo splitting, the fibre vortex, the close shot and the dome opening (frame numbers from
// assets/film/film.json: grove 0, beam 41, close 139, dome 161). A jump past several moments plays none of them.
const FILM_CUES = [[35, 'whoosh'], [42, 'beam'], [78, 'split'], [114, 'fibre'], [138, 'close'], [158, 'dome']];
let cueFrame = -1;
function filmCues(i) {
  if (cueFrame >= 0 && i > cueFrame && i - cueFrame < 16) for (const [f, name] of FILM_CUES) if (cueFrame < f && i >= f) sound.cue(name);
  cueFrame = i;
}
let heroO = 1; // the opening title's opacity: the dust is brightest in the grove's light shafts while it shows
function beats(p) {
  for (const { el, at: [a, b] } of filmBeats) {
    const fade = 0.035;
    const o = a <= 0 ? 1 - clamp((p - (b - fade)) / fade) : clamp((p - a) / fade) * (1 - clamp((p - (b - fade)) / fade));
    el.style.opacity = o.toFixed(3);
    el.style.transform = `translateY(${((1 - o) * 28).toFixed(1)}px)`;
    el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
    if (a <= 0) { // the opening: the scroll ring fills as the film begins
      el.style.setProperty('--hp', clamp(p / b).toFixed(3));
      heroO = o;
    }
  }
}

// Dust: slow gold motes that rise through the film, bright in the grove's light shafts and faint over the footage. Seeded,
// so every visit draws the same air; drawn only while the film is on screen, and not at all with reduced motion.
const dust = (() => {
  const cv = $('.dust', film), g = cv?.getContext('2d');
  if (!g || reduced) return { size() {}, draw() {} };
  let seed = 20261113;
  const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const motes = Array.from({ length: fine ? 70 : 40 }, () => ({ x: rnd(), y: rnd(), r: 0.6 + rnd() * rnd() * 2.2, up: 5 + rnd() * 14, sway: 6 + rnd() * 18, ph: rnd() * 6.28, a: 0.25 + rnd() * 0.6 }));
  let w = 0, h = 0, dpr = 1, last = 0;
  const lx = () => (innerWidth <= 760 ? 0.5 : 0.42); // where the grove's light shafts fall
  return {
    size() { dpr = Math.min(devicePixelRatio || 1, 1.5); w = innerWidth; h = innerHeight; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); },
    draw(now) {
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      const t = now / 1000, cx = lx(), halfBeam = innerWidth <= 760 ? 0.45 : 0.3;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
      g.globalCompositeOperation = 'lighter';
      for (const m of motes) {
        m.y -= (m.up * dt) / h; if (m.y < -0.02) { m.y = 1.02; m.x = rnd(); }
        const x = m.x * w + Math.sin(t * 0.35 + m.ph) * m.sway, y = m.y * h;
        const inBeam = Math.exp(-(((x / w - cx) / halfBeam) ** 2) * (1 + (1 - m.y))) * Math.max(heroO, 1 - clamp(filmP / 0.33)); // the shafts light the grove, the first third of the film
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
// The storyteller (after hatom.com): each family's short history, narrated (assets/voice/, Kokoro voice "George", tools/narrate.py),
// with its words as subtitles. "Hear its story" plays or stops it; with Sound on it also starts as the family comes on
// stage, once per family. The score ducks under the voice. A family whose recording is not made yet shows no button.
const STORIES = {
  bamboo: { src: 'assets/voice/bamboo.mp3?v=a0432255', text: 'In Bangladesh, bamboo has held up homes, bridges and boats for generations. It is a grass, not a tree, and some kinds can grow close to a metre in a single day. Cut it, and it grows back from the same roots. Dried and bundled, it leaves the grove as poles, splits and sections, ready to build with.' },
  fibre: { src: 'assets/voice/fibre.mp3?v=282aae02', text: 'A banana plant fruits only once. After the harvest, its stem, layer upon layer of sheaths, is usually left to rot. Yet inside those sheaths run long, strong fibres. Weavers across Asia have drawn them out for centuries; in Okinawa, banana-fibre cloth has been prized for hundreds of years. Stripped, washed and dried, the fibre is spun into yarn, grown from what would have been waste.' },
  bark: { src: 'assets/voice/bark.mp3?v=1fa864f6', text: 'Nothing of the banana plant goes to waste. Its broad leaves have served as plates and wrapping across South Asia for generations: clean, cool, and returned to the soil after use. The dried outer sheath of the stem, its bark, becomes sheets for craft, packaging and handmade paper.' },
};
const storyCap = $('.story-caption'), storyBtns = $$('.story'), told = new Set();
let storyNow = null;
storyBtns.forEach((b) => { b.hidden = !STORIES[b.dataset.story]?.src; });
// One voice at a time: a family's story (a "Hear its story" button, or a ring on the film) or a chapter's narration.
// Its words show as subtitles in the caption it is given (Explore's, or the film's one line). Without a recording, or
// for a chapter while Sound is off, the words alone are shown at a reading pace.
function stopStory() {
  if (!storyNow) return;
  const { audio, btn, cap, timer } = storyNow;
  storyNow = null; window.__story = null;
  audio?.pause(); clearTimeout(timer);
  if (btn) { btn.setAttribute('aria-pressed', 'false'); const l = btn.querySelector('.story-label'); if (l) l.textContent = 'Hear its story'; }
  if (cap) { cap.classList.remove('on'); if (cap === storyCap) { cap.hidden = true; cap.textContent = ''; } }
  sound.duck(false);
}
function speak({ key, src, text, btn = null, cap = storyCap, whole = false }) {
  stopStory();
  const lines = whole ? [text] : text.match(/[^.;:]+[.;:]?/g).map((l) => l.trim()).filter(Boolean);
  const audio = src ? new Audio(src) : null, now = { audio, btn, cap, key, timer: 0 };
  storyNow = now; window.__story = audio;
  if (btn) { btn.setAttribute('aria-pressed', 'true'); const l = btn.querySelector('.story-label'); if (l) l.textContent = 'Stop the story'; }
  if (cap) { cap.hidden = false; cap.textContent = lines[0]; cap.classList.add('on'); }
  const read = (l) => Math.max(2600, l.length * 62); // a comfortable reading pace for the words alone
  if (!audio) {
    let k = 0;
    const next = () => { if (storyNow !== now) return; if (++k >= lines.length) { stopStory(); return; } if (cap) cap.textContent = lines[k]; now.timer = setTimeout(next, read(lines[k])); };
    now.timer = setTimeout(next, read(lines[0]));
    return;
  }
  const total = lines.reduce((n, l) => n + l.length, 0), ends = [];
  let acc = 0;
  for (const l of lines) { acc += l.length; ends.push(acc / total); }
  audio.addEventListener('timeupdate', () => {
    if (storyNow !== now || !cap || !audio.duration) return; // a paused voice fires one last update: it must not write over the next
    const f = audio.currentTime / audio.duration, k = Math.max(0, ends.findIndex((e) => f <= e));
    if (cap.textContent !== lines[k]) cap.textContent = lines[k];
  });
  audio.addEventListener('ended', () => { if (storyNow === now) now.timer = setTimeout(() => { if (storyNow === now) stopStory(); }, 900); });
  sound.duck(true);
  audio.play().catch(() => { if (storyNow === now) stopStory(); });
}
function playStory(key, { btn, cap } = {}) {
  const s = STORIES[key];
  if (!s?.src) return;
  told.add(key);
  speak({ key, src: s.src, text: s.text, btn: btn ?? $(`.story[data-story="${key}"]`), cap: cap ?? storyCap });
}
document.addEventListener('sb:sound', (e) => { if (!e.detail) stopStory(); }); // Sound off silences the voice too
storyBtns.forEach((b) => b.addEventListener('click', () => (storyNow?.btn === b ? stopStory() : playStory(b.dataset.story))));

// ------------------------------------------------------------------ the film's chapters: narrator and wireframe
// Six chapters (the .beat[data-ch] elements: range of the film, the frame the camera rests on, the narrator's line and
// its recording). The gate's "Click to enter" (or a click anywhere on it) turns Sound on and flies to the first chapter;
// a click on the picture, or "Click to continue", flies to the next, and past the last into Explore. When the film comes
// to rest in a chapter it settles on that chapter's frame and the narrator speaks its line (the words always, the voice
// with Sound on). Rings on the materials (SPOTS: where each sits in the chapter's frame, 0-1 of the desktop film; m: the
// phone film's own place when the centre crop moves it) tell that material's story; the specimen's ring opens it.
const chapters = (() => {
  const hud = $('.hud', film), spotsEl = $('.spots', film), subtitle = $('.subtitle', film);
  const hudN = $('.hud-n', film), hudName = $('.hud-name', film), hudNext = $('.hud-next', film), enter = $('.gate-enter', film);
  const NAMES = { grove: 'The grove', specimen: 'The specimen', split: 'Opened', fibre: 'Banana fibre', bark: 'Bark and leaves', dome: 'Together' };
  const STORY_NAMES = { bamboo: 'Bamboo', fibre: 'Banana fibre', bark: 'Bark and leaves' };
  const SPOTS = {
    grove: [{ key: 'bamboo', x: 0.72, y: 0.40, m: [0.78, 0.32] }],
    // the beam shot draws its own prompt across the specimen ("hold or scroll to split"): this plate sits over it with the
    // site's own way in, so the footage never asks for a gesture the page does not use
    specimen: [{ key: 'open', x: 0.5, y: 0.487, cover: 0.19, name: 'Open the specimen', label: 'Click to open' }],
    split: [{ key: 'bamboo', x: 0.40, y: 0.56 }, { key: 'fibre', x: 0.57, y: 0.38 }, { key: 'bark', x: 0.19, y: 0.45 }],
    fibre: [{ key: 'fibre', x: 0.64, y: 0.30, m: [0.72, 0.42] }],
    bark: [{ key: 'fibre', x: 0.17, y: 0.48, name: 'Banana fibre yarn' }, { key: 'bark', x: 0.60, y: 0.46, m: [0.74, 0.44] }],
    dome: [{ key: 'fibre', x: 0.18, y: 0.46, quiet: true }, { key: 'bark', x: 0.50, y: 0.68 }, { key: 'bamboo', x: 0.86, y: 0.42 }],
  };
  const list = $$('.beat[data-ch]', film).map((el, k) => ({ k, key: el.dataset.ch, at: el.dataset.at.split(',').map(Number), anchor: Number(el.dataset.anchor),
    voice: el.dataset.voice || null, text: $('.say', el)?.textContent.trim() || '' }));
  if (reduced || !hud || !list.length) return { update() {}, next() {}, list };
  hud.hidden = false;
  const IW = SET === 'm' ? 405 : 1280, IH = 720;
  const spots = [];
  for (const c of list) {
    for (const d of SPOTS[c.key] || []) {
      const fx = SET === 'm' ? (d.m ? d.m[0] : (d.x * 1280 - 437.5) / 405) : d.x, fy = SET === 'm' && d.m ? d.m[1] : d.y;
      if (fx < 0.08 || fx > 0.92) continue; // outside the phone film's centre crop
      const b = document.createElement('button');
      b.type = 'button'; b.className = d.cover ? 'spot cover' : 'spot'; b.dataset.key = d.key; b.dataset.ch = c.key; b.tabIndex = -1;
      if (d.key !== 'open') b.setAttribute('aria-pressed', 'false');
      b.innerHTML = `<span class="spot-ring" aria-hidden="true"></span><span class="spot-line" aria-hidden="true"></span><span class="spot-tag"><b class="spot-name${d.quiet || d.cover ? ' sr' : ''}">${d.name || STORY_NAMES[d.key]}</b><span class="story-label">${d.label || 'Hear its story'}</span>${d.key === 'open' ? '' : '<span class="spot-hold">Hold for details</span>'}</span>`;
      b.addEventListener('pointerenter', () => sound.cue('hover', b));
      if (d.key !== 'open') { // press and hold: the scene leans in and the glass board opens; letting go closes it
        let timer = 0;
        const start = () => { clearTimeout(timer); timer = setTimeout(() => expand(spots.find((x) => x.b === b), d.key), HOLD_MS); };
        const end = () => { clearTimeout(timer); if (held?.b === b) { collapse(); b.dataset.swallow = '1'; } };
        b.addEventListener('pointerdown', (e) => { if (e.button > 0) return; b.setPointerCapture?.(e.pointerId); start(); });
        for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, end);
        b.addEventListener('keydown', (e) => { if (e.key === ' ' && !e.repeat) start(); });
        b.addEventListener('keyup', (e) => { if (e.key === ' ') { const was = held?.b === b; end(); if (was) e.preventDefault(); } });
        b.addEventListener('contextmenu', (e) => e.preventDefault()); // a long touch is a hold, not the browser's menu
      }
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (b.dataset.swallow) { delete b.dataset.swallow; return; } // the release after a hold is not a tap
        if (d.key === 'open') { go(c.k + 1); return; }
        sound.cue('open', b);
        if (storyNow?.btn === b) stopStory(); else playStory(d.key, { btn: b, cap: subtitle });
      });
      spotsEl.appendChild(b);
      spots.push({ b, c, fx, fy, cover: d.cover ? d.cover * (SET === 'm' ? 1280 / 405 : 1) : 0 });
    }
  }
  let current = -1, narrated = -1, flying = false, flyTimer = 0, lastScroll = 0, intent = 0, entered = false;
  // The glass board: holding a ring leans the scene in on that material (the canvas scales about the ring) and a tilted
  // pane of smoked glass fades in beside it with the family's products, read from Explore's own markup, while the
  // narrator reads DETAILS; it tilts with the pointer and closes as the hold ends. Words only until each is recorded.
  const HOLD_MS = 260, filmStage = $('.film-stage', film);
  const DETAILS = {
    bamboo: { src: 'assets/voice/detail-bamboo.mp3?v=24b05525', say: 'Bamboo, from Bangladesh: poles, splits, ski poles and woven mats. Sizes and treatment are confirmed with your quotation.' },
    fibre: { src: 'assets/voice/detail-fibre.mp3?v=72eb5126', say: 'Banana fibre yarn, from Bangladesh, in three grades: fine banana silk, standard yarn, and industrial yarn. Grades and quantities are confirmed with your quotation.' },
    bark: { src: 'assets/voice/detail-bark.mp3?v=8bf32fdb', say: 'Banana bark and banana leaves, from Bangladesh: the third family of the range. Sizes and quantities are confirmed with your quotation.' },
  };
  const board = document.createElement('aside');
  board.className = 'board'; board.setAttribute('aria-hidden', 'true'); // the same facts are in Explore, and spoken
  board.innerHTML = '<div class="board-glass"><p class="board-kicker"></p><h3 class="board-title"></h3><p class="board-lede"></p><ul class="board-list"></ul><p class="board-note">Sizes, grades and treatment are confirmed by SB Trading with your quotation.</p><p class="board-hint">Release to return</p></div>';
  hud.appendChild(board);
  let held = null;
  function expand(sp, key) {
    if (!sp || !sp.b.classList.contains('on')) return;
    const fam = $(`#${key}`, explore), products = $$('.product', fam).map((x) => x.textContent.trim());
    $('.board-kicker', board).textContent = `Origin Bangladesh · ${products.length} products`;
    $('.board-title', board).textContent = $('h3', fam).textContent.trim();
    $('.board-lede', board).textContent = ($('.fam-lede', fam).textContent.match(/^[^.]+\./) || [''])[0];
    $('.board-list', board).replaceChildren(...products.map((t) => Object.assign(document.createElement('li'), { textContent: t })));
    const W = innerWidth, H = innerHeight, bw = Math.min(420, W - 32);
    const x = parseFloat(sp.b.style.getPropertyValue('--x')), y = parseFloat(sp.b.style.getPropertyValue('--y'));
    const left = W < 700 ? (W - bw) / 2 : x < W / 2 ? Math.min(x + 120, W - bw - 32) : Math.max(32, x - 120 - bw);
    const top = W < 700 ? 84 : clamp(y - 190, 84, H - 470);
    board.style.setProperty('--bw', `${bw}px`); board.style.setProperty('--bx', `${left.toFixed(0)}px`); board.style.setProperty('--by', `${top.toFixed(0)}px`);
    board.style.setProperty('--ry', `${x < W / 2 ? -12 : 12}deg`); board.style.setProperty('--rx', '4deg');
    canvas.style.transformOrigin = `${x.toFixed(0)}px ${y.toFixed(0)}px`;
    filmStage.style.setProperty('--zx', `${x.toFixed(0)}px`); filmStage.style.setProperty('--zy', `${y.toFixed(0)}px`);
    filmStage.classList.add('expanded'); sp.b.classList.add('held'); board.classList.add('on');
    held = sp;
    sound.cue('open', sp.b);
    speak({ key: `detail:${key}`, src: (sound.playing && DETAILS[key].src) || null, text: DETAILS[key].say, cap: subtitle, whole: true });
  }
  function collapse() {
    if (!held) return;
    held.b.classList.remove('held'); held = null;
    filmStage.classList.remove('expanded'); board.classList.remove('on');
    if (String(storyNow?.key).startsWith('detail:')) stopStory();
  }
  addEventListener('pointermove', (e) => { // the pane tilts with the pointer while it is held
    if (!held) return;
    const r = board.getBoundingClientRect(), dx = (e.clientX - (r.left + r.width / 2)) / innerWidth, dy = (e.clientY - (r.top + r.height / 2)) / innerHeight;
    board.style.setProperty('--ry', `${clamp(dx * 40, -16, 16).toFixed(1)}deg`); board.style.setProperty('--rx', `${clamp(-dy * 24, -10, 10).toFixed(1)}deg`);
  }, { passive: true });
  addEventListener('scroll', () => { lastScroll = performance.now(); }, { passive: true });
  // only the visitor's own scrolling (wheel, touch, keys) settles onto a chapter; a link, an anchor or a script's
  // scroll is left where it lands
  for (const ev of ['wheel', 'touchmove', 'keydown']) addEventListener(ev, () => { intent = performance.now(); }, { passive: true });
  const at = (p) => list.findIndex((c) => p >= c.at[0] && p < c.at[1]);
  function flyTo(y, dur = 1.8) {
    flying = true; clearTimeout(flyTimer);
    if (lenis) lenis.scrollTo(y, { duration: dur, easing: (t) => 1 - (1 - t) ** 3, force: true, onComplete: () => { flying = false; } });
    else scrollTo({ top: y, behavior: 'smooth' });
    flyTimer = setTimeout(() => { flying = false; }, dur * 1000 + 700);
  }
  const yOf = (p) => film.offsetTop + (film.offsetHeight - innerHeight) * p;
  function go(k) {
    if (k >= list.length) { if (storyNow?.cap === subtitle) stopStory(); flyTo(explore.offsetTop, 1.6); return; }
    sound.cue('whoosh');
    narrated = k; narrate(list[k]); // the narrator speaks as the camera moves, as the click is answered
    flyTo(yOf(list[k].anchor));
  }
  function next() { const p = progressOf(film), k = at(p); go(p < list[0].at[0] ? 0 : k < 0 ? list.length : k + 1); }
  function begin() { entered = true; sound.enable(); go(0); }
  enter?.addEventListener('click', (e) => { e.stopPropagation(); begin(); });
  hudNext.addEventListener('click', (e) => { e.stopPropagation(); next(); });
  // a click on the picture moves on; on the gate it enters (a click there is the gesture that may turn on Sound)
  film.addEventListener('click', (e) => {
    if (e.target.closest('a, button, input, select, textarea')) return;
    if (progressOf(film) < list[0].at[0]) begin(); else next();
  });
  function narrate(c) {
    if (storyNow && storyNow.cap === subtitle && !String(storyNow.key).startsWith('ch:')) stopStory(); // moving on ends a story
    speak({ key: `ch:${c.key}`, src: sound.playing ? c.voice : null, text: c.text, cap: subtitle, whole: true });
  }
  function place(sp) {
    const W = innerWidth, H = innerHeight, s = Math.max(W / IW, H / IH);
    const x = (W - IW * s) / 2 + sp.fx * IW * s, y = (H - IH * s) / 2 + sp.fy * IH * s;
    sp.b.style.setProperty('--x', `${x.toFixed(1)}px`); sp.b.style.setProperty('--y', `${y.toFixed(1)}px`);
    if (sp.cover) sp.b.style.setProperty('--w', `${Math.min(W - 32, sp.cover * IW * s).toFixed(0)}px`);
    sp.b.classList.toggle('flip', x > W * 0.56);
    return x > 20 && x < W - 20 && y > 70 && y < H - 120;
  }
  return {
    list, next,
    /** Called every frame while the film is on screen: chapter index, rings, narration and the settle onto a chapter. */
    update(now, p) {
      const k = at(filmP), live = filmP >= list[0].at[0] - 0.01;
      hud.classList.toggle('live', live);
      if (gate) { gate.style.setProperty('--gx', target[0].toFixed(3)); gate.style.setProperty('--gy', target[1].toFixed(3)); }
      if (k !== current) {
        current = k;
        if (k >= 0) { hudN.textContent = String(k + 1).padStart(2, '0'); hudName.textContent = NAMES[list[k].key]; }
        hudNext.textContent = k === list.length - 1 ? 'Continue to the materials' : 'Click to continue';
        if (k < 0 && storyNow?.cap === subtitle) stopStory();
      }
      for (const sp of spots) {
        const near = k >= 0 && sp.c === list[k] && Math.abs(filmP - sp.c.anchor) < 0.03 && place(sp);
        if (near !== sp.b.classList.contains('on')) { sp.b.classList.toggle('on', near); sp.b.tabIndex = near ? 0 : -1; }
      }
      const resting = Math.abs(p - filmP) < 0.0015 && now - lastScroll > 420 && !flying;
      const fr = film.getBoundingClientRect(), pinned = fr.top <= 1 && fr.bottom >= innerHeight - 1; // progress stops at 1 once the film has gone
      if (!resting || k < 0 || !pinned) return;
      const c = list[k];
      if (now - intent < 4000 && Math.abs(p - c.anchor) > 0.003 && Math.abs(p - c.anchor) < 0.075) { intent = 0; flyTo(yOf(c.anchor), 0.9); return; } // settle onto the chapter's frame
      if (k !== narrated && (entered || Math.abs(p - c.anchor) <= 0.003)) { narrated = k; narrate(c); }
    },
  };
})();
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
  const key = fams[i].id;
  if (storyNow && storyNow.key !== key) stopStory();
  if (sound.playing && !told.has(key)) playStory(key);
  sound.cue(forward ? 'knock' : 'knock-soft', fams[i].querySelector('.arch'));
}

// Keyboard: only the visible family is focusable (the others are inert), so Tab past its last stop (products, then the
// plinth arrows) moves the stage to the next family and focuses its first product; Shift+Tab from a first product goes back.
const famScrollY = (i, f = 0.12) => explore.offsetTop + (explore.offsetHeight - innerHeight) * (i / fams.length + f);
explore.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab' || reduced) return;
  const fam = e.target.closest('.fam');
  if (!fam) return;
  const stops = (f) => $$('.product, .story:not([hidden]), .plinth a', f); // each family's tab stops: its products, its story, then its plinth arrows
  const i = Number(fam.dataset.i), list = stops(fam);
  const to = e.shiftKey ? (e.target === list[0] ? i - 1 : -1) : (e.target === list.at(-1) ? i + 1 : -1);
  if (to < 0 || to >= fams.length) return;
  e.preventDefault();
  const y = famScrollY(to);
  scrollTo({ top: y, behavior: 'instant' }); // synchronous, so the loop reads the same family on its next frame
  lenis?.scrollTo(y, { immediate: true, force: true });
  setFamily(to);
  const next = stops(fams[to]);
  (e.shiftKey ? next.at(-1) : next[0]).focus({ preventScroll: true });
});

// Photographs in depth (raw WebGL2): each family's real photo drawn with its depth map, inside the active arch.
// No WebGL2, reduced motion or a lost context: the plain <img> in the arch carries it.
const studiesCanvas = $('.studies', explore), stage = $('.explore-stage', explore);
let studies = null, settling = true, restDrawn = false, mountedFam = -1;
function sizeStudies() { const a = studiesCanvas.getBoundingClientRect(); studies?.setSize(a.width, a.height); }
async function loadStudies() {
  try {
    if (reduced) throw new Error('reduced motion: no 3D');
    const probe = document.createElement('canvas').getContext('webgl2');
    if (!probe) throw new Error('no WebGL2');
    const dbg = probe.getExtension('WEBGL_debug_renderer_info');
    const soft = /swiftshader|llvmpipe|software/i.test(dbg ? String(probe.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '');
    probe.getExtension('WEBGL_lose_context')?.loseContext(); // browsers cap live contexts; release the probe
    const { createSpecimens } = await import('./assets/vendor/specimens.js?v=3798b600');
    studies = createSpecimens(studiesCanvas, { low: soft || innerWidth < 820 });
    sizeStudies();
    studiesCanvas.addEventListener('webglcontextlost', () => { studies = null; root.classList.replace('has-3d', 'no-3d'); }); // the photographs come back
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
  filmP = reduced || Math.abs(p - filmP) > 0.2 ? p : filmP + (p - filmP) * 0.16; // a jump (a link, Home/End) lands at once; scrolling glides
  if (Math.abs(p - filmP) < 1e-4) filmP = p;
  const i = Math.round(filmP * (FRAMES - 1));
  if (i !== shown) draw(i);
  if (!reduced) {
    beats(filmP); labelShot(drawnFrom); filmCues(i); chapters.update(now, p);
    if (gate3d && !document.hidden) gate3d.draw(now, filmP, target); // past the gate it clears once and rests
    const fr0 = film.getBoundingClientRect();
    if (fr0.bottom > 0 && fr0.top < innerHeight && !document.hidden) dust.draw(now);
  }

  if (!reduced) {
    const f = progressOf(explore), n = fams.length;
    const idx = Math.min(n - 1, Math.floor(f * n));
    setFamily(idx);
    // an open drawer keeps its product's family on stage behind it, whatever moved the page (such as the browser's own
    // late jump to a shared link's #anchor)
    if (sheet.open && !sheetLeaving && sheetFam >= 0 && idx !== sheetFam) { const y = famScrollY(sheetFam); scrollTo({ top: y, behavior: 'instant' }); lenis?.scrollTo(y, { immediate: true, force: true }); }
    const t = clamp(f * n - idx);
    fams[idx].style.setProperty('--t', t.toFixed(4));
    const active = now - lastInput < 1000;
    if (active) { pointer[0] += (target[0] - pointer[0]) * 0.08; pointer[1] += (target[1] - pointer[1]) * 0.08; }
    else { pointer[0] = target[0]; pointer[1] = target[1]; }
    const er = explore.getBoundingClientRect();
    // the showroom dims to dusk as it leaves for About Us and Rifat (the film before it ends in the lit gallery)
    const dark = clamp(1 - er.bottom / innerHeight);
    stage.style.setProperty('--dark', dark.toFixed(3));
    const inView = er.top < innerHeight && er.bottom > 0;
    if (studies && inView && (active || settling || !restDrawn || studies.dirty)) { // dirty: a texture arrived or the canvas moved/resized
      if (idx !== mountedFam) {
        mountedFam = idx; studies.mount(fams[idx].querySelector('.exhibit')); sizeStudies();
        const k = idx; studies.whenReady(k).then((ok) => { if (ok && mountedFam === k) studiesCanvas.dataset.specimen = String(k); });
      }
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
  // header and chapter bar turn to ink while the lit showroom is behind them
  const lit = (er.bottom - er.top) > 0 && parseFloat(stage.style.getPropertyValue('--dark') || '0') < 0.5;
  root.classList.toggle('light-top', lit && er.top <= 0 && er.bottom > 72);
  root.classList.toggle('light-bottom', lit && er.top < innerHeight - 70 && er.bottom >= innerHeight);
  let c = 4;
  if (fr.bottom > mid) c = p < 0.205 ? 0 : p < 0.5 ? 1 : 2; // the grove, the specimen in the beam, the materials
  else if (er.bottom > mid) c = 3;
  setChapter(c);
  root.classList.toggle('in-film', !reduced && fr.top <= 1 && fr.bottom >= innerHeight - 1); // the page's chrome steps back while the film fills the screen
  sound.scene(c, Math.max(0, famActive));
  sound.motion(Math.abs(scrollY - lastY) / innerHeight * 12);
  lastY = scrollY;
  const max = Math.max(1, root.scrollHeight - innerHeight);
  root.style.setProperty('--page', (scrollY / max).toFixed(4));
  // the chapter bar steps aside once Rifat's section is on screen, so it never covers the chat or its buttons
  root.classList.toggle('at-end', enquireEl.getBoundingClientRect().top < innerHeight * 0.75);

  if (!reduced) requestAnimationFrame(tick);
}

// Rifat appears at the end of the journey: his ring sweeps in and he materialises as the Enquire section comes into
// view (assets/img/rifat/, the owner's portrait of Rifat, always labelled AI). Without motion he is simply there.
{
  const presence = $('.enquire .presence');
  if (presence) {
    if (reduced || !('IntersectionObserver' in window)) presence.classList.add('here');
    else {
      const seen = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { seen.disconnect(); presence.classList.add('here'); sound.cue('reply', presence); } }, { threshold: 0.35 });
      seen.observe(presence);
    }
  }
}

// ------------------------------------------------------------------ start
size(); dust.size();
addEventListener('resize', () => { size(); dust.size(); gate3d?.size(); sizeStudies(); lastInput = performance.now(); if (reduced) tick(); });
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
  import('./assets/vendor/smooth.js?v=36d1e113').then(({ default: Lenis }) => {
    lenis = new Lenis({ lerp: 0.1, anchors: true });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }).catch(() => { /* native scrolling stays */ });
}
// Family cards at the end of the film and the plinth arrows land on that family inside the
// pinned Explore stage. From the keyboard the jump is instant and focus goes to the family's first product, so it is
// never left on a link that has just been hidden.
for (const a of $$('.fam-cards a, .plinth a[data-fam]')) {
  a.addEventListener('click', (e) => {
    if (reduced) return; // without the pinned stage the plain anchor is right
    e.preventDefault();
    const i = Number(a.dataset.fam), y = famScrollY(i);
    if (e.detail === 0) {
      scrollTo({ top: y, behavior: 'instant' }); lenis?.scrollTo(y, { immediate: true, force: true });
      setFamily(i);
      $('.product', fams[i])?.focus({ preventScroll: true });
    } else if (lenis) lenis.scrollTo(y); else scrollTo({ top: y, behavior: 'smooth' });
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
const rifat = createRifat({ root: $('#rifat'), whatsapp: document.body.dataset.whatsapp || '', endpoint: document.body.dataset.rifatEndpoint || 'api/rifat', cue: sound.cue, reduced, onChange: updateTray });
tray.addEventListener('click', (e) => { e.preventDefault(); const t = $('#enquire'); if (lenis) lenis.scrollTo(t, { offset: -40 }); else t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); });

// ------------------------------------------------------------------ product sheet
$$('.product').forEach((el) => el.addEventListener('pointerenter', () => sound.cue('hover', el)));
const sheet = $('#productSheet');
let sheetProduct = '', sheetFam = -1; // the open product, and its family's index
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
  if (reduced || !M) { sheet.close(); leaveAddress(); quoteSendHome(); return Promise.resolve(); }
  sheet.dataset.closing = '';
  const off = sheetOff();
  const exit = M.animate(sheet, { x: off.x, y: off.y, opacity: 0.5 }, { duration: 0.28, ease: [0.4, 0, 1, 1] }).finished.catch(() => {});
  // a deadline, so the drawer still closes when the exit cannot play (a hidden tab, a starved software renderer)
  const deadline = new Promise((r) => setTimeout(r, 600));
  sheetLeaving = Promise.race([exit, deadline]).then(() => { sheet.close(); leaveAddress(); quoteSendHome(); delete sheet.dataset.closing; sheetLeaving = null; });
  return sheetLeaving;
}
sheet.addEventListener('cancel', (e) => { e.preventDefault(); closeSheet(); }); // Escape
$('.sheet-close', sheet).addEventListener('submit', (e) => { e.preventDefault(); closeSheet(); });
// Each product has its own address (#p-<slug>, the button's id): opening one pushes that address and sets the page
// title, so it can be shared; Back closes it, Forward reopens it, and loading the address opens it directly.
const pageTitle = document.title;
const productAt = () => (/^#p-[a-z0-9-]+$/.test(location.hash) ? document.getElementById(location.hash.slice(1)) : null);
function setSheetActions(added) { $('#sheetAdd').textContent = added ? 'Added ✓' : 'Add to enquiry'; }

// Request a quote: Contact Us's enquiry form moves into the drawer beside the product (one form, one enquiry), and
// goes home when the drawer closes, open or closed as it was.
const quotePane = $('#quotePane'), quoteDone = $('#quoteDone');
let formWasOpen = false;
function quoteOpen() {
  const f = $('#enquiryForm');
  if (f.parentElement !== quotePane) { formWasOpen = !f.hidden; quotePane.insertBefore(f, quoteDone); }
  f.hidden = false; quoteDone.hidden = true;
  $('#f-product').value = sheetProduct;
  sheet.classList.add('quoting'); quotePane.hidden = false;
  (['#f-name', '#f-email', '#f-country'].map((s) => $(s)).find((i) => !i.value) || $('#f-qty')).focus();
  sound.cue('open', $('#sheetQuote'));
}
function quoteBack() { sheet.classList.remove('quoting'); quotePane.hidden = true; }
function quoteSendHome() {
  const f = $('#enquiryForm');
  if (f.parentElement === quotePane) { $('.form-alt').append(f); f.hidden = !formWasOpen; }
  quoteBack();
}
function showProduct(btn, { push = true } = {}) {
  const busy = sheetLeaving || steppingBack; // the last drawer is still sliding out, or its address is being left (stepBack)
  if (busy) { busy.then(() => showProduct(btn, { push })); return; }
  sheetProduct = btn.textContent.trim();
  sheetFam = fams.indexOf(btn.closest('.fam'));
  $('#sheetImg').src = btn.dataset.img;
  $('#sheetImg').alt = `${btn.dataset.family} photograph`;
  $('#sheetFamily').textContent = btn.dataset.family;
  $('#sheetTitle').textContent = sheetProduct;
  $('#sheetNote').textContent = btn.dataset.note;
  const grade = /^Grade ([A-C])\b/.exec(sheetProduct);
  $('#sheetGradeRow').hidden = !grade;
  $('#sheetGrade').textContent = grade ? grade[1] : '';
  $('#sheetStatus').textContent = '';
  setSheetActions(false);
  quoteSendHome();
  if (push && location.hash !== `#${btn.id}`) history.pushState({ product: btn.id }, '', `#${btn.id}`);
  document.title = `${sheetProduct} · SB Trading`;
  addressLeft = false;
  openSheet();
}
for (const btn of $$('.product')) btn.addEventListener('click', () => { showProduct(btn); sound.cue('open', btn); });
// Closed from the page: the product leaves the address. If this visit pushed the entry, step back over it so browsing
// several products does not fill the Back history; "Ask Rifat" has started scrolling to Enquire, and a shared link has
// no entry of its own, so those rewrite the address in place instead (stepping back would restore the old scroll).
let sheetKeepsScroll = false;
// The browser lands that step back a moment later (popstate). A product opened before it lands waits for it: otherwise
// the late step would land on the old product's address and show that product again, or reopen one after a close.
let steppingBack = null, steppedBack = null;
function landed() { if (steppedBack) { const done = steppedBack; steppingBack = steppedBack = null; done(); } }
function stepBack() {
  const step = new Promise((r) => { steppedBack = r; });
  steppingBack = step;
  // a step that never lands does not hold the drawer; an earlier step's timer cannot release this one
  setTimeout(() => { if (steppingBack === step) landed(); }, 1500);
  history.back();
}
// Leaving the address happens once per open product, at the moment the page closes the drawer (closeSheet). The dialog's
// own close event comes a moment later: it leaves the address only after a close the browser made itself, and is stale
// (ignored) when a product has been opened in between.
let addressLeft = true;
function leaveAddress() {
  if (addressLeft) return;
  addressLeft = true;
  document.title = pageTitle;
  if (productAt()) { if (history.state?.product && !sheetKeepsScroll) stepBack(); else history.replaceState(null, '', location.pathname + location.search); }
  sheetKeepsScroll = false;
}
sheet.addEventListener('close', () => { if (!sheet.open) leaveAddress(); });
addEventListener('popstate', () => {
  if (steppedBack) { landed(); return; } // our own step back over a closed product's address
  const btn = productAt(); if (btn?.classList.contains('product')) showProduct(btn, { push: false }); else closeSheet(); });
{ // a shared product link: bring its family on stage, then open it
  const btn = productAt();
  if (btn?.classList.contains('product')) {
    const fam = btn.closest('.fam'), n = fams.length, k = fams.indexOf(fam);
    const toFamily = () => {
      if (reduced || k < 0) { btn.scrollIntoView({ block: 'center' }); return; }
      const y = famScrollY(k, 0.35 / n);
      scrollTo({ top: y, behavior: 'instant' }); lenis?.scrollTo(y, { immediate: true, force: true });
    };
    toFamily(); // once the drawer is open, the loop keeps this family on stage behind it
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
sheet.addEventListener('close', () => { if (!sheet.open) quoteSendHome(); });
$('#sheetQuote').addEventListener('click', quoteOpen);
$('#quoteBack').addEventListener('click', () => { quoteBack(); $('#sheetQuote').focus(); });
$('#quoteReview').addEventListener('click', () => {
  sheetKeepsScroll = true;
  closeSheet().then(() => { const t = $('.ticket'); t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); });
});

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
  sound.cue('send', form.querySelector('button[type=submit]'));
  if (form.parentElement === quotePane) { // in the drawer: the hand-off stays beside the product
    const wa = $('#waSend'), off = wa.getAttribute('aria-disabled') === 'true', send = $('#quoteWa');
    send.href = off ? '#enquire' : wa.href;
    send.toggleAttribute('aria-disabled', off);
    form.hidden = true; quoteDone.hidden = false;
    send.focus();
    return;
  }
  $('#summary').textContent = 'Enquiry prepared. Review it under “Your enquiry” above, then send it on WhatsApp or copy it. Nothing has been sent yet.';
  $('.ticket').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
});
