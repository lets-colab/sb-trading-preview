// SB Trading tactile sound: small cues generated in the browser, no background bed and no audio files.
// Loaded only after the visitor presses Sound (the AudioContext is created inside that click).
//   knock / knock-soft  a hollow bamboo knock (modal synthesis) when a material family opens
//   hover               a short fibre brush when the pointer meets a product
//   open                a deeper knock with a breath of air when a product sheet opens
//   reply               a soft two-note chime when Rifat answers
//   send / tick         a rising pluck when a message goes out; a light wooden tick when the enquiry updates
// Every cue is panned toward the element that triggered it (x is 0..1 across the viewport).
export function createSoundEngine(ctx) {
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

  return {
    cue(name, x = 0.5) {
      const f = cues[name];
      if (f && ctx.state === 'running') f(Number.isFinite(x) ? x : 0.5, ctx.currentTime + 0.005);
      else if (f && ctx.state !== 'closed') ctx.resume().then(() => f(Number.isFinite(x) ? x : 0.5, ctx.currentTime + 0.005)).catch(() => {});
    },
  };
}
