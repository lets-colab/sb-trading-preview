// SB Trading — spatial sound (concept). Loaded only after the visitor presses Sound; nothing plays before.
// Every sound is synthesised in the browser from noise and oscillators: no recordings, nothing to license.
// Binaural (HRTF) placement: bamboo knocks come from the side each culm passes on, fibre swishes cross in front,
// wind and leaves surround the listener and rise with scroll speed.

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

export function createSoundEngine(ctx) {
  const sr = ctx.sampleRate, now = () => ctx.currentTime, seen = new WeakMap();
  const glide = (param, v, tau = 0.25) => {
    if (!Number.isFinite(v)) return;
    const last = seen.get(param);
    if (last !== undefined && Math.abs(last - v) < 1e-4) return;
    seen.set(param, v); param.setTargetAtTime(v, now(), tau);
  };
  const amp = (g) => { const n = ctx.createGain(); n.gain.value = g; return n; };
  const filter = (type, f, Q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = Q; return b; };
  const osc = (type, f, at = now()) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(at); return o; };
  function noise(seconds, colour) {
    const len = Math.floor(sr * seconds), buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (colour === 'pink') { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
      else if (colour === 'flutter') { last += (Math.random() - 0.5) * 0.02; last *= 0.997; d[i] = last; } // slow random wobble for leaf flutter
      else d[i] = w * 0.5;
    }
    const drift = d[len - 1] - d[0];
    for (let i = 0; i < len; i++) d[i] -= drift * (i / (len - 1));
    return buf;
  }
  const PINK = noise(5, 'pink'), WHITE = noise(3, 'white'), FLUTTER = noise(4, 'flutter');
  const loop = (buf, rate = 1) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = rate; s.start(now(), Math.random() * buf.duration); return s; };

  // Master: high-pass, a gentle compressor, a short open-air reverb.
  const out = amp(0), comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.006; comp.release.value = 0.3;
  out.connect(filter('highpass', 35)).connect(comp).connect(ctx.destination);
  const dry = amp(1); dry.connect(out);
  const ir = ctx.createBuffer(2, Math.floor(sr * 1.8), sr);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3.5) * Math.min(1, i / (sr * 0.01)); }
  const verb = ctx.createConvolver(); verb.buffer = ir;
  const wetIn = amp(1), wet = amp(0.3); wetIn.connect(filter('highpass', 200)).connect(verb).connect(wet).connect(out);
  const L = ctx.listener;
  const face = (a) => { if (L.forwardX) { glide(L.forwardX, Math.sin(a), 0.15); glide(L.forwardZ, -Math.cos(a), 0.15); } else L.setOrientation(Math.sin(a), 0, -Math.cos(a), 0, 1, 0); };

  // Beds: wind through the grove (left and right), leaves fluttering above, a low air tone.
  const bed = (pan, src, chain, send = 0.15) => { const g = amp(0), p = ctx.createStereoPanner(); p.pan.value = pan; src.connect(chain[0]); chain.reduce((a, b) => a.connect(b)); chain[chain.length - 1].connect(g).connect(p); p.connect(dry); p.connect(amp(send)).connect(wetIn); return g; };
  const wind = [-0.7, 0.7].map((pan, k) => { const f = filter('bandpass', k ? 520 : 430, 0.5), sw = amp(0.6); osc('sine', k ? 0.09 : 0.13).connect(amp(0.3)).connect(sw.gain); return bed(pan, loop(PINK), [f, sw]); });
  const leaves = [-0.5, 0.5].map((pan, k) => { const f = filter('highpass', 3800, 0.7), fl = amp(0.15); loop(FLUTTER, k ? 0.9 : 1.1).connect(amp(1.1)).connect(fl.gain); return bed(pan, loop(WHITE), [f, fl], 0.25); });
  const air = bed(0, loop(PINK), [filter('lowpass', 260, 0.5)], 0.05);

  // One-shots, each placed where it happens.
  let live = 0;
  function shot(pos, ref = 3, send = 0.35) {
    if (live > 14) return null;
    live++;
    const g = amp(1), p = ctx.createPanner();
    p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = ref;
    if (p.positionX) { p.positionX.value = pos[0]; p.positionY.value = pos[1]; p.positionZ.value = pos[2]; } else p.setPosition(...pos);
    const s = amp(send); g.connect(p); p.connect(dry); p.connect(s); s.connect(wetIn);
    return { g, p, end(t) { const c = ctx.createConstantSource(); c.offset.value = 0; c.connect(g); c.onended = () => { live--; g.disconnect(); p.disconnect(); s.disconnect(); }; c.start(); c.stop(t + 0.1); } };
  }
  /** Hollow bamboo struck: a few inharmonic modes that die fast, plus the click of the hit. */
  function knock(pos, level = 0.5, pitch = 1) {
    const v = shot(pos, 3, 0.4); if (!v) return;
    const t = now() + 0.005, f0 = (240 + Math.random() * 160) * pitch;
    for (const [r, g, d] of [[1, 1, 0.12], [2.72, 0.45, 0.07], [5.3, 0.2, 0.04]]) {
      const o = osc('sine', f0 * r, t), e = amp(0);
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g * level * 0.35, t + 0.002); e.gain.setTargetAtTime(0, t + 0.002, d);
      o.connect(e).connect(v.g); o.stop(t + d * 8);
    }
    const n = ctx.createBufferSource(); n.buffer = WHITE; const ne = amp(0);
    ne.gain.setValueAtTime(level * 0.4, t); ne.gain.setTargetAtTime(0, t, 0.006);
    n.connect(filter('bandpass', 2500, 1)).connect(ne).connect(v.g); n.start(t, Math.random()); n.stop(t + 0.08);
    v.end(t + 1.2);
  }
  /** A strand of fibre sweeping past: bright filtered noise travelling across the listener. */
  function swish(from, to, dur = 0.9, level = 0.35) {
    const v = shot(from, 2, 0.3); if (!v) return;
    const t = now() + 0.01;
    if (v.p.positionX) [v.p.positionX, v.p.positionY, v.p.positionZ].forEach((pa, i) => { pa.setValueAtTime(from[i], t); pa.linearRampToValueAtTime(to[i], t + dur); });
    const n = ctx.createBufferSource(); n.buffer = PINK; n.loop = true;
    const f = filter('bandpass', 1500, 1.4); f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(4200, t + dur);
    const e = amp(0); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(level, t + dur * 0.5); e.gain.linearRampToValueAtTime(0, t + dur);
    n.connect(f).connect(e).connect(v.g); n.start(t, Math.random() * 2); n.stop(t + dur + 0.05);
    v.end(t + dur);
  }
  function chime(pos) {
    const v = shot(pos, 3, 0.8); if (!v) return;
    const t = now() + 0.01;
    for (const [f, g] of [[523.25, 0.12], [783.99, 0.07]]) { const o = osc('sine', f, t), e = amp(0); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + 0.01); e.gain.setTargetAtTime(0, t + 0.01, 0.5); o.connect(e).connect(v.g); o.stop(t + 3); }
    v.end(t + 3);
  }

  // Scroll cues in the grove: fibre strands cross in front of the listener, alternating direction.
  const SWISH = [0.18, 0.38, 0.58, 0.78];
  let prev = null;
  return {
    enable(on) { glide(out.gain, on ? 0.85 : 0, on ? 0.5 : 0.2); },
    /** state: { zone: 'film'|'grove'|'light'|'dark', p, vel, pointer:[x,y], passed:[dx...] } */
    update(s) {
      const speed = Math.abs(s.vel || 0), inGrove = s.zone === 'grove', outdoor = inGrove || s.zone === 'film';
      for (const g of wind) glide(g.gain, (outdoor ? 0.18 : 0.04) + Math.min(0.3, speed * 0.15), 0.4);
      for (const g of leaves) glide(g.gain, inGrove ? 0.22 : s.zone === 'film' ? 0.1 : 0, 0.6);
      glide(air.gain, s.zone === 'light' ? 0.06 : 0.12, 0.8);
      glide(wet.gain, inGrove ? 0.4 : 0.22, 0.8);
      for (const dx of s.passed || []) knock([clamp(dx, -3, 3) * 1.4, 0.6, 0.6], 0.35 + Math.random() * 0.25, 0.9 + Math.random() * 0.25);
      if (prev && inGrove && prev.zone === 'grove') SWISH.forEach((at, k) => { if (prev.p < at && s.p >= at) swish([k % 2 ? 4 : -4, 1.2, -2.5], [k % 2 ? -4 : 4, 0.8, -1.5]); });
      face((s.pointer?.[0] || 0) * 0.5);
      prev = s;
    },
    /** Interface sounds: x is the element's horizontal screen position (0–1). */
    cue(name, x = 0.5) {
      const pos = [(x - 0.5) * 4, 0, -1.5];
      if (name === 'hover') knock(pos, 0.14, 1.6);
      if (name === 'press') knock(pos, 0.3, 1.25);
      if (name === 'open') swish([pos[0] - 2, 0, -2], [pos[0] + 2, 0, -1], 0.5, 0.22);
      if (name === 'send') chime(pos);
    },
  };
}
