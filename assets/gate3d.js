// SB Trading · the opening in live 3D. A wireframe drawn in real time on a 2D canvas (no library, a few thousand
// segments a frame): a banana plant, a bamboo grove framing a clearing, two more banana plants, a contour terrain
// rising to a ridge, a reticle and rising gold motes. Everything is seeded, so every visit draws the same scene.
//
// The opening plays on its own (about 6.6 s): micro, inside the banana's pseudo-stem among its twisting fibres (banana
// fibre yarn is spun from them); macro, the camera pulls back to the whole plant; then it moves across into the bamboo
// grove, which draws itself in, and comes to rest. skip() glides to that rest in under a second. At rest the scene
// turns toward the pointer, its leaves sway, and the camera flies into the grove as the film begins (the fly follows
// the film's progress, so "Click to enter" and the visitor's own scroll move it the same way).
//
//   createGate3D(canvas, { low, intro, onIntroEnd }) -> { size(), draw(now, p, pointer) -> drew, skip(), get intro }
//     p: the film's progress (0 at the gate; the gate has faded by 0.1). pointer: [x, y], each -0.5..0.5.
//     Past the gate draw() clears once and returns false. A scroll during the opening skips it.
//     canvas.dataset: frames (frames drawn), phase (micro, macro, cross, grove), dist (the camera's distance).
//     low: fewer wires and no glow pass (phones, low-power devices). intro: false starts at rest.

const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = (x) => x * x * (3 - 2 * x);
const lerp = (a, b, t) => a + (b - a) * t;
const COLORS = ['243,248,252', '95,211,224', '231,214,182']; // cloud, signal, fibre gold (DESIGN.md tokens)
const Y0 = -1.25; // the ground
const HERO = { x: -8, z: 1.2, s: 1.15 }; // the banana plant the opening starts inside, off to the grove's left
const T_PULL = 1.5, T_CROSS = 4, T_END = 6.6, GROVE = 3.4; // the opening's beats (s); the grove draws in from GROVE

function rng(seed) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function createGate3D(canvas, { low = false, intro = true, onIntroEnd = () => {} } = {}) {
  const g = canvas.getContext('2d');
  const rnd = rng(20261116);
  const delay = intro ? GROVE : 0, groundDelay = intro ? 1.3 : 0;
  const lines = []; // fixed polylines: { p: [x, y, z, ...], c: colour, a: alpha, t0: reveal start (s), d: reveal length (s) }
  const add = (p, c, a, t0, d = 1.1) => lines.push({ p, c, a, t0, d });

  // terrain: contour rows, flat near the camera and rising into a ridge at the back; the farthest row is the skyline
  for (let z = -10; z <= 2.6; z += low ? 0.8 : 0.5) {
    const far = smooth(-2.5, -9.5, z), p = [];
    for (let x = -14; x <= 14.01; x += low ? 0.7 : 0.45) {
      const ridge = 0.5 * Math.sin(x * 0.42 + 1.3) + 0.3 * Math.sin(x * 0.93 + z * 0.7) + 0.18 * Math.sin(x * 1.9 + 2.1);
      p.push(x, Y0 + far * (1.35 + ridge * 1.25) + (1 - far) * 0.04 * Math.sin(x * 1.3 + z * 2), z);
    }
    add(p, 0, z < -9.6 ? 0.85 : 0.3, groundDelay + 0.1 + ((z + 10) / 12.6) * 0.5, 1.2);
  }

  // bamboo culms: wires along each culm, rings at its nodes, leaves (swaying, below) at the upper nodes
  const leaves = [];
  const CULMS = [ // two stands framing a clearing: the headline and the reticle stand in the open, in the middle
    [-2.05, 0.6, 0.075, 5.2, -0.3], [-2.75, -0.5, 0.085, 5.6, -0.15], [-3.6, 0.9, 0.07, 4.9, 0.2], [-4.5, -1.6, 0.08, 5.4, -0.25],
    [-3.1, -3.2, 0.065, 4.6, 0.1], [2.1, 0.4, 0.08, 5.5, 0.3], [2.9, -0.8, 0.07, 4.8, 0.12], [3.7, 0.8, 0.085, 5.3, -0.2],
    [4.6, -1.9, 0.07, 5.0, 0.25], [3.3, -3.4, 0.06, 4.5, -0.1],
  ];
  CULMS.forEach(([cx, cz, r, top, lean], k) => {
    const axis = (y) => { const u = (y - Y0) / (top - Y0); return [cx + lean * u * u, cz, r * (1 - 0.25 * u)]; };
    const wires = low ? 3 : 5;
    for (let w = 0; w < wires; w++) {
      const a = (w / wires) * TAU + k, p = [];
      for (let y = Y0; y <= top + 0.001; y += 0.3) { const [ax, az, rr] = axis(y); p.push(ax + rr * Math.cos(a), y, az + rr * Math.sin(a)); }
      add(p, 0, 0.55, delay + 0.35 + k * 0.07, 1.3);
    }
    let n = 0;
    for (let y = Y0 + 0.45; y < top - 0.2; y += 0.62 + rnd() * 0.12, n++) {
      const [ax, az, rr] = axis(y), p = [];
      for (let i = 0; i <= 16; i++) { const a = (i / 16) * TAU; p.push(ax + rr * 1.2 * Math.cos(a), y, az + rr * 1.2 * Math.sin(a)); }
      add(p, 0, 0.6, delay + 0.6 + k * 0.05 + n * 0.03, 0.6);
      const u = (y - Y0) / (top - Y0);
      if (u > 0.45) for (let j = 0; j < (low ? 1 : u > 0.7 ? 2 : 1); j++) {
        leaves.push({ x: ax, y, z: az, th: rnd() * TAU, L: 0.55 + rnd() * 0.4, W: 0.07 + rnd() * 0.035, ph: rnd() * TAU, t0: delay + 1 + k * 0.06 + n * 0.04 });
      }
    }
  });

  // banana plants: a pseudo-stem and five broad paddle leaves that rise and arch over, veined edge to edge. The first is
  // the opening's plant (drawn from the start); the other two stand at the grove's front corners.
  const bananas = [];
  for (const [bx, bz, s, t0] of [[HERO.x, HERO.z, HERO.s, 0.5], [3.05, 1.5, 1, delay + 0.8], [-3.2, 1.7, 0.9, delay + 0.8]]) {
    const h = 1.7 * s, rr = 0.17 * s;
    for (let w = 0; w < (low ? 4 : 6); w++) {
      const a = (w / (low ? 4 : 6)) * TAU, p = [];
      for (let y = Y0; y <= Y0 + h + 0.001; y += 0.25) p.push(bx + rr * Math.cos(a), y, bz + rr * Math.sin(a));
      add(p, 0, 0.5, t0 - 0.3, 1);
    }
    for (let i = 0; i < 5; i++) {
      bananas.push({ x: bx, y: Y0 + h - 0.05, z: bz, th: (i / 5) * TAU + 0.4 + rnd() * 0.3, L: 2 * s * (0.85 + rnd() * 0.3), W: 0.4 * s, ph: rnd() * TAU, t0: t0 + i * 0.08 });
    }
  }

  // the fibres inside the opening plant's pseudo-stem: strands spiralling tightly upward, like the plies of a yarn, in
  // fibre gold; they turn slowly while the camera is among them
  const strands = [];
  for (let i = 0; i < (low ? 18 : 34); i++) {
    strands.push({ r: 0.17 * HERO.s * 0.85 * (0.15 + 0.85 * Math.sqrt(rnd())), a0: rnd() * TAU, tw: (rnd() < 0.5 ? 1 : -1) * (4.5 + rnd() * 3), w: 0.4 + rnd() * 0.5, t0: 0.05 + rnd() * 0.5 });
  }
  const strandH = 1.7 * HERO.s;
  const strand = (o, t) => { const p = []; for (let y = Y0 + 0.05; y <= Y0 + strandH; y += 0.03) { const a = o.a0 + (y - Y0) * o.tw + t * o.w; p.push(HERO.x + o.r * Math.cos(a), y, HERO.z + o.r * Math.sin(a)); } return p; };

  // motes: gold specks rising through the scene
  const motes = Array.from({ length: low ? 70 : 160 }, () => ({ x: (rnd() - 0.5) * 12, y: Y0 + rnd() * 5.8, z: -7 + rnd() * 10, v: 0.05 + rnd() * 0.1, s: 0.6 + rnd() * 1.4, ph: rnd() * TAU }));

  // ------------------------------------------------------------------ camera and drawing
  let W = 0, H = 0, dpr = 1, start = 0, last = 0, frames = 0, cleared = false;
  let playing = intro, skipFrom = null, skipAt = 0, tShift = 0; // tShift moves the reveal clock on after a skip
  const turn = [0, 0];
  const cam = { x: 0, y: 0, z: 0, r: [1, 0, 0], u: [0, 1, 0], f: [0, 0, -1], F: 1, cy: 0, sin: 0, cos: 1, ps: 0, pc: 1, near: 0.12 };
  const buckets = new Map(); // colour * 100 + level -> Path2D
  const LEVELS = 10;
  let nearA = 0.15, nearB = 1.3;

  function project(x, y, z, out) { // scene turn (yaw about Y, then pitch about X), then the camera
    const x1 = x * cam.cos + z * cam.sin, z1 = -x * cam.sin + z * cam.cos;
    const y2 = y * cam.pc - z1 * cam.ps, z2 = y * cam.ps + z1 * cam.pc;
    const dx = x1 - cam.x, dy = y2 - cam.y, dz = z2 - cam.z;
    const zc = dx * cam.f[0] + dy * cam.f[1] + dz * cam.f[2];
    out[2] = zc;
    if (zc < cam.near) return false;
    out[0] = W / 2 + ((dx * cam.r[0] + dy * cam.r[1] + dz * cam.r[2]) / zc) * cam.F;
    out[1] = cam.cy - ((dx * cam.u[0] + dy * cam.u[1] + dz * cam.u[2]) / zc) * cam.F;
    return true;
  }
  const fog = (z) => smooth(nearA, nearB, z) * (1 - smooth(5, 19, z)); // fade lines too near the lens and far in the haze
  const A = [0, 0, 0], B = [0, 0, 0];
  function stroke(p, c, a, f) { // one polyline, revealed to fraction f
    const n = p.length / 3 - 1;
    if (n < 1 || f <= 0) return;
    const shown = f * n;
    let ok = project(p[0], p[1], p[2], A);
    for (let i = 1; i <= Math.ceil(shown); i++) {
      let x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2];
      if (i > shown) { const t = shown - (i - 1); x = p[i * 3 - 3] + (x - p[i * 3 - 3]) * t; y = p[i * 3 - 2] + (y - p[i * 3 - 2]) * t; z = p[i * 3 - 1] + (z - p[i * 3 - 1]) * t; }
      const okB = project(x, y, z, B);
      if (ok && okB) {
        const level = Math.round(a * fog((A[2] + B[2]) / 2) * LEVELS);
        if (level > 0) {
          const key = c * 100 + level;
          let path = buckets.get(key);
          if (!path) { path = new Path2D(); buckets.set(key, path); }
          path.moveTo(A[0], A[1]); path.lineTo(B[0], B[1]);
        }
      }
      A[0] = B[0]; A[1] = B[1]; A[2] = B[2]; ok = okB;
    }
  }
  const reveal = (t, t0, d) => clamp((t - t0) / d);

  function leaf(o, t, sway) { // a bamboo leaf: lanceolate, drooping, swaying in the air
    const th = o.th + Math.sin(t * 1.05 + o.ph) * sway, dx = Math.cos(th), dz = Math.sin(th), nx = -dz, nz = dx;
    const left = [], right = [], mid = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10, cx = o.x + dx * o.L * u, cy = o.y + 0.18 * o.L * u - 0.5 * o.L * u * u, cz = o.z + dz * o.L * u;
      const w = o.W * Math.sin(Math.PI * Math.min(1, u * 1.05)) ** 0.9 * (1 - 0.35 * u);
      left.push(cx + nx * w, cy, cz + nz * w); right.unshift(cx - nx * w, cy, cz - nz * w); mid.push(cx, cy, cz);
    }
    return [left.concat(right), mid];
  }
  function bananaLeaf(o, t) { // a banana leaf: a midrib rising and arching, a broad blade, veins edge to edge
    const th = o.th + Math.sin(t * 0.55 + o.ph) * 0.045, dx = Math.cos(th), dz = Math.sin(th), nx = -dz, nz = dx;
    const at = (u) => [o.x + dx * o.L * u, o.y + o.L * (0.75 * u - 0.95 * u * u), o.z + dz * o.L * u];
    const half = (u) => o.W * Math.sin(Math.PI * u) ** 0.7;
    const edge = (u, side) => { const [x, y, z] = at(u), w = half(u); return [x + nx * w * side, y - 0.12 * w, z + nz * w * side]; };
    const mid = [], e1 = [], e2 = [], veins = [];
    for (let i = 0; i <= 16; i++) { const u = i / 16; mid.push(...at(u)); e1.push(...edge(u, 1)); e2.push(...edge(u, -1)); }
    for (let u = 0.1; u < 0.9; u += low ? 0.1 : 0.055) for (const side of [1, -1]) veins.push([...at(u), ...edge(Math.min(0.97, u + 0.035), side)]);
    return { mid, e1, e2, veins };
  }

  // a camera pose: the point it looks at, then where it sits around it (yaw, pitch, distance), and its vertical field
  const pose = (lx, ly, lz, yaw, pitch, dist, fov) => ({ l: [lx, ly, lz], yaw, pitch, dist, fov });
  const mix = (a, b, t) => ({ l: a.l.map((v, i) => lerp(v, b.l[i], t)), yaw: lerp(a.yaw, b.yaw, t), pitch: lerp(a.pitch, b.pitch, t),
    dist: Math.exp(lerp(Math.log(a.dist), Math.log(b.dist), t)), fov: lerp(a.fov, b.fov, t) }); // distance eases in log space: a zoom
  function restPose(fly) { // at rest on the grove; fly (0..1) carries the camera forward through it as the film begins
    const aspect = W / H, D = Math.max(6.6, 2.5 / (aspect * Math.tan((46 * Math.PI / 180) / 2)));
    const cz = D * (1 - fly) - 2.6 * fly, cy = 0.55 + 0.9 * fly, ly = 0.95 + 1.2 * fly, oz = cz + 2, oy = cy - ly;
    return pose(0, ly, -2, 0, Math.atan2(oy, oz), Math.hypot(oy, oz), 46 + 32 * fly);
  }
  const MICRO_A = pose(HERO.x, -0.85, HERO.z, 0.45, 0.04, 0.3, 40), MICRO_B = pose(HERO.x, -0.4, HERO.z, 0.72, 0.06, 0.5, 42); // rising up the stem
  const MACRO = pose(HERO.x + 0.25, -0.1, HERO.z, 0.55, 0.12, 5.6, 46);
  function introPose(t, rest) {
    if (t < T_PULL) return mix(MICRO_A, MICRO_B, ease(t / T_PULL));
    if (t < T_CROSS) return mix(MICRO_B, MACRO, ease((t - T_PULL) / (T_CROSS - T_PULL)));
    return mix(MACRO, rest, ease(clamp((t - T_CROSS) / (T_END - T_CROSS))));
  }
  function place(P) {
    const cp = Math.cos(P.pitch);
    cam.x = P.l[0] + P.dist * Math.sin(P.yaw) * cp; cam.y = P.l[1] + P.dist * Math.sin(P.pitch); cam.z = P.l[2] + P.dist * Math.cos(P.yaw) * cp;
    let fx = P.l[0] - cam.x, fy = P.l[1] - cam.y, fz = P.l[2] - cam.z; const fl = Math.hypot(fx, fy, fz); fx /= fl; fy /= fl; fz /= fl;
    let rx = -fz, rz = fx; const rl = Math.hypot(rx, rz); rx /= rl; rz /= rl; // right = forward x up
    cam.f = [fx, fy, fz]; cam.r = [rx, 0, rz];
    cam.u = [-(rz * fy), rz * fx - rx * fz, rx * fy]; // up = right x forward
    cam.F = (H / 2) / Math.tan((P.fov * Math.PI / 180) / 2); cam.cy = H * 0.54;
    const q = clamp(P.dist / 7, 0.05, 1); // close in, the lens may come near the lines without fading them
    nearA = 0.15 * q; nearB = 1.3 * q; cam.near = Math.max(0.008, 0.12 * q);
  }
  function finish(now, t) { // the opening ends (on time, or skipped): from here the scene is at rest
    if (!playing) return;
    playing = false;
    if (t < T_END) { skipFrom = current; skipAt = now; tShift = Math.max(0, delay + 2.4 - t); }
    onIntroEnd();
  }
  let current = MICRO_A;

  return {
    get intro() { return playing; },
    size() {
      dpr = Math.min(devicePixelRatio || 1, low ? 1.25 : 1.75);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    },
    skip() { if (playing) finish(last || performance.now(), last && start ? (last - start) / 1000 : 0); },
    draw(now, p, pointer) {
      if (p >= 0.1) { if (playing) finish(now, (now - start) / 1000); if (!cleared) { g.clearRect(0, 0, canvas.width, canvas.height); cleared = true; } return false; }
      cleared = false;
      if (!W) this.size();
      if (!start) start = now - (intro ? 0 : T_END * 1000);
      const t = (now - start) / 1000, dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
      last = now;
      if (playing && (t >= T_END || p > 0.012)) finish(now, t);
      const tr = t + tShift; // the reveal clock
      // at rest the scene turns toward the pointer (eased), with a slow drift of its own; still during the opening
      const settle = playing ? 0 : skipFrom ? smooth(0, 900, now - skipAt) : 1, k = 1 - Math.exp(-3 * dt);
      turn[0] += ((pointer[0] * 0.55 + Math.sin(t * 0.11) * 0.07) * settle - turn[0]) * k;
      turn[1] += ((-pointer[1] * 0.18 + Math.sin(t * 0.07) * 0.02) * settle - turn[1]) * k;
      cam.sin = Math.sin(turn[0]); cam.cos = Math.cos(turn[0]); cam.ps = Math.sin(turn[1]); cam.pc = Math.cos(turn[1]);
      const rest = restPose(smooth(0.012, 0.1, p));
      if (playing) current = introPose(t, rest);
      else if (skipFrom && now - skipAt < 900) current = mix(skipFrom, rest, ease((now - skipAt) / 900));
      else { current = rest; skipFrom = null; }
      place(current);
      canvas.dataset.phase = playing ? (current.dist < 1.5 ? 'micro' : t < T_CROSS ? 'macro' : 'cross') : 'grove';
      canvas.dataset.dist = current.dist.toFixed(2);

      buckets.clear();
      for (const l of lines) stroke(l.p, l.c, l.a, reveal(tr, l.t0, l.d));
      const strandA = 0.16 + 0.6 * (1 - smooth(0.8, 3.2, current.dist)); // bright up close, a faint glow in the stem from afar
      for (const s of strands) { const f = reveal(tr, s.t0, 1.1); if (f > 0 && strandA * LEVELS >= 0.5) stroke(strand(s, t), 2, strandA, f); }
      for (const o of leaves) { const f = reveal(tr, o.t0, 0.8); if (f <= 0) continue; const [outline, mid] = leaf(o, t, 0.09); stroke(outline, 0, 0.55, f); stroke(mid, 0, 0.35, f); }
      for (const o of bananas) {
        const f = reveal(tr, o.t0, 1.2); if (f <= 0) continue;
        const b = bananaLeaf(o, t);
        stroke(b.mid, 0, 0.7, f); stroke(b.e1, 0, 0.55, f); stroke(b.e2, 0, 0.55, f);
        for (const v of b.veins) stroke(v, 0, 0.26, f);
      }
      // the reticle on the specimen point: a ring, its ticks and a turning dashed halo, in signal cyan
      const rf = reveal(tr, delay + (intro ? 2.4 : 1.2), 0.9);
      if (rf > 0) {
        const RX = 0, RY = 0.95, RZ = 0.4, ring = (r, a0 = 0, a1 = TAU, n = 64) => { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); p.push(RX + r * Math.cos(a), RY + r * Math.sin(a), RZ); } return p; };
        stroke(ring(1.25), 1, 0.8, rf); stroke(ring(0.045, 0, TAU, 12), 1, 0.9, rf);
        for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU; stroke([RX + 1.32 * Math.cos(a), RY + 1.32 * Math.sin(a), RZ, RX + 1.5 * Math.cos(a), RY + 1.5 * Math.sin(a), RZ], 1, 0.8, rf); }
        for (let i = 0; i < 20; i++) { const a = (i / 20) * TAU + t * 0.15; stroke(ring(1.42, a, a + 0.11, 4), 1, 0.55, rf); }
      }

      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      g.globalCompositeOperation = 'lighter';
      const fade = smooth(0, 0.6, t) * (1 - smooth(0.055, 0.1, p));
      g.lineCap = 'round';
      for (const pass of low ? [1] : [0, 1]) { // a soft wide glow, then the fine line
        g.lineWidth = pass ? 1.05 : 3.4;
        for (const [key, path] of buckets) {
          const c = Math.floor(key / 100), level = key % 100;
          g.strokeStyle = `rgba(${COLORS[c]},${((level / LEVELS) * fade * (pass ? 1 : 0.16)).toFixed(3)})`;
          g.stroke(path);
        }
      }
      for (const m of motes) { // the motes rise and twinkle
        m.y += m.v * dt; if (m.y > 4.6) m.y = Y0;
        if (!project(m.x, m.y, m.z, A)) continue;
        const a = 0.7 * fog(A[2]) * (0.6 + 0.4 * Math.sin(t * 1.7 + m.ph)) * fade;
        if (a < 0.03) continue;
        const s = (m.s * 3) / Math.max(1, A[2] * 0.6);
        g.fillStyle = `rgba(${COLORS[2]},${a.toFixed(3)})`;
        g.fillRect(A[0] - s / 2, A[1] - s / 2, s, s);
      }
      g.globalCompositeOperation = 'source-over';
      canvas.dataset.frames = String(++frames);
      return true;
    },
  };
}
