// SB Trading sound: a generated score plus small tactile cues, all synthesised in the browser, no audio files.
// Loaded only after the visitor presses Sound (the AudioContext is created inside that click).
// The score (see "score" below) is slow, relaxed and South Asian, made for headphones: a tanpura drone, sparse santoor
// strokes and bansuri phrases in raga Bhupali on C, the key of the owner's film clips, with the grove's own air placed
// around the listener (birds, bamboo leaves, wind). The chapter sets the blend. It sits under the cues and the narrator
// (tests/score.mjs measures it offline) and reports each santoor and flute note's position so the page can show it as
// light. With the film's sound loaded (loadFilm: the clips' own audio, cut as the picture is, and a loop of their steady
// shimmer) the score gains that shimmer as a layer, a flight through the film plays the soundtrack of exactly the frames
// it crosses (film), and a moment crossed by scrolling plays its own slice (moment). Without it, the film's moments
// (leaves, brush, glass, glint, beam, split, fibre, yarn, bark, dome) are generated, fired by the page on their frames.
//   knock / knock-soft  a hollow bamboo knock (modal synthesis) when a material family opens
//   hover               a light santoor touch when the pointer meets a product
//   open                a deeper stroke with a breath of air when a product sheet opens
//   reply               two soft temple-bell notes when Rifat answers
//   send / tick         a rising pluck when a message goes out; a light wooden tick when the enquiry updates
// Every cue is panned toward the element that triggered it (x is 0..1 across the viewport).
export function createSoundEngine(ctx, { seed } = {}) {
  const realtime = !(typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext);
  const SR = ctx.sampleRate;
  let s = (seed ?? Math.random() * 2 ** 32) >>> 0;
  const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = (a) => a[Math.floor(rnd() * a.length)];

  const master = ctx.createGain();
  master.gain.value = 0.7;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10; limiter.knee.value = 6; limiter.ratio.value = 8; limiter.attack.value = 0.002; limiter.release.value = 0.12;
  master.connect(limiter).connect(ctx.destination);

  // Two generated rooms: a small dark one for the cues, a long soft hall for the score (the drone and flute bloom in it).
  function space(seconds, darkness, decay) {
    const c = ctx.createConvolver(), len = Math.round(SR * seconds), ir = ctx.createBuffer(2, len, SR);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch); let lp = 0;
      for (let i = 0; i < len; i++) { lp += (rnd() * 2 - 1 - lp) * darkness; d[i] = lp * Math.pow(1 - i / len, decay); }
    }
    c.buffer = ir; return c;
  }
  const room = space(0.7, 0.35, 3.2);
  const wet = ctx.createGain(); wet.gain.value = 0.22;
  room.connect(wet).connect(master);

  const noise = ctx.createBuffer(1, SR, SR);
  { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; }

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
    const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    n.buffer = noise; n.playbackRate.value = 0.9 + rnd() * 0.2;
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f).connect(g).connect(out);
    n.start(t, rnd() * 0.5); n.stop(t + dur + 0.05);
  }
  // Hollow tube modes: inharmonic partials with short, faster-decaying overtones.
  function knock(out, f, amp, t) {
    const modes = [[1, 1, 0.32], [2.76, 0.42, 0.13], [5.4, 0.2, 0.06], [8.93, 0.09, 0.035]];
    for (const [r, a, d] of modes) partial(out, f * r, amp * a, d, t);
    burst(out, { dur: 0.012, freq: 2600, q: 0.8, amp: amp * 0.5, t });
  }
  // A small brass temple bell: two inharmonic partials and a slow shimmer between them.
  function bell(out, f, amp, t, decay = 2.2) {
    for (const [r, a, d] of [[1, 1, 1], [2.76, 0.32, 0.55], [5.4, 0.12, 0.3], [1.0035, 0.7, 1]]) partial(out, f * r, amp * a, decay * d, t);
  }

  // ------------------------------------------------------------------ strings (precomputed, Karplus-Strong)
  // A santoor note is two struck strings a hair apart in pitch: a short noise burst through a tuned delay line that
  // loses a little of its brightness on every pass. Rendered once per pitch, then played as a buffer.
  const strings = new Map();
  function string(f, seconds = 3.2, bright = 0.62) {
    const key = `${f.toFixed(2)}:${bright}`;
    if (strings.has(key)) return strings.get(key);
    const len = Math.round(SR * seconds), buf = ctx.createBuffer(1, len, SR), out = buf.getChannelData(0);
    for (const [detune, amp] of [[1, 0.6], [1.0026, 0.5]]) {
      const n = Math.max(2, Math.round(SR / (f * detune))), line = new Float32Array(n);
      let lp = 0;
      for (let i = 0; i < n; i++) { lp += (rnd() * 2 - 1 - lp) * bright; line[i] = lp; } // the hammer: a softened burst
      let k = 0, prev = 0;
      const loss = Math.pow(0.5, 1 / (f * 1.6)); // about 1.6 s to halve, longer for low strings
      for (let i = 0; i < len; i++) {
        const cur = line[k], y = (cur * 0.5 + prev * 0.5) * loss;
        prev = cur; line[k] = y; out[i] += cur * amp;
        k = (k + 1) % n;
      }
    }
    for (let i = 0; i < Math.min(len, 64); i++) out[i] *= i / 64; // no click at the strike
    strings.set(key, buf);
    return buf;
  }

  // ------------------------------------------------------------------ score
  // Sa = C3, the key of the owner's film clips (their drone and phrases sit on C, D, E, G and A). Raga Bhupali: Sa Re Ga Pa Dha (0 2 4 7 9 semitones), the calm pentatonic of a soft evening; no Ma, no Ni,
  // so no step can clash with the drone. Tanpura: Pa Sa' Sa' Sa, plucked in turn, each string ringing ~7 s with the
  // tanpura's jawari: a bright band that drifts up through the overtones as the string sounds. Santoor: single strokes
  // and the occasional gentle run, placed across the field from low (left) to high (right) as on the instrument.
  // Bansuri: breathy, sliding into each note (meend), vibrato that opens slowly; it sings short phrases with long rests.
  // Around the listener: birds, close bamboo leaves and wind, each placed in space (HRTF on headphones).
  const SA = 130.81, DEG = [0, 2, 4, 7, 9];
  const hz = (deg, oct = 0) => SA * 2 ** (oct + DEG[((deg % 5) + 5) % 5] / 12 + Math.floor(deg / 5));
  const SCENES = {
    0: { name: 'grove', drone: 0.85, santoor: 0.45, flute: 0.0, birds: 1.0, leaves: 1.0, wind: 0.7, deep: 0.0, shimmer: 0.5 },
    1: { name: 'showroom', drone: 0.7, santoor: 1.0, flute: 0.35, birds: 0.15, leaves: 0.2, wind: 0.25, deep: 0.0, shimmer: 0.8 },
    2: { name: 'inside', drone: 1.0, santoor: 0.3, flute: 0.0, birds: 0.0, leaves: 0.0, wind: 0.35, deep: 1.0, shimmer: 1.0 },
    e0: { name: 'bamboo', drone: 0.75, santoor: 0.8, flute: 0.55, birds: 0.5, leaves: 0.6, wind: 0.4, deep: 0.0, shimmer: 0.5 },
    e1: { name: 'fibre', drone: 0.75, santoor: 0.6, flute: 0.8, birds: 0.35, leaves: 0.3, wind: 0.3, deep: 0.0, shimmer: 0.6 },
    e2: { name: 'bark', drone: 0.75, santoor: 0.7, flute: 0.6, birds: 0.6, leaves: 0.8, wind: 0.45, deep: 0.0, shimmer: 0.5 },
    4: { name: 'enquire', drone: 0.65, santoor: 0.35, flute: 0.9, birds: 0.3, leaves: 0.2, wind: 0.2, deep: 0.0, shimmer: 0.4 },
  };

  const musicBus = ctx.createGain(); musicBus.gain.value = 0;
  const analyser = ctx.createAnalyser(); analyser.fftSize = 1024;
  musicBus.connect(analyser).connect(master);
  const hall = space(4.2, 0.12, 2.4), hallIn = ctx.createGain(), hallOut = ctx.createGain(); hallOut.gain.value = 0.55;
  hallIn.connect(hall).connect(hallOut).connect(musicBus);
  // each layer: its level (set by the chapter), then the dry signal and its own send into the hall
  const LAYER_GAIN = { drone: 0.037, santoor: 2.0, flute: 0.06, birds: 0.8, leaves: 1.0, wind: 0.16, deep: 0.031, shimmer: 0.22 };
  const LAYER_SEND = { drone: 0.5, santoor: 0.45, flute: 0.8, birds: 0.3, leaves: 0.15, wind: 0.2, deep: 0.6, shimmer: 0.3 };
  const layer = {};
  for (const k of Object.keys(LAYER_GAIN)) {
    layer[k] = ctx.createGain(); layer[k].gain.value = 0; layer[k].connect(musicBus);
    const send = ctx.createGain(); send.gain.value = LAYER_SEND[k]; layer[k].connect(send).connect(hallIn);
  }

  // a point in space around the listener: azimuth in degrees (0 ahead, -90 left, 90 right), elevation, distance
  function at(az, el = 0, dist = 2, into = 'santoor') {
    const p = ctx.createPanner();
    p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 1.5; p.rolloffFactor = 0.6;
    const a = az * Math.PI / 180, e = el * Math.PI / 180;
    p.positionX.value = Math.sin(a) * Math.cos(e) * dist; p.positionY.value = Math.sin(e) * dist; p.positionZ.value = -Math.cos(a) * Math.cos(e) * dist;
    p.connect(layer[into]);
    return p;
  }

  let musicOn = false, started = false, current = null;
  const timeline = [], listeners = [];
  const sceneAt = (t) => { let k = timeline[0]?.key ?? 0; for (const e of timeline) if (e.t <= t) k = e.key; return SCENES[k]; };
  const report = (t, x, y, v, sc) => { const n = { at: t, x, y, v, chord: sc.name }; for (const fn of listeners) fn(n); };

  function tanpura(f, t, pan) {
    const out = at(pan * 40, 0, 2.2, 'drone');
    const g = ctx.createGain(), body = ctx.createBiquadFilter(), jawari = ctx.createBiquadFilter();
    body.type = 'lowpass'; body.Q.value = 0.5;
    body.frequency.setValueAtTime(3200, t); body.frequency.exponentialRampToValueAtTime(900, t + 5);
    jawari.type = 'peaking'; jawari.Q.value = 7; jawari.gain.value = 10;
    jawari.frequency.setValueAtTime(f * 5, t); jawari.frequency.exponentialRampToValueAtTime(f * 19, t + 3.6);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 0.04); g.gain.setTargetAtTime(0, t + 0.3, 2.1);
    for (const d of [1, 1.0017]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f * d;
      o.connect(body); o.start(t); o.stop(t + 7.5);
    }
    body.connect(jawari).connect(g).connect(out);
  }
  function santoor(deg, oct, t, amp, sc) {
    const f = hz(deg, oct), src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = string(f);
    const span = (Math.log2(f / SA) - 0.4) / 2.6; // low strings left, high right
    const az = -70 + 140 * Math.max(0, Math.min(1, span));
    g.gain.value = amp;
    src.connect(g).connect(at(az, 10, 2, 'santoor'));
    src.start(t); src.stop(t + 3.2);
    report(t, 0.5 + az / 180, 0.35 + rnd() * 0.3, amp, sc);
  }
  function bansuri(notes, t, sc) {                            // notes: [degree, octave, seconds]
    const out = at(-18, 6, 2.4, 'flute');
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), g2 = ctx.createGain();
    const vib = ctx.createOscillator(), vibG = ctx.createGain();
    const br = ctx.createBufferSource(), brF = ctx.createBiquadFilter(), brG = ctx.createGain();
    o.type = 'sine'; o2.type = 'sine'; g2.gain.value = 0.18;
    vib.frequency.value = 5.1; vib.connect(vibG); vibG.connect(o.detune); vibG.connect(o2.detune);
    br.buffer = noise; br.loop = true; brF.type = 'bandpass'; brF.Q.value = 2.5; brG.gain.value = 0.22;
    o.connect(g); o2.connect(g2).connect(g); br.connect(brF).connect(brG).connect(g);
    g.connect(out);
    let time = t, total = notes.reduce((a, [, , d]) => a + d, 0);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 0.35);
    vibG.gain.setValueAtTime(0, t);
    let prev = 0;
    notes.forEach(([deg, oct, dur]) => {
      const f = hz(deg, oct);
      o.frequency.setValueAtTime(prev || f * 0.97, time); o.frequency.exponentialRampToValueAtTime(f, time + 0.2); // meend: slide in
      prev = f;
      o2.frequency.setValueAtTime(f * 2, time + 0.2);
      brF.frequency.setValueAtTime(f * 2, time);
      vibG.gain.setValueAtTime(0, time); vibG.gain.linearRampToValueAtTime(14, time + Math.min(dur, 0.9)); // the vibrato opens late
      report(time, 0.38 + rnd() * 0.1, 0.25 + rnd() * 0.2, 0.6, sc);
      time += dur;
    });
    g.gain.setValueAtTime(1, t + total - 0.4); g.gain.linearRampToValueAtTime(0, t + total + 0.3);
    for (const n of [o, o2, vib, br]) { n.start(t); n.stop(t + total + 0.4); }
  }
  const PHRASES = [ // Bhupali movements: [degree, octave, seconds]
    [[2, 1, 1.4], [1, 1, 0.6], [0, 1, 2.2]],
    [[0, 1, 0.8], [1, 1, 0.6], [2, 1, 1.6], [3, 1, 2]],
    [[3, 1, 1.2], [2, 1, 0.6], [1, 1, 0.6], [2, 1, 1.0], [1, 1, 0.6], [0, 1, 2.2]],
    [[4, 0, 0.9], [0, 1, 0.9], [1, 1, 0.7], [2, 1, 2.4]],
    [[2, 1, 0.8], [3, 1, 0.8], [4, 1, 1.4], [3, 1, 0.7], [2, 1, 2]],
  ];
  function bird(t) {
    const out = at(-120 + rnd() * 240, 25 + rnd() * 30, 5 + rnd() * 6, 'birds');
    const f0 = 2600 + rnd() * 1800, n = 2 + Math.floor(rnd() * 4);
    for (let k = 0; k < n; k++) {
      const o = ctx.createOscillator(), g = ctx.createGain(), tk = t + k * (0.09 + rnd() * 0.05);
      o.frequency.setValueAtTime(f0, tk); o.frequency.exponentialRampToValueAtTime(f0 * (1.25 + rnd() * 0.3), tk + 0.05);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.92, tk + 0.08);
      g.gain.setValueAtTime(0, tk); g.gain.linearRampToValueAtTime(0.5, tk + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, tk + 0.085);
      o.connect(g).connect(out); o.start(tk); o.stop(tk + 0.1);
    }
  }
  function rustle(t, len = 0.8 + rnd() * 1.2) {               // close leaves: many tiny brushes, rising and falling
    const out = at(-100 + rnd() * 200, -10 + rnd() * 30, 0.8 + rnd() * 1.2, 'leaves');
    const grains = Math.round(len * 26);
    for (let k = 0; k < grains; k++) {
      const u = k / grains, tk = t + u * len + rnd() * 0.02;
      burst(out, { dur: 0.02 + rnd() * 0.04, freq: 3200 + rnd() * 4000, q: 1.2, amp: 0.5 * Math.sin(Math.PI * u) * (0.4 + rnd() * 0.6), t: tk, type: 'bandpass' });
    }
  }

  // continuous beds: wind (and the air that rises with scroll speed) and the hall's deep hum
  const windSrc = ctx.createBufferSource(); windSrc.buffer = noise; windSrc.loop = true; windSrc.playbackRate.value = 0.5;
  const windF = ctx.createBiquadFilter(); windF.type = 'lowpass'; windF.frequency.value = 420; windF.Q.value = 0.4;
  const windPan = ctx.createStereoPanner(), windLfo = ctx.createOscillator(), windLfoG = ctx.createGain();
  windLfo.frequency.value = 0.07; windLfoG.gain.value = 0.6; windLfo.connect(windLfoG).connect(windPan.pan);
  windSrc.connect(windF).connect(windPan).connect(layer.wind);
  const airBand = ctx.createBiquadFilter(); airBand.type = 'bandpass'; airBand.frequency.value = 650; airBand.Q.value = 0.7;
  const airGain = ctx.createGain(); airGain.gain.value = 0.012;
  windSrc.connect(airBand).connect(airGain).connect(musicBus);
  const deep = [ctx.createOscillator(), ctx.createOscillator()], deepG = ctx.createGain(); deepG.gain.value = 0.5;
  deep[0].frequency.value = SA / 2; deep[1].frequency.value = SA / 2 * 1.5 * 1.002;
  for (const o of deep) o.connect(deepG); deepG.connect(layer.deep);

  const next = { drone: 0, santoor: 0, flute: 0, birds: 0, leaves: 0 };
  let droneString = 0;
  function schedule(until) {
    const now = realtime ? ctx.currentTime : 0;
    for (const k of Object.keys(next)) next[k] = Math.max(next[k], now + 0.05);
    while (next.drone < until) {                              // Pa Sa' Sa' Sa: each string in turn, ~1.15 s apart
      const t = next.drone, f = [SA * 0.75, SA, SA, SA / 2][droneString % 4];
      tanpura(f, t, [-0.6, -0.15, 0.2, 0.6][droneString % 4]);
      droneString++; next.drone += 1.12 + (droneString % 4 === 0 ? 0.5 : 0);
    }
    while (next.santoor < until) {
      const t = next.santoor, sc = sceneAt(t);
      if (sc.santoor > 0) {
        if (rnd() < 0.22) { const top = 5 + Math.floor(rnd() * 4); for (let k = 0; k < 4; k++) santoor(top - k, 1, t + k * 0.16, 0.5 - k * 0.06, sc); }
        else santoor(Math.floor(rnd() * 8), 1, t, 0.4 + rnd() * 0.3, sc);
      }
      next.santoor += (sc.santoor > 0.6 ? 1.1 : 1.9) + rnd() * 1.6;
    }
    while (next.flute < until) {
      const t = next.flute, sc = sceneAt(t);
      if (sc.flute > 0) { const ph = pick(PHRASES); bansuri(ph, t, sc); next.flute += ph.reduce((a, n) => a + n[2], 0) + 4 + rnd() * 6; }
      else next.flute += 2;
    }
    while (next.birds < until) { const sc = sceneAt(next.birds); if (sc.birds > 0) bird(next.birds); next.birds += 1.4 + rnd() * 3.2; }
    while (next.leaves < until) { const sc = sceneAt(next.leaves); if (sc.leaves > 0) rustle(next.leaves); next.leaves += 2.2 + rnd() * 3.5; }
  }
  function blend(sc, t) { for (const k of Object.keys(layer)) layer[k].gain.setTargetAtTime(LAYER_GAIN[k] * sc[k], t, 1.2); }
  function scene({ chapter = 0, family = 0 } = {}, when) {
    const key = chapter === 3 ? `e${Math.max(0, Math.min(2, family))}` : SCENES[chapter] ? chapter : 0;
    if (key === current) return;
    current = key;
    const t = when ?? ctx.currentTime;
    timeline.push({ t, key });
    blend(SCENES[key], t);
  }

  function music(on, when, fade = on ? 3 : 1.5) {             // fade: seconds to full level, or to silence
    const t = when ?? ctx.currentTime;
    if (on && !started) {
      started = true;
      if (current === null) scene({ chapter: 0 }, t);
      windSrc.start(t); windLfo.start(t); for (const o of deep) o.start(t);
      for (const k of Object.keys(next)) next[k] = t + 0.3;
      next.flute = t + 2.5;
    }
    musicOn = on;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(realtime ? musicBus.gain.value : on ? 0 : 1, t);
    musicBus.gain.linearRampToValueAtTime(on ? 1 : 0, t + fade);
  }

  if (realtime) setInterval(() => { if (musicOn && ctx.state === 'running') schedule(ctx.currentTime + 0.8); }, 150);

  // ------------------------------------------------------------------ cues
  let lastHover = -1;
  const cues = {
    knock(x, t) { knock(bus(x, 0.3), 330 * (0.97 + rnd() * 0.06), 0.42, t); },
    'knock-soft'(x, t) { knock(bus(x, 0.3), 270 * (0.97 + rnd() * 0.06), 0.28, t); },
    hover(x, t) {                                            // a light santoor touch, high and quiet
      if (t - lastHover < 0.09) return;
      lastHover = t;
      const src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = string(hz(pick([5, 6, 7, 8]), 1), 3.2, 0.62); g.gain.value = 0.16;
      src.connect(g).connect(bus(x, 0.2)); src.start(t); src.stop(t + 1.2);
    },
    open(x, t) {
      const out = bus(x, 0.35);
      const src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = string(hz(0, 1)); g.gain.value = 0.42;
      src.connect(g).connect(out); src.start(t); src.stop(t + 2.4);
      burst(out, { dur: 0.42, freq: 700, to: 3200, q: 0.7, amp: 0.05, t, type: 'lowpass', attack: 0.08 });
    },
    reply(x, t) { const out = bus(x, 0.5); bell(out, hz(2, 2), 0.07, t, 1.6); bell(out, hz(4, 2), 0.06, t + 0.11, 1.8); },
    send(x, t) {
      const out = bus(x, 0.2);
      partial(out, hz(0, 2), 0.08, 0.16, t, 'triangle'); partial(out, hz(3, 2), 0.08, 0.22, t + 0.07, 'triangle');
    },
    tick(x, t) {
      const out = bus(x, 0.15);
      partial(out, 1760, 0.12, 0.05, t); burst(out, { dur: 0.01, freq: 4200, amp: 0.1, t });
    },
    toggle(x, t) { bell(bus(x, 0.5), hz(0, 2), 0.08, t, 2.4); },
    whoosh(x, t) { const out = bus(x, 0.5); burst(out, { dur: 1.1, freq: 300, to: 3600, q: 0.9, amp: 0.16, t, attack: 0.5 }); },
  };

  // Film sound design, fired by the page as the scroll crosses each moment of the film (site.js FILM_CUES).
  function sweep(t, dur, from, to, build) {                   // a source carried across the stereo field
    const p = ctx.createStereoPanner(), r = ctx.createGain(); r.gain.value = 0.4;
    p.pan.setValueAtTime(from, t); p.pan.linearRampToValueAtTime(to, t + dur);
    p.connect(master); p.connect(r).connect(room);
    build(p);
  }
  Object.assign(cues, {
    leaves(x, t) { for (let k = 0; k < 3; k++) rustle(t + k * 0.5, 1.2); },     // the grove stirs around you
    brush(x, t) {                                            // a culm passes close in front of the lens, right to left
      sweep(t, 0.55, 0.85, -0.85, (out) => {
        burst(out, { dur: 0.6, freq: 500, to: 2200, q: 0.8, amp: 0.2, t, attack: 0.25 });
        for (let k = 0; k < 14; k++) burst(out, { dur: 0.03, freq: 3500 + rnd() * 3000, q: 1.5, amp: 0.1, t: t + 0.1 + k * 0.03 });
      });
    },
    glass(x, t) {                                            // the glass cases: a soft ring of crystal, three notes
      const out = bus(0.5, 0.8);
      [[hz(4, 2), 0], [hz(2, 3), 0.18], [hz(0, 3), 0.36]].forEach(([f, d]) => {
        for (const [r, a] of [[1, 0.05], [2.32, 0.018], [4.25, 0.008]]) partial(out, f * r, a, 2.6, t + d);
      });
    },
    glint(x, t) {                                            // passing through the glass: a bright sweep, left to right
      sweep(t, 0.7, -0.7, 0.7, (out) => {
        burst(out, { dur: 0.75, freq: 1800, to: 9000, q: 3, amp: 0.12, t, attack: 0.3 });
        partial(out, hz(0, 4), 0.03, 1.4, t + 0.25); partial(out, hz(2, 4), 0.025, 1.2, t + 0.32);
      });
    },
    beam(x, t) {                                             // the cold light: a low swell under the drone
      const out = bus(0.5, 0.8), o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = SA / 4;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
      o.connect(g).connect(out); o.start(t); o.stop(t + 4.1);
      burst(out, { dur: 2.4, freq: 2400, to: 5200, q: 6, amp: 0.025, t: t + 0.2, attack: 1.2 });
    },
    split(x, t) {                                            // the specimen opens: a dry crack, then a struck low string
      const out = bus(0.5, 0.45);
      burst(out, { dur: 0.09, freq: 2600, to: 900, q: 0.7, amp: 0.4, t });
      for (let k = 1; k < 5; k++) burst(out, { dur: 0.05, freq: 1800 + k * 300, q: 2, amp: 0.18 / k, t: t + k * 0.035 });
      knock(out, 150, 0.35, t + 0.02);
      const src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = string(hz(0, 0), 3.2, 0.5); g.gain.value = 0.5;
      src.connect(g).connect(out); src.start(t + 0.18); src.stop(t + 3.3);
    },
    fibre(x, t) {                                            // the strands swirl around you: a silky rush that circles
      const p = ctx.createStereoPanner(), lfo = ctx.createOscillator(), lg = ctx.createGain(), r = ctx.createGain();
      lfo.frequency.value = 0.9; lg.gain.value = 0.8; lfo.connect(lg).connect(p.pan); lfo.start(t); lfo.stop(t + 2.6);
      r.gain.value = 0.5; p.connect(master); p.connect(r).connect(room);
      burst(p, { dur: 2.4, freq: 900, to: 4800, q: 2.5, amp: 0.16, t, attack: 0.8 });
      burst(p, { dur: 2, freq: 4800, to: 1200, q: 2.5, amp: 0.08, t: t + 0.5, attack: 0.6 });
    },
    yarn(x, t) {                                             // the yarn draws tight: a string pulled up into tune
      const out = bus(0.4, 0.4), o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 1400;
      o.frequency.setValueAtTime(hz(4, 0) * 0.9, t); o.frequency.exponentialRampToValueAtTime(hz(4, 0), t + 0.35);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + 1.3);
    },
    bark(x, t) {                                             // the bark sheet: a dry, papery rustle, close
      const out = bus(0.62, 0.15);
      for (let k = 0; k < 22; k++) burst(out, { dur: 0.015 + rnd() * 0.03, freq: 1800 + rnd() * 3000, q: 0.9, amp: 0.12 * (1 - k / 22), t: t + k * 0.03 + rnd() * 0.02 });
    },
    dome(x, t) {                                             // the dome opens to daylight: air, birds, a bell
      const out = bus(0.5, 0.7);
      burst(out, { dur: 1.6, freq: 500, to: 5200, q: 0.6, amp: 0.12, t, type: 'highpass', attack: 0.8 });
      for (let k = 0; k < 3; k++) bird(t + 0.4 + k * 0.5);
      bell(out, hz(0, 2), 0.05, t + 0.6, 3);
    },
  });

  // ------------------------------------------------------------------ the film's own sound
  // loadFilm({ track, bed, map }): the soundtrack (the clips' audio cut as the picture is), the shimmer loop and the film
  // map (film.json: each frame's time in the soundtrack). Until they arrive, or if they cannot, the generated sound
  // stands in: nothing waits on them.
  let film = null, spanUntil = 0;
  const filmOut = ctx.createGain(); filmOut.gain.value = 0.9;
  { const r = ctx.createGain(); r.gain.value = 0.18; filmOut.connect(master); filmOut.connect(r).connect(room); }
  async function loadFilm({ track, bed, map }) {
    const get = async (url) => ctx.decodeAudioData(await (await fetch(url)).arrayBuffer());
    const [t, b, m] = await Promise.all([get(track), get(bed), fetch(map).then((r) => r.json())]);
    film = { track: t, times: m.time };
    const loop = ctx.createBufferSource(); loop.buffer = b; loop.loop = true;
    loop.connect(layer.shimmer); loop.start(Math.max(ctx.currentTime, 0) + 0.05);
    return true;
  }
  // plays the soundtrack from frame `from` to frame `to` over `seconds` (a flight through the film), or one moment
  function span(from, to, seconds) {
    if (!film || (realtime && ctx.state !== 'running')) return false;
    const T = film.times, a = T[Math.max(0, Math.min(T.length - 1, from))], b = T[Math.max(0, Math.min(T.length - 1, to))];
    const len = Math.abs(b - a);
    if (len < 0.08 || b < a) return false; // backwards or standing still: the generated whoosh carries it
    const t = ctx.currentTime + 0.01, src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = film.track;
    src.playbackRate.value = Math.max(0.75, Math.min(1.35, len / seconds)); // follow the flight, within a natural range
    const dur = len / src.playbackRate.value;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 0.12);
    g.gain.setValueAtTime(1, t + Math.max(0.12, dur - 0.25)); g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(g).connect(filmOut); src.start(t, a, len); src.stop(t + dur + 0.05);
    spanUntil = t + dur;
    return true;
  }

  const scratch = new Float32Array(analyser.fftSize);
  let air = 0;

  return {
    music,
    scene,
    schedule,
    loadFilm,
    /** A flight from frame `from` to frame `to` taking `seconds`: plays that stretch of the film's own sound. False if it
     * cannot (not loaded, or not moving forward), so the page can use a generated cue instead. */
    film(from, to, seconds) { return span(from, to, seconds); },
    /** A moment crossed by scrolling: about a second of the film's own sound from that frame (none while a flight plays). */
    moment(frame) { if (!film) return false; if (ctx.currentTime < spanUntil) return true; return span(frame, Math.min(film.times.length - 1, frame + 18), 1.0); },
    /** Registers fn({ at, x, y, v, chord }) for every santoor and flute note; x, y in 0..1 across the view; chord names the scene. */
    onNote(fn) { listeners.push(fn); },
    /** Lowers the score to a bed under the narrator's voice (true), or brings it back (false). */
    duck(v) { if (!musicOn) return; musicBus.gain.setTargetAtTime(v ? 0.32 : 1, ctx.currentTime, 0.35); },
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
