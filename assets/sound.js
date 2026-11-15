// SB Trading sound: a generated score plus small tactile cues, all synthesised in the browser, no audio files.
// Loaded only after the visitor presses Sound (the AudioContext is created inside that click).
// The score (see "score" below) is a Southeast Asian bamboo-and-bronze groove (gamelan and angklung) whose ensemble
// follows the chapter, with air that rises with scroll speed. It sits under the cues (tests/score.mjs measures it
// offline) and reports each gong and saron note's position so the page can show it as light. The film's sound design
// (whoosh, beam, split, fibre, close, dome) is fired by the page at the matching frames.
//   knock / knock-soft  a hollow bamboo knock (modal synthesis) when a material family opens
//   hover               a short fibre brush when the pointer meets a product
//   open                a deeper knock with a breath of air when a product sheet opens
//   reply               a soft two-note chime when Rifat answers
//   send / tick         a rising pluck when a message goes out; a light wooden tick when the enquiry updates
// Every cue is panned toward the element that triggered it (x is 0..1 across the viewport).
export function createSoundEngine(ctx, { seed } = {}) {
  const master = ctx.createGain();
  master.gain.value = 0.7;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10; limiter.knee.value = 6; limiter.ratio.value = 8; limiter.attack.value = 0.002; limiter.release.value = 0.12;
  master.connect(limiter).connect(ctx.destination);

  // A small room: generated impulse, kept short and dark so cues stay crisp.
  const room = ctx.createConvolver();
  const len = Math.round(ctx.sampleRate * 0.7), ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c); let lp = 0;
    for (let i = 0; i < len; i++) { lp += (Math.random() * 2 - 1 - lp) * 0.35; d[i] = lp * Math.pow(1 - i / len, 3.2); }
  }
  room.buffer = ir;
  const wet = ctx.createGain(); wet.gain.value = 0.22;
  room.connect(wet).connect(master);

  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }

  function bus(x, send = 0.25) {
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.max(-0.7, Math.min(0.7, (x - 0.5) * 1.4));
    const dry = ctx.createGain(); dry.gain.value = 1;
    const toRoom = ctx.createGain(); toRoom.gain.value = send;
    pan.connect(dry).connect(master);
    pan.connect(toRoom).connect(room);
    return pan;
  }
  function partial(out, f, amp, decay, t, type = 'sine') {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + decay + 0.05);
  }
  function burst(out, { dur, freq, q = 1, amp, to = freq, t, type = 'bandpass', attack = 0.002 }) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; s.playbackRate.value = 0.9 + Math.random() * 0.2;
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(out);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  // Hollow tube modes: inharmonic partials with short, faster-decaying overtones.
  function knock(out, f, amp, t) {
    const modes = [[1, 1, 0.32], [2.76, 0.42, 0.13], [5.4, 0.2, 0.06], [8.93, 0.09, 0.035]];
    for (const [r, a, d] of modes) partial(out, f * r, amp * a, d, t);
    burst(out, { dur: 0.012, freq: 2600, q: 0.8, amp: amp * 0.5, t });
  }

  let lastHover = -1;
  const cues = {
    knock(x, t) { knock(bus(x, 0.3), 330 * (0.97 + Math.random() * 0.06), 0.42, t); },
    'knock-soft'(x, t) { knock(bus(x, 0.3), 270 * (0.97 + Math.random() * 0.06), 0.28, t); },
    hover(x, t) {
      if (t - lastHover < 0.09) return;
      lastHover = t;
      burst(bus(x, 0.1), { dur: 0.09, freq: 2800, to: 6200, q: 1.4, amp: 0.16, t, attack: 0.012 });
    },
    open(x, t) {
      const out = bus(x, 0.35);
      knock(out, 220, 0.34, t);
      burst(out, { dur: 0.42, freq: 700, to: 3200, q: 0.7, amp: 0.06, t, type: 'lowpass', attack: 0.08 });
    },
    reply(x, t) {
      const out = bus(x, 0.45);
      partial(out, 659.25, 0.1, 1.1, t); partial(out, 659.25 * 2.4, 0.018, 0.5, t);
      partial(out, 987.77, 0.08, 1.2, t + 0.085); partial(out, 987.77 * 2.4, 0.014, 0.5, t + 0.085);
    },
    send(x, t) {
      const out = bus(x, 0.2);
      partial(out, 523.25, 0.09, 0.16, t, 'triangle'); partial(out, 783.99, 0.09, 0.22, t + 0.07, 'triangle');
    },
    tick(x, t) {
      const out = bus(x, 0.15);
      partial(out, 1760, 0.14, 0.05, t); burst(out, { dur: 0.01, freq: 4200, amp: 0.12, t });
    },
    toggle(x, t) { knock(bus(x, 0.3), 300, 0.3, t); cues.reply(x, t + 0.12); },
  };

  // ------------------------------------------------------------------ score
  // A Southeast Asian bamboo-and-bronze groove, after the gamelan and angklung of Indonesia and the tribal bamboo music
  // of the region: a gong ageng closes every 16-beat cycle, kempul and kenong mark its quarters, two saron play a
  // catchy balungan melody in slendro (five near-equal steps, 240 cents), bonang pairs interlock in fast kotekan
  // (polos left, sangsih right), kendang drums drive it, angklung shakes bamboo tremolo on the accents and a suling
  // (bamboo flute) answers. The chapter sets how much of the ensemble plays: sparse in the grove, the whole groove when
  // the materials burst open. Seeded, so the offline test hears the same piece every run.
  let s = (seed ?? Math.random() * 2 ** 32) >>> 0;
  const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const realtime = !(typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext);
  const ROOT_HZ = 146.83;                                         // D3
  const sl = (deg, oct = 0) => ROOT_HZ * 2 ** (oct + (deg * 240) / 1200); // slendro degree -> Hz
  const BEAT = 60 / 100, STEP = BEAT / 4;                         // 100 bpm, sixteenth-note steps

  // Each chapter: which voices play (0..1 level) and the eight-beat balungan (slendro degrees 0-4, -1 rest).
  const SCENES = {
    0: { name: 'grove', gong: 1, saron: 0.35, bonang: 0, kendang: 0, angklung: 0.7, suling: 1, bal: [2, -1, 3, -1, 2, -1, 0, -1] },
    1: { name: 'beam', gong: 1, saron: 0.8, bonang: 0.35, kendang: 0.6, angklung: 0.5, suling: 0.6, bal: [3, 2, 3, 4, 2, 1, 2, 0] },
    2: { name: 'materials', gong: 1, saron: 1, bonang: 1, kendang: 1, angklung: 0.8, suling: 0.8, bal: [2, 3, 4, 3, 1, 2, 3, 0] },
    e0: { name: 'bamboo', gong: 1, saron: 0.8, bonang: 0.6, kendang: 0.7, angklung: 1, suling: 0.4, bal: [0, 2, 3, 2, 4, 3, 2, 0] },
    e1: { name: 'banana fibre', gong: 1, saron: 0.8, bonang: 0.8, kendang: 0.6, angklung: 0.5, suling: 0.8, bal: [3, 4, 3, 2, 1, 2, 1, 0] },
    e2: { name: 'banana leaves', gong: 1, saron: 0.7, bonang: 0.5, kendang: 0.5, angklung: 0.8, suling: 0.6, bal: [1, 2, 4, 2, 3, 1, 2, 0] },
    4: { name: 'enquire', gong: 1, saron: 0.5, bonang: 0, kendang: 0.25, angklung: 0.4, suling: 0.7, bal: [2, -1, 1, -1, 3, -1, 0, -1] },
  };
  // Kendang: d = dhung (low, open), t = tak (dry slap), k = ket (light), . = rest; one bar of 16 steps.
  const KENDANG = 'd..t.dk.d.tkd.t.';
  // Suling: an eight-beat phrase every other cycle, [beat, degree, octave, length in beats].
  const SULING = [[0, 3, 1, 1.5], [1.5, 4, 1, 0.5], [2, 3, 1, 1], [3, 2, 1, 2], [5, 1, 1, 0.5], [5.5, 2, 1, 0.5], [6, 0, 1, 2]];

  // A long, dark, decorrelated hall, so the score has space and width.
  const hall = ctx.createConvolver();
  { const len = Math.round(ctx.sampleRate * 2.8), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let lp = 0;
      for (let i = 0; i < len; i++) { lp += (rnd() * 2 - 1 - lp) * 0.22; d[i] = lp * Math.pow(1 - i / len, 2.8); } }
    hall.buffer = ir; }
  const musicBus = ctx.createGain(); musicBus.gain.value = 0;
  const analyser = ctx.createAnalyser(); analyser.fftSize = 1024;
  musicBus.connect(analyser).connect(master);
  const hallIn = ctx.createGain(), hallOut = ctx.createGain(); hallOut.gain.value = 0.5;
  hallIn.connect(hall).connect(hallOut).connect(musicBus);
  const voiceBus = {};
  for (const [k, pan, send] of [['gong', 0, 0.6], ['saronL', -0.35, 0.35], ['saronR', 0.35, 0.35], ['polos', -0.6, 0.3], ['sangsih', 0.6, 0.3], ['kendang', 0.1, 0.12], ['angklung', -0.2, 0.4], ['suling', 0.25, 0.55]]) {
    const p = ctx.createStereoPanner(); p.pan.value = pan;
    const g = ctx.createGain(), r = ctx.createGain(); r.gain.value = send;
    p.connect(g).connect(musicBus); p.connect(r).connect(hallIn);
    voiceBus[k] = p;
  }

  // Bronze: inharmonic partials; each bar is a pair tuned a few hertz apart, so it shimmers (the gamelan "ombak").
  function bronze(out, f, amp, t, { decay = 1.6, modes = [[1, 1], [2.76, 0.32], [5.4, 0.12]], beat = 5 } = {}) {
    for (const [r, a] of modes) for (const d of [0, beat]) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f * r + d;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp * a * 0.5, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay / Math.sqrt(r));
      o.connect(g).connect(out); o.start(t); o.stop(t + decay / Math.sqrt(r) + 0.05);
    }
    burst(out, { dur: 0.015, freq: 3200, q: 0.9, amp: amp * 0.3, t });
  }
  function gong(f, amp, t, decay = 6) {                       // big gong: slow swell, low beating, long ring
    const out = voiceBus.gong;
    for (const [r, a] of [[1, 1], [1.5, 0.25], [2.02, 0.35], [2.98, 0.12]]) for (const d of [0, 0.7]) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f * r + d;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp * a * 0.5, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay / r);
      o.connect(g).connect(out); o.start(t); o.stop(t + decay / r + 0.05);
    }
  }
  function drum(kind, amp, t) {                               // kendang: a pitched skin, or a dry slap
    const out = voiceBus.kendang;
    if (kind === 'd') {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(78, t + 0.18);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      o.connect(g).connect(out); o.start(t); o.stop(t + 0.35);
      burst(out, { dur: 0.03, freq: 900, q: 0.8, amp: amp * 0.35, t, type: 'lowpass' });
    } else burst(out, { dur: kind === 't' ? 0.07 : 0.04, freq: kind === 't' ? 1900 : 3200, q: 1.6, amp: amp * (kind === 't' ? 0.9 : 0.45), t });
  }
  function angklung(f, amp, t, len) {                         // bamboo tubes shaken: a fast tremolo of hollow knocks
    for (let k = 0, n = Math.floor(len / 0.06); k < n; k++) knock(voiceBus.angklung, f * (k % 2 ? 2 : 1), amp * (0.6 + 0.4 * Math.sin((k / n) * Math.PI)), t + k * 0.06);
  }
  function suling(f, amp, t, len) {                           // bamboo flute: a sine with breath and late vibrato
    const out = voiceBus.suling, o = ctx.createOscillator(), g = ctx.createGain(), vib = ctx.createOscillator(), vd = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f; vib.frequency.value = 5.2; vd.gain.setValueAtTime(0, t); vd.gain.linearRampToValueAtTime(f * 0.012, t + len * 0.8);
    vib.connect(vd).connect(o.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.08); g.gain.setValueAtTime(amp, t + len * 0.85); g.gain.linearRampToValueAtTime(0, t + len);
    o.connect(g).connect(out); o.start(t); vib.start(t); o.stop(t + len + 0.05); vib.stop(t + len + 0.05);
    burst(out, { dur: Math.min(0.25, len), freq: 1800, to: 2600, q: 1.2, amp: amp * 0.18, t, attack: 0.04 });
  }

  let musicOn = false, started = false, current = null, step = 0, nextStep = 0;
  const timeline = [];
  const listeners = [];
  const sceneAt = (t) => { let k = timeline[0]?.key ?? 0; for (const e of timeline) if (e.t <= t) k = e.key; return SCENES[k]; };
  const report = (t, x, y, v, sc) => { const n = { at: t, x, y, v, chord: sc.name }; for (const fn of listeners) fn(n); };

  function playStep(t) {
    const sc = sceneAt(t), inBar = step % 16, beat = Math.floor(step / 4), inCycle = beat % 16, onBeat = inBar % 4 === 0;
    if (step % 64 === 0 && sc.gong) { gong(ROOT_HZ / 2, 0.16 * sc.gong, t); report(t, 0.5, 0.62, 1, sc); }
    if (onBeat && (inCycle === 4 || inCycle === 12) && sc.gong) gong(sl(3, -1), 0.06 * sc.gong, t, 2.8);           // kempul
    if (onBeat && inCycle === 8 && sc.gong) bronze(voiceBus.gong, sl(1), 0.08 * sc.gong, t, { decay: 2.4, beat: 3 }); // kenong
    if (onBeat && sc.saron) {
      const deg = sc.bal[beat % 8];
      if (deg >= 0) {
        bronze(voiceBus.saronL, sl(deg, 1), 0.07 * sc.saron, t); bronze(voiceBus.saronR, sl(deg, 1), 0.045 * sc.saron, t + 0.012);
        report(t, 0.3 + deg * 0.1, 0.38 + rnd() * 0.1, sc.saron, sc);
      }
    }
    if (sc.bonang) {                                       // kotekan: polos on 1 and 3 of each four, sangsih fills between
      const next = sc.bal[(beat + 1) % 8] >= 0 ? sc.bal[(beat + 1) % 8] : 2, k = inBar % 4;
      const polos = [next, next + 1, next, next + 1][k] % 5, sangsih = [next + 2, next + 1, next + 2, next][k] % 5;
      if (k % 2 === 0) bronze(voiceBus.polos, sl(polos, 2), 0.028 * sc.bonang, t, { decay: 0.5, beat: 4 });
      else bronze(voiceBus.sangsih, sl(sangsih, 2), 0.026 * sc.bonang, t, { decay: 0.5, beat: 4 });
    }
    if (sc.kendang) { const c = KENDANG[inBar]; if (c !== '.') drum(c, 0.16 * sc.kendang * (inBar === 0 ? 1.2 : 1), t); }
    if (sc.angklung && onBeat && (inCycle === 3 || inCycle === 7 || inCycle === 11 || inCycle === 15)) angklung(sl(sc.bal[beat % 8] >= 0 ? sc.bal[beat % 8] : 2, 1), 0.05 * sc.angklung, t, BEAT * 0.9);
    if (sc.suling && step % 128 === 32) for (const [b, d, o, l] of SULING) suling(sl(d, o), 0.03 * sc.suling, t + b * BEAT, l * BEAT * 0.95);
  }

  function schedule(until) {
    if (!musicOn) return;
    nextStep = Math.max(nextStep, ctx.currentTime + 0.05);
    while (nextStep < until) { playStep(nextStep); step++; nextStep += STEP; }
  }

  function scene({ chapter = 0, family = 0 } = {}, at) {
    const key = chapter === 3 ? `e${Math.max(0, Math.min(2, family))}` : SCENES[chapter] ? chapter : 0;
    if (key === current) return;
    current = key;
    timeline.push({ t: at ?? ctx.currentTime, key });
  }

  // Air: filtered noise that rises with scroll speed.
  const airSrc = ctx.createBufferSource(); airSrc.buffer = noise; airSrc.loop = true;
  const airBand = ctx.createBiquadFilter(); airBand.type = 'bandpass'; airBand.frequency.value = 650; airBand.Q.value = 0.7;
  const airGain = ctx.createGain(); airGain.gain.value = 0.012;
  airSrc.connect(airBand).connect(airGain).connect(hallIn);

  function music(on, at, fade = on ? 3 : 1.5) {               // fade: seconds to full level, or to silence
    const t = at ?? ctx.currentTime;
    if (on && !started) {
      started = true;
      if (current === null) scene({ chapter: 0 }, t);
      airSrc.start(t); nextStep = t + 0.3; step = 0;
    }
    musicOn = on;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(realtime ? musicBus.gain.value : on ? 0 : 1, t);
    musicBus.gain.linearRampToValueAtTime(on ? 1 : 0, t + fade);
  }

  if (realtime) setInterval(() => { if (musicOn && ctx.state === 'running') schedule(ctx.currentTime + 0.6); }, 150);

  // Film sound design, fired by the page as the scroll crosses each moment of the film (site.js FILM_CUES).
  Object.assign(cues, {
    whoosh(x, t) { const out = bus(x, 0.5); burst(out, { dur: 1.1, freq: 300, to: 4200, q: 0.9, amp: 0.22, t, attack: 0.5 }); },
    beam(x, t) {                                             // the beam lights: a deep boom and a rising cold shimmer
      const out = bus(0.5, 0.6), o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(38, t + 1.4);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      o.connect(g).connect(out); o.start(t); o.stop(t + 1.9);
      for (let k = 0; k < 6; k++) partial(out, 1318.5 * 2 ** (k * 0.2), 0.025, 1.6, t + 0.15 + k * 0.08);
    },
    split(x, t) {                                            // bamboo cracking open, then the gold inside rings
      const out = bus(0.5, 0.45);
      burst(out, { dur: 0.09, freq: 2600, to: 900, q: 0.7, amp: 0.55, t });
      for (let k = 1; k < 5; k++) burst(out, { dur: 0.05, freq: 1800 + k * 300, q: 2, amp: 0.25 / k, t: t + k * 0.035 });
      knock(out, 180, 0.5, t); knock(out, 120, 0.4, t + 0.03);
      const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(55, t); o.frequency.exponentialRampToValueAtTime(32, t + 0.9);
      g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2); o.connect(g).connect(out); o.start(t); o.stop(t + 1.25);
      for (let k = 0; k < 4; k++) partial(out, 880 * [1, 1.26, 1.5, 2][k], 0.04, 1.4, t + 0.25 + k * 0.06);
    },
    fibre(x, t) {                                            // the strands swirl: a swept, circling rush with sparks
      const out = bus(0.5, 0.5);
      burst(out, { dur: 1.8, freq: 400, to: 5200, q: 3, amp: 0.2, t, attack: 0.6 });
      burst(out, { dur: 1.6, freq: 5200, to: 700, q: 3, amp: 0.12, t: t + 0.4, attack: 0.5 });
      for (let k = 0; k < 10; k++) partial(bus(rnd(), 0.4), 2200 + rnd() * 2600, 0.018, 0.25, t + 0.3 + rnd() * 1.3);
    },
    close(x, t) { const out = bus(0.4, 0.5); burst(out, { dur: 0.8, freq: 1200, to: 300, q: 0.8, amp: 0.12, t, type: 'lowpass', attack: 0.2 }); },
    dome(x, t) {                                             // the dome opens to daylight: a bright glassy bloom
      const out = bus(0.5, 0.7);
      burst(out, { dur: 1.4, freq: 600, to: 6000, q: 0.6, amp: 0.16, t, type: 'highpass', attack: 0.7 });
      [0, 2, 3, 4, 1].forEach((d, k) => partial(out, sl(d, 3), 0.04, 2.2, t + 0.5 + k * 0.09));
      gong(ROOT_HZ / 2, 0.14, t + 0.5, 5);
    },
  });

  const scratch = new Float32Array(analyser.fftSize);
  let air = 0;

  return {
    music,
    scene,
    schedule,
    /** Registers fn({ at, x, y, v, chord }) for every gong and saron note; x, y in 0..1 across the view; chord names the scene. */
    onNote(fn) { listeners.push(fn); },
    /** Scroll speed 0..1: the air grows louder and brighter with it. */
    motion(speed) {
      const v = Math.min(1, Math.max(0, speed));
      if (Math.abs(v - air) < 0.03) return;
      air = v;
      const t = ctx.currentTime;
      airGain.gain.setTargetAtTime(0.012 + v * 0.05, t, 0.25);
      airBand.frequency.setTargetAtTime(650 + v * 1900, t, 0.25);
    },
    /** The score's level now, 0..1 (RMS mapped from -50..-20 dBFS), for the page's light. */
    level() {
      analyser.getFloatTimeDomainData(scratch);
      let sum = 0; for (const x of scratch) sum += x * x;
      const db = 10 * Math.log10(sum / scratch.length + 1e-12);
      return Math.min(1, Math.max(0, (db + 50) / 30));
    },
    cue(name, x = 0.5) {
      const f = cues[name];
      if (f && ctx.state === 'running') f(Number.isFinite(x) ? x : 0.5, ctx.currentTime + 0.005);
      else if (f && ctx.state !== 'closed') ctx.resume().then(() => f(Number.isFinite(x) ? x : 0.5, ctx.currentTime + 0.005)).catch(() => {});
    },
  };
}
