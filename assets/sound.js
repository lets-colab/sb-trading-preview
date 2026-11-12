// SB Trading sound: a generated score plus small tactile cues, all synthesised in the browser, no audio files.
// Loaded only after the visitor presses Sound (the AudioContext is created inside that click).
// The score (see "score" below) is a slow ambient piece in D major: a warm pad whose chord follows the chapter, soft
// bamboo-mallet notes placed around the listener with HRTF, and moving air that rises with scroll speed. It sits under
// the cues (tests/score.mjs measures it offline) and reports each note's position so the page can show it as light.
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
  // Seeded randomness, so the offline test hears the same piece every run.
  let s = (seed ?? Math.random() * 2 ** 32) >>> 0;
  const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const hz = (m) => 440 * 2 ** ((m - 69) / 12);
  const realtime = !(typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext);

  // Chords, all in D major so every change is consonant. pad: sustained voices; bells: the mallet notes' pool.
  const CHORDS = {
    0: { name: 'Dmaj9', pad: [50, 57, 64, 66, 73], bells: [74, 76, 78, 81, 85, 86] },   // Arrive: open, warm
    1: { name: 'Bm11', pad: [47, 54, 62, 64, 69], bells: [71, 74, 76, 78, 81, 83] },    // Discover: inward
    2: { name: 'Gmaj9#11', pad: [43, 50, 57, 61, 66], bells: [69, 71, 73, 74, 78, 81] }, // Transition: lift
    e0: { name: 'Dadd9', pad: [50, 57, 62, 64, 69], bells: [74, 76, 78, 81, 83, 86] },   // Explore: bamboo
    e1: { name: 'Em9', pad: [52, 59, 62, 66, 67], bells: [71, 74, 76, 78, 79, 83] },     // Explore: banana fibre
    e2: { name: 'A6/9', pad: [45, 52, 61, 66, 71], bells: [69, 71, 73, 76, 78, 81] },    // Explore: banana leaves
    4: { name: 'Dsus2', pad: [50, 57, 62, 64, 71], bells: [74, 76, 81, 83, 86] },        // Enquire: settle
  };

  // A long, dark, decorrelated hall (separate from the cues' small room), so the score has space and width.
  const hall = ctx.createConvolver();
  { const len = Math.round(ctx.sampleRate * 3.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let lp = 0;
      for (let i = 0; i < len; i++) { lp += (rnd() * 2 - 1 - lp) * 0.18; d[i] = lp * Math.pow(1 - i / len, 2.6); } }
    hall.buffer = ir; }
  const musicBus = ctx.createGain(); musicBus.gain.value = 0;
  const analyser = ctx.createAnalyser(); analyser.fftSize = 1024;
  musicBus.connect(analyser).connect(master);
  const hallIn = ctx.createGain(), hallOut = ctx.createGain(); hallOut.gain.value = 0.55;
  hallIn.connect(hall).connect(hallOut).connect(musicBus);

  // Pad: two detuned triangles per chord tone, each tone at its own place in the stereo field, breathing slowly.
  const padFilter = ctx.createBiquadFilter(); padFilter.type = 'lowpass'; padFilter.frequency.value = 1100; padFilter.Q.value = 0.4;
  const padLfo = ctx.createOscillator(), padLfoAmt = ctx.createGain();
  padLfo.frequency.value = 0.045; padLfoAmt.gain.value = 320; padLfo.connect(padLfoAmt).connect(padFilter.frequency);
  const padOut = ctx.createGain(); padOut.gain.value = 1;
  padFilter.connect(padOut); padOut.connect(musicBus);
  const padSend = ctx.createGain(); padSend.gain.value = 0.35; padOut.connect(padSend).connect(hallIn);

  function padChord(chord, t) {
    const group = ctx.createGain();
    group.gain.setValueAtTime(0, t); group.gain.linearRampToValueAtTime(1, t + 3.5);
    group.connect(padFilter);
    const oscs = [];
    chord.pad.forEach((m, k) => {
      const voice = ctx.createGain(), base = 0.016 * (k === 0 ? 1.3 : 1);
      voice.gain.value = base;
      const pan = ctx.createStereoPanner(); pan.pan.value = [-0.15, 0.55, -0.6, 0.35, -0.3, 0.7][k % 6];
      voice.connect(pan).connect(group);
      for (const cents of [-6, 7]) {
        const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(m); o.detune.value = cents;
        o.connect(voice); o.start(t); oscs.push(o);
      }
      const breath = ctx.createOscillator(), depth = ctx.createGain();
      breath.frequency.value = 0.06 + k * 0.017; depth.gain.value = base * 0.35;
      breath.connect(depth).connect(voice.gain); breath.start(t); oscs.push(breath);
    });
    const sub = ctx.createOscillator(), subG = ctx.createGain();       // a soft sine an octave under the root, for warmth
    sub.frequency.value = hz(chord.pad[0] - 12); subG.gain.value = 0.03;
    sub.connect(subG).connect(group); sub.start(t); oscs.push(sub);
    return { group, oscs };
  }

  // Air: filtered noise circling the listener (HRTF), louder and brighter while the visitor scrolls fast.
  const airSrc = ctx.createBufferSource(); airSrc.buffer = noise; airSrc.loop = true;
  const airBand = ctx.createBiquadFilter(); airBand.type = 'bandpass'; airBand.frequency.value = 650; airBand.Q.value = 0.7;
  const airGain = ctx.createGain(); airGain.gain.value = 0.02;
  const airPan = place(ctx.createPanner(), 0, 0, -2);
  airSrc.connect(airBand).connect(airGain).connect(airPan).connect(musicBus);
  let orbiters = null;
  if (airPan.positionX) {                              // the circle: a sine on x, a cosine on z, one turn per 40 s
    const orbit = (real, imag, param) => { const o = ctx.createOscillator(), g = ctx.createGain();
      o.setPeriodicWave(ctx.createPeriodicWave(new Float32Array(real), new Float32Array(imag))); o.frequency.value = 0.025;
      g.gain.value = 2.4; o.connect(g).connect(param); return o; };
    airPan.positionX.value = 0; airPan.positionZ.value = 0;
    orbiters = [orbit([0, 0], [0, 1], airPan.positionX), orbit([0, 1], [0, 0], airPan.positionZ)];
  }

  function place(p, x, y, z) {
    p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 1; p.rolloffFactor = 0.5;
    if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z);
    return p;
  }

  // Bamboo mallet: a marimba-like bar (fundamental, the 3.9x and 10x modes) with a felt-soft attack.
  function mallet(out, f, amp, t) {
    for (const [r, a, d] of [[1, 1, 2.4], [3.93, 0.22, 0.42], [10.1, 0.05, 0.1]]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f * r;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp * a, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(out); o.start(t); o.stop(t + d + 0.05);
    }
    burst(out, { dur: 0.02, freq: 1200, q: 0.7, amp: amp * 0.25, t, type: 'lowpass', attack: 0.004 });
  }

  let musicOn = false, started = false, current = null, padNow = null, nextNote = 0, lastBell = -1;
  const timeline = [];                                  // [{ t, key }] so notes scheduled ahead use the right chord
  const listeners = [];
  const chordAt = (t) => { let k = timeline[0]?.key ?? 0; for (const e of timeline) if (e.t <= t) k = e.key; return CHORDS[k]; };

  function note(t, chord, v) {
    let k; do k = Math.floor(rnd() * chord.bells.length); while (k === lastBell && chord.bells.length > 1);
    lastBell = k;
    const az = (rnd() * 2 - 1) * 1.15, dist = 1.4 + rnd() * 1.6, el = rnd() * 0.6 - 0.1; // azimuth in radians
    const p = place(ctx.createPanner(), Math.sin(az) * dist, el, -Math.cos(az) * dist);
    const send = ctx.createGain(); send.gain.value = 0.7;
    p.connect(musicBus); p.connect(send).connect(hallIn);
    mallet(p, hz(chord.bells[k]), 0.07 * v, t);
    const n = { at: t, x: Math.min(1, Math.max(0, 0.5 + az / 2.6)), y: Math.min(1, Math.max(0, 0.42 - el * 0.5)), v, chord: chord.name };
    for (const f of listeners) f(n);
  }

  // Schedules mallet notes up to time `until`: unhurried, sometimes a short figure of two or three notes.
  function schedule(until) {
    if (!musicOn) return;
    nextNote = Math.max(nextNote, ctx.currentTime + 0.05);
    while (nextNote < until) {
      const chord = chordAt(nextNote), figure = rnd() < 0.3 ? 2 + Math.floor(rnd() * 2) : 1;
      for (let i = 0; i < figure; i++) note(nextNote + i * 0.24, chord, 0.6 + rnd() * 0.4 - i * 0.12);
      nextNote += 1.4 + rnd() * 2.4;
    }
  }

  function scene({ chapter = 0, family = 0 } = {}, at) {
    const key = chapter === 3 ? `e${Math.max(0, Math.min(2, family))}` : CHORDS[chapter] ? chapter : 0;
    if (key === current) return;
    current = key;
    const t = at ?? ctx.currentTime;
    timeline.push({ t, key });
    if (!started) return;                               // the pad is built when the music first starts
    const next = padChord(CHORDS[key], t + 0.05), old = padNow;
    padNow = next;
    if (old) {
      old.group.gain.cancelScheduledValues(t); old.group.gain.setValueAtTime(old.group.gain.value, t);
      old.group.gain.linearRampToValueAtTime(0, t + 4);
      old.oscs.forEach((o) => o.stop(t + 4.2));
    }
  }

  function music(on, at) {
    const t = at ?? ctx.currentTime;
    if (on && !started) {
      started = true;
      if (current === null) scene({ chapter: 0 }, t);
      padNow = padChord(chordAt(t), t);
      padLfo.start(t); airSrc.start(t); orbiters?.forEach((o) => o.start(t));
      nextNote = t + 1.2;
    }
    musicOn = on;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(realtime ? musicBus.gain.value : on ? 0 : 1, t);
    musicBus.gain.linearRampToValueAtTime(on ? 1 : 0, t + (on ? 4 : 1.5));
  }

  if (realtime) setInterval(() => { if (musicOn && ctx.state === 'running') schedule(ctx.currentTime + 1.5); }, 400);

  const scratch = new Float32Array(analyser.fftSize);
  let air = 0;

  return {
    music,
    scene,
    schedule,
    /** Registers fn({ at, x, y, v, chord }) for every scheduled mallet note; x, y in 0..1 across the view. */
    onNote(fn) { listeners.push(fn); },
    /** Scroll speed 0..1: the air grows louder and brighter with it. */
    motion(speed) {
      const v = Math.min(1, Math.max(0, speed));
      if (Math.abs(v - air) < 0.03) return;
      air = v;
      const t = ctx.currentTime;
      airGain.gain.setTargetAtTime(0.02 + v * 0.07, t, 0.25);
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
