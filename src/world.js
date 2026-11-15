// SB Trading · the 3D journey (three.js, MIT). Bundled by build.mjs to assets/vendor/world.js.
// A real-time scene the scroll moves the camera through, after the owner's reference videos: a dark bamboo grove with
// light shafts and drifting dust; out of the grove into a white showroom under a skylight; a bamboo pole that splits
// open (bamboo splits); a banana stem whose fibres peel, twist through the air and wind into a yarn ball (SB Trading's
// yarn is banana fibre, never bamboo); banana bark and leaves from the same plant; and a gallery of three lit cases.
// Everything is drawn by code (a 3D illustration, labelled as such on the page); SB Trading's photographs stay in the
// product drawers. Exported product builders are shared with the Explore specimens.
//
// API: createJourney(canvas, { low }) -> { setSize(w, h), render({ p, pointer, now }), ready }
//   p is the film's scroll progress 0..1; render draws one frame.
import * as T from 'three';

// ------------------------------------------------------------------ helpers
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ramp = (x, a, b) => clamp((x - a) / (b - a));
const smooth = (x, a, b) => { const t = ramp(x, a, b); return t * t * (3 - 2 * t); };
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function canvasTexture(w, h, draw, { repeat = [1, 1], srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c);
  if (srgb) t.colorSpace = T.SRGBColorSpace;
  t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); t.anisotropy = 4;
  return t;
}

// ------------------------------------------------------------------ textures (drawn, not photographed)
function bambooTexture() {
  return canvasTexture(256, 512, (g, w, h) => {
    const r = rng(7);
    const grad = g.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#3e6a26'); grad.addColorStop(0.5, '#5f8f36'); grad.addColorStop(1, '#3e6a26');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '30,50,20' : '170,200,120'},${0.05 + r() * 0.08})`; g.fillRect(r() * w, 0, 1 + r() * 2, h); }
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(20,35,12,${r() * 0.25})`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
    for (const y of [0.0, 0.25, 0.5, 0.75]) { // nodes
      g.fillStyle = 'rgba(25,40,15,0.75)'; g.fillRect(0, y * h, w, 3);
      g.fillStyle = 'rgba(200,215,150,0.35)'; g.fillRect(0, y * h + 3, w, 5);
      g.fillStyle = 'rgba(40,60,20,0.25)'; g.fillRect(0, y * h - 6, w, 6);
    }
  }, { repeat: [1, 4] });
}
function bambooInnerTexture() {
  return canvasTexture(128, 512, (g, w, h) => {
    const r = rng(11);
    g.fillStyle = '#e4d1a2'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '160,130,80' : '250,240,210'},${0.1 + r() * 0.15})`; g.fillRect(r() * w, 0, 1, h); }
  }, { repeat: [1, 2] });
}
function stemTexture() {
  return canvasTexture(256, 512, (g, w, h) => {
    const r = rng(13);
    const grad = g.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#9fb36a'); grad.addColorStop(0.5, '#cbd79d'); grad.addColorStop(1, '#9fb36a');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(90,110,50,${0.08 + r() * 0.12})`; g.fillRect(r() * w, 0, 1 + r() * 3, h); }
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(110,60,50,${0.08 + r() * 0.12})`; g.beginPath(); g.ellipse(r() * w, r() * h, 3 + r() * 10, 8 + r() * 30, 0, 0, 6.3); g.fill(); }
  });
}
function leafTexture(broad = false) {
  return canvasTexture(broad ? 256 : 64, broad ? 512 : 256, (g, w, h) => {
    const r = rng(broad ? 17 : 19);
    g.clearRect(0, 0, w, h);
    g.beginPath(); g.moveTo(w / 2, 0);
    g.quadraticCurveTo(w * (broad ? 1.05 : 1.0), h * 0.35, w / 2, h); g.quadraticCurveTo(w * (broad ? -0.05 : 0), h * 0.35, w / 2, 0);
    const grad = g.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, broad ? '#2f6a1f' : '#3b6e22'); grad.addColorStop(0.5, broad ? '#4d8d2b' : '#5f9a33'); grad.addColorStop(1, broad ? '#2f6a1f' : '#3b6e22');
    g.fillStyle = grad; g.fill();
    g.save(); g.clip();
    g.strokeStyle = 'rgba(210,230,160,0.55)'; g.lineWidth = broad ? 3 : 1.5; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
    g.strokeStyle = 'rgba(25,60,15,0.35)'; g.lineWidth = 1;
    for (let y = 8; y < h; y += broad ? 9 : 14) { g.beginPath(); g.moveTo(w / 2, y); g.lineTo(0, y - (broad ? 30 : 10)); g.moveTo(w / 2, y); g.lineTo(w, y - (broad ? 30 : 10)); g.stroke(); }
    for (let i = 0; i < (broad ? 6 : 0); i++) { g.clearRect(r() < 0.5 ? 0 : w * 0.82, r() * h, w * 0.18, 2 + r() * 4); } // torn edges
    g.restore();
  });
}
function barkTexture() {
  return canvasTexture(512, 512, (g, w, h) => {
    const r = rng(23);
    g.fillStyle = '#9a7650'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? '70,48,28' : '200,170,120'},${0.15 + r() * 0.25})`; g.lineWidth = 0.5 + r() * 2; const x = r() * w; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + r() * 20 - 10, h * 0.3, x + r() * 20 - 10, h * 0.7, x + r() * 16 - 8, h); g.stroke(); }
    for (let i = 0; i < 26; i++) { g.fillStyle = 'rgba(50,32,18,0.55)'; g.beginPath(); g.ellipse(r() * w, r() * h, 2 + r() * 6, 6 + r() * 18, 0, 0, 6.3); g.fill(); }
  });
}
function glowTexture() {
  return canvasTexture(128, 128, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(0,0,0,0.45)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  }, { srgb: false });
}

// ------------------------------------------------------------------ shared materials and product builders
export function createMaterials() {
  return {
    bamboo: new T.MeshStandardMaterial({ map: bambooTexture(), roughness: 0.55, metalness: 0 }),
    bambooInner: new T.MeshStandardMaterial({ map: bambooInnerTexture(), roughness: 0.8, side: T.BackSide }),
    stem: new T.MeshStandardMaterial({ map: stemTexture(), roughness: 0.7 }),
    fibre: new T.MeshStandardMaterial({ color: 0xe2c999, roughness: 0.42, metalness: 0.08, emissive: 0x2a2010, emissiveIntensity: 0.6 }),
    fibreCore: new T.MeshStandardMaterial({ color: 0xbfa476, roughness: 0.9 }),
    leaf: new T.MeshStandardMaterial({ map: leafTexture(false), alphaTest: 0.5, side: T.DoubleSide, roughness: 0.75 }),
    bananaLeaf: new T.MeshStandardMaterial({ map: leafTexture(true), alphaTest: 0.5, side: T.DoubleSide, roughness: 0.6 }),
    bark: new T.MeshStandardMaterial({ map: barkTexture(), roughness: 0.95, side: T.DoubleSide }),
    plinth: new T.MeshStandardMaterial({ color: 0xf2f3ef, roughness: 0.55 }),
    rim: new T.MeshBasicMaterial({ color: 0xfff1d6 }),
    strap: new T.MeshStandardMaterial({ color: 0xa8262c, roughness: 0.6 }),
    shadow: new T.MeshBasicMaterial({ map: glowTexture(), transparent: true, depthWrite: false }),
    glass: new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.07, depthWrite: false }),
    edge: new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 }),
  };
}

/** A pedestal (white block, warm glowing rim, soft contact shadow); its top is at y = h. */
export function makePedestal(M, w = 1.4, h = 1, d = 1.4) {
  const g = new T.Group();
  const block = new T.Mesh(new T.BoxGeometry(w, h, d), M.plinth); block.position.y = h / 2; block.receiveShadow = true;
  const rim = new T.Mesh(new T.BoxGeometry(w + 0.02, 0.03, d + 0.02), M.rim); rim.position.y = h - 0.04;
  const shadow = new T.Mesh(new T.PlaneGeometry(w * 2.2, d * 2.2), M.shadow); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.005;
  g.add(shadow, block, rim);
  return g;
}
/** A glass case standing on a pedestal top (y = 0 at its base). */
export function makeCase(M, w = 1.3, h = 1.7, d = 1.3) {
  const g = new T.Group(), geo = new T.BoxGeometry(w, h, d);
  const glass = new T.Mesh(geo, M.glass), edges = new T.LineSegments(new T.EdgesGeometry(geo), M.edge);
  glass.position.y = edges.position.y = h / 2;
  g.add(glass, edges);
  return g;
}
/** A bundle of bamboo poles tied with a red strap, standing; base at y = 0. */
export function makeBambooBundle(M, n = 9, len = 1.5, r = 0.055) {
  const g = new T.Group(), rnd = rng(31), geo = new T.CylinderGeometry(r, r * 1.04, len, 14);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.3, rr = i === 0 ? 0 : r * 2.1 * (i < 7 ? 1 : 1.9);
    const m = new T.Mesh(geo, M.bamboo); m.position.set(Math.cos(a) * rr, len / 2 + rnd() * 0.06, Math.sin(a) * rr); m.rotation.y = rnd() * 6;
    m.castShadow = true; g.add(m);
  }
  for (const y of [0.3, 0.7]) { const s = new T.Mesh(new T.TorusGeometry(r * 3.4, 0.014, 6, 32), M.strap); s.rotation.x = Math.PI / 2; s.position.y = len * y; g.add(s); }
  return g;
}
/** Windings of fibre around a sphere; returns { group, windings } so the winding can be revealed. */
export function makeYarnBall(M, R = 0.55, count = 90, seed = 41) {
  const g = new T.Group(), rnd = rng(seed), windings = [];
  const core = new T.Mesh(new T.SphereGeometry(R * 0.93, 32, 24), M.fibreCore); g.add(core);
  for (let i = 0; i < count; i++) {
    const axis = new T.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
    const u = new T.Vector3(1, 0, 0).cross(axis); if (u.lengthSq() < 1e-3) u.set(0, 1, 0).cross(axis); u.normalize();
    const v = axis.clone().cross(u), rr = R * (0.97 + rnd() * 0.06), pts = [];
    for (let k = 0; k < 40; k++) { const t = (k / 40) * Math.PI * 2; pts.push(u.clone().multiplyScalar(Math.cos(t) * rr).add(v.clone().multiplyScalar(Math.sin(t) * rr))); }
    const tube = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts, true), 80, 0.011, 4, true), M.fibre);
    tube.castShadow = true; g.add(tube); windings.push(tube);
  }
  return { group: g, core, windings };
}
/** A banana bark sheet: a wrinkled, fibrous plane. */
export function makeBarkSheet(M, w = 1.1, h = 1.5) {
  const geo = new T.PlaneGeometry(w, h, 40, 56), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.sin(y * 3.1) * 0.05 + Math.sin(x * 7 + y * 2) * 0.025 + Math.sin(x * 23) * 0.006 - x * x * 0.12); }
  geo.computeVertexNormals();
  const m = new T.Mesh(geo, M.bark); m.castShadow = true;
  return m;
}
/** A banana leaf, curved along its length. */
export function makeBananaLeaf(M, w = 0.55, h = 1.5, bend = 0.25) {
  const geo = new T.PlaneGeometry(w, h, 8, 24), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -((y / h) ** 2) * bend * 2 + Math.abs(x) * 0.25); }
  geo.computeVertexNormals();
  return new T.Mesh(geo, M.bananaLeaf);
}

// ------------------------------------------------------------------ the journey
const STEM = new T.Vector3(2.6, 1.0, -71), POLE = new T.Vector3(0, 1.0, -66), BALL = new T.Vector3(0.3, 2.65, -78), BARK = new T.Vector3(-2.3, 2.45, -77.5);
const GALLERY_Z = -86;
// camera keys: [progress, position, look-at]
const KEYS = [
  [0.0, [0, 1.7, 6], [0, 2.7, -6]],
  [0.12, [0.25, 1.7, -4], [0, 2.4, -16]],
  [0.3, [0, 1.75, -28], [0, 2.1, -50]],
  [0.42, [0, 1.9, -50], [0, 1.9, -66]],
  [0.52, [-1.4, 2.15, -61], [0, 2.1, -66]],
  [0.62, [2.6, 2.3, -61.4], [2.6, 2.0, -71]],
  [0.72, [5.4, 2.6, -69.4], [1.4, 2.5, -75]],
  [0.82, [3.3, 2.7, -76.6], [-0.8, 2.5, -78]],
  [0.91, [3.0, 2.5, -80], [0.2, 1.8, -86]],
  [1.0, [0.6, 2.45, -79.9], [-0.5, 1.8, GALLERY_Z]],
];

export function createJourney(canvas, { low = false } = {}) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: !low, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, low ? 1 : 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = !low; renderer.shadowMap.type = T.PCFSoftShadowMap;

  const scene = new T.Scene(), camera = new T.PerspectiveCamera(50, 1, 0.1, 220);
  const DARK = new T.Color(0x070d09), LIGHT = new T.Color(0xe8eae4);
  scene.fog = new T.FogExp2(DARK.clone(), 0.06); scene.background = DARK.clone();
  const M = createMaterials(), rnd = rng(3);

  // light
  const hemi = new T.HemisphereLight(0xc9dccf, 0x1d150c, 0.25);
  const sun = new T.DirectionalLight(0xffe1ad, 1.4); sun.position.set(-14, 22, -10); sun.target.position.set(0, 0, -25);
  const sky = new T.SpotLight(0xffffff, 0, 30, 0.6, 0.6, 1); sky.position.set(0.5, 9.5, -72); sky.target.position.set(0.5, 0, -72);
  sky.castShadow = !low; sky.shadow.mapSize.set(1024, 1024); sky.shadow.bias = -0.0006;
  const fill = new T.DirectionalLight(0xfff7ec, 0); fill.position.set(6, 7, -55); fill.target.position.set(0, 1, -76);
  scene.add(hemi, sun, sun.target, sky, sky.target, fill, fill.target);

  // ---- the grove
  const culmGeo = new T.CylinderGeometry(1, 1.05, 1, 12, 1, true); culmGeo.translate(0, 0.5, 0);
  const CULMS = low ? 160 : 280;
  const culms = new T.InstancedMesh(culmGeo, M.bamboo, CULMS), mtx = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), sc = new T.Vector3(), pos = new T.Vector3(), col = new T.Color();
  const tops = [];
  for (let i = 0; i < CULMS; i++) {
    const inRoom = i < 26;
    let x, z;
    if (inRoom) { const a = Math.PI * (0.18 + rnd() * 1.64) + Math.PI / 2, rr = 13 + rnd() * 1.8; x = Math.cos(a) * rr; z = -75 + Math.sin(a) * rr; if (Math.abs(x) < 5.5 && z < -83) x += x < 0 ? -6 : 6; } // none stands behind the cases
    else { const side = rnd() < 0.5 ? -1 : 1; x = side * (1.7 + rnd() ** 1.6 * 9); z = 7 - rnd() * 53; }
    const h = inRoom ? 6 + rnd() * 2.5 : 9 + rnd() * 6, r = 0.05 + rnd() * 0.07;
    e.set((rnd() - 0.5) * 0.08, rnd() * 6, (rnd() - 0.5) * 0.1); q.setFromEuler(e); sc.set(r, h, r); pos.set(x, 0, z);
    culms.setMatrixAt(i, mtx.compose(pos, q, sc));
    culms.setColorAt(i, col.setHSL(0.24 + rnd() * 0.06, 0.35, 0.6 + rnd() * 0.25));
    tops.push([x, h, z]);
  }
  scene.add(culms);
  const LEAVES = low ? 1400 : 2800, leafGeo = new T.PlaneGeometry(0.1, 0.62); leafGeo.translate(0, 0.31, 0);
  const leaves = new T.InstancedMesh(leafGeo, M.leaf, LEAVES);
  for (let i = 0; i < LEAVES; i++) {
    const [x, h, z] = tops[Math.floor(rnd() * tops.length)], y = h * (0.45 + rnd() * 0.55);
    e.set(rnd() * 3, rnd() * 6, rnd() * 3); q.setFromEuler(e); const s = 0.8 + rnd() * 0.6; sc.set(s, s, s);
    pos.set(x + (rnd() - 0.5) * 1.6, y, z + (rnd() - 0.5) * 1.6);
    leaves.setMatrixAt(i, mtx.compose(pos, q, sc));
    leaves.setColorAt(i, col.setHSL(0.25 + rnd() * 0.05, 0.4, 0.55 + rnd() * 0.3));
  }
  scene.add(leaves);
  const EARTH = new T.Color(0x1f2316), STONE = new T.Color(0xe2e4de);
  const ground = new T.Mesh(new T.PlaneGeometry(220, 220), new T.MeshStandardMaterial({ color: EARTH.clone(), roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -40); ground.receiveShadow = true; scene.add(ground);

  // light shafts: open cones whose edges fade with the view angle, so they read as volumes of light
  const rayMat = new T.ShaderMaterial({
    uniforms: { uOpacity: { value: 0.5 }, uTime: { value: 0 }, uColor: { value: new T.Color(0xfff0cc) } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform float uOpacity; uniform float uTime; uniform vec3 uColor; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(abs(dot(vN,vV)),2.5); float l=smoothstep(0.,.35,vUv.y)*smoothstep(1.,.55,vUv.y); float fl=.85+.15*sin(uTime*.7+vUv.x*9.); gl_FragColor=vec4(uColor, f*l*fl*uOpacity*.32); }',
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
  });
  const rays = new T.Group();
  for (let i = 0; i < 5; i++) {
    const ray = new T.Mesh(new T.ConeGeometry(1.2 + rnd() * 1.6, 30, 24, 1, true), rayMat);
    ray.position.set(-6 + rnd() * 5, 12, -6 - i * 8 - rnd() * 3); ray.rotation.set(0.15, 0, -0.55 - rnd() * 0.15);
    rays.add(ray);
  }
  scene.add(rays);
  // dust in the shafts
  const DUST = low ? 900 : 1800, dp = new Float32Array(DUST * 3), ds = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) { dp[i * 3] = (rnd() - 0.5) * 12; dp[i * 3 + 1] = rnd() * 8; dp[i * 3 + 2] = 6 - rnd() * 50; ds[i] = rnd(); }
  const dustGeo = new T.BufferGeometry(); dustGeo.setAttribute('position', new T.BufferAttribute(dp, 3)); dustGeo.setAttribute('seed', new T.BufferAttribute(ds, 1));
  const dustMat = new T.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 }, uScale: { value: 1 } },
    vertexShader: 'attribute float seed; uniform float uTime; uniform float uScale; varying float vA; void main(){ vec3 p=position; p.y=mod(p.y+uTime*(.05+seed*.1),8.); p.x+=sin(uTime*.3+seed*20.)*.25; vec4 mv=modelViewMatrix*vec4(p,1.); gl_PointSize=(2.+seed*3.)*uScale*(6./-mv.z); vA=.35+.65*seed; gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform float uOpacity; varying float vA; void main(){ vec2 c=gl_PointCoord-.5; float d=1.-smoothstep(.1,.5,length(c)); gl_FragColor=vec4(1.,.9,.72,d*vA*uOpacity); }',
    transparent: true, depthWrite: false, blending: T.AdditiveBlending,
  });
  scene.add(new T.Points(dustGeo, dustMat));

  // ---- the showroom: white floor, a round wall open toward the grove, a ceiling with a round skylight
  const room = new T.Group();
  const floor = new T.Mesh(new T.CircleGeometry(16, 64), new T.MeshStandardMaterial({ color: 0xe9ebe5, roughness: 0.32 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.01, -75); floor.receiveShadow = true;
  const wall = new T.Mesh(new T.CylinderGeometry(16, 16, 9, 72, 1, true, Math.PI / 2 + 0.55, Math.PI * 2 - 1.1), new T.MeshStandardMaterial({ color: 0xf1f2ee, roughness: 0.8, side: T.BackSide }));
  wall.position.set(0, 4.5, -75);
  const ceilMat = new T.MeshStandardMaterial({ color: 0xf4f5f1, roughness: 0.9, side: T.DoubleSide, emissive: 0xe9ebe5, emissiveIntensity: 0 });
  const ceiling = new T.Mesh(new T.RingGeometry(4, 16, 64), ceilMat);
  ceiling.rotation.x = Math.PI / 2; ceiling.position.set(0, 9, -75);
  const skylight = new T.Mesh(new T.CircleGeometry(4, 48), new T.MeshBasicMaterial({ color: 0xffffff }));
  skylight.rotation.x = Math.PI / 2; skylight.position.set(0, 9.02, -75);
  room.add(floor, wall, ceiling, skylight);
  scene.add(room);

  // ---- bamboo: a pole on a pedestal that splits into two halves
  const pole = new T.Group(); pole.position.copy(POLE).add(new T.Vector3(0, 1.25, 0));
  const ped1 = makePedestal(M, 1.3, 1, 1.3); ped1.position.set(POLE.x, 0, POLE.z);
  const halves = [0, Math.PI].map((t0) => {
    const geo = new T.CylinderGeometry(0.17, 0.17, 2.3, 28, 1, true, t0, Math.PI);
    const h = new T.Group(); h.add(new T.Mesh(geo, M.bamboo), new T.Mesh(geo, M.bambooInner));
    h.children.forEach((m) => { m.castShadow = true; });
    pole.add(h); return h;
  });
  scene.add(ped1, pole);

  // ---- banana: a stem on a pedestal whose fibres peel, twist through the air and wind into a yarn ball
  const ped2 = makePedestal(M, 1.2, 0.9, 1.2); ped2.position.set(STEM.x, 0, STEM.z);
  const stem = new T.Mesh(new T.CylinderGeometry(0.3, 0.36, 2.2, 36), M.stem); stem.position.set(STEM.x, 0.9 + 1.1, STEM.z); stem.castShadow = true;
  scene.add(ped2, stem);
  const STRANDS = low ? 110 : 220, strands = [], axis = BALL.clone().sub(new T.Vector3(STEM.x, 2.4, STEM.z)), axisN = axis.clone().normalize();
  const side1 = axisN.clone().cross(new T.Vector3(0, 1, 0)).normalize(), side2 = axisN.clone().cross(side1).normalize();
  for (let i = 0; i < STRANDS; i++) {
    const a = rnd() * Math.PI * 2, y = 1.0 + rnd() * 1.9, pts = [];
    const start = new T.Vector3(STEM.x + Math.cos(a) * 0.37, y, STEM.z + Math.sin(a) * 0.37);
    pts.push(start, start.clone().add(new T.Vector3(Math.cos(a) * 0.14, 0.3 + rnd() * 0.3, Math.sin(a) * 0.14)));
    const ph = i * 2.39996, from = new T.Vector3(STEM.x, 2.4, STEM.z);
    for (let k = 1; k <= 9; k++) {
      const f = k / 10, c = from.clone().addScaledVector(axis, f), r = 0.2 * (1 - f) + 0.035 + rnd() * 0.03, t = ph + f * 9;
      pts.push(c.addScaledVector(side1, Math.cos(t) * r).addScaledVector(side2, Math.sin(t) * r));
    }
    pts.push(BALL.clone().add(new T.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(0.5)));
    const tube = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 120, 0.0042, 3), M.fibre);
    tube.castShadow = !low; tube.userData.delay = rnd() * 0.35; tube.geometry.setDrawRange(0, 0);
    scene.add(tube); strands.push(tube);
  }
  const yarn = makeYarnBall(M, 0.55, low ? 60 : 100, 41); yarn.group.position.copy(BALL); scene.add(yarn.group);
  yarn.windings.forEach((w) => w.geometry.setDrawRange(0, 0)); yarn.core.scale.setScalar(0.001);
  const bark = makeBarkSheet(M); bark.position.copy(BARK); bark.rotation.set(-0.15, 0.6, 0.12); scene.add(bark);
  const leafA = makeBananaLeaf(M, 0.55, 1.6, 0.3); leafA.position.copy(BARK).add(new T.Vector3(-0.75, -0.2, 0.4)); leafA.rotation.set(0.3, 0.9, 0.5);
  const leafB = makeBananaLeaf(M, 0.5, 1.4, 0.25); leafB.position.copy(BARK).add(new T.Vector3(0.55, 0.45, -0.5)); leafB.rotation.set(-0.4, 0.4, -0.6);
  scene.add(leafA, leafB);
  // light threads sweeping around the yarn and the bark (gold and blue, as in the reference)
  const threadMat = (c) => new T.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: new T.Color(c) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float uTime; uniform float uOpacity; uniform vec3 uColor; varying vec2 vUv; void main(){ float d=smoothstep(.0,.25,fract(vUv.x*3.-uTime*.12))*smoothstep(1.,.6,fract(vUv.x*3.-uTime*.12)); gl_FragColor=vec4(uColor,d*uOpacity); }',
    transparent: true, depthWrite: false, blending: T.AdditiveBlending,
  });
  const threads = [0xffd9a0, 0x8cc0ff].map((c, j) => {
    const pts = [];
    for (let k = 0; k <= 24; k++) { const t = (k / 24) * Math.PI * 2; pts.push(new T.Vector3(-0.9 + Math.cos(t) * 2.2, 2.5 + Math.sin(t * 2 + j) * 0.4, -77.8 + Math.sin(t) * 1.2 * (j ? -1 : 1))); }
    const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts, true), 300, 0.012, 4, true), threadMat(c));
    scene.add(m); return m;
  });

  // ---- the gallery: three lit cases
  const gallery = new T.Group(); gallery.position.z = GALLERY_Z;
  const exhibits = [makeBambooBundle(M), (() => { const y = makeYarnBall(M, 0.38, 70, 77); return y.group; })(), (() => {
    const g = new T.Group(), b = makeBarkSheet(M, 0.7, 1.0); b.rotation.set(-0.2, 0.5, 0.15); b.position.y = 0.7;
    const l = makeBananaLeaf(M, 0.4, 1.0, 0.2); l.position.set(0.25, 0.55, 0.15); l.rotation.set(0.3, -0.6, 0.6);
    g.add(b, l); return g;
  })()];
  exhibits.forEach((ex, i) => {
    const x = (i - 1) * 3.2, ped = makePedestal(M, 1.5, 1.05, 1.5), cs = makeCase(M, 1.35, 1.8, 1.35);
    ped.position.x = x; cs.position.set(x, 1.05, 0);
    ex.position.set(x, 1.1 + (i === 1 ? 0.5 : 0), 0);
    gallery.add(ped, cs, ex);
  });
  scene.add(gallery);

  // ---- camera path
  const P = KEYS.map((k) => new T.Vector3(...k[1])), L = KEYS.map((k) => new T.Vector3(...k[2]));
  const posCurve = new T.CatmullRomCurve3(P, false, 'centripetal'), lookCurve = new T.CatmullRomCurve3(L, false, 'centripetal');
  const curveT = (p) => { let i = 0; while (i < KEYS.length - 2 && p > KEYS[i + 1][0]) i++; const u = ramp(p, KEYS[i][0], KEYS[i + 1][0]); return (i + u) / (KEYS.length - 1); };
  const look = new T.Vector3(), fwd = new T.Vector3(), fogC = new T.Color();
  let w = 1, h = 1, portrait = false;

  const api = {
    ready: Promise.resolve(true),
    setSize(width, height) { if (!width || !height) return; w = width; h = height; renderer.setSize(w, h, false); camera.aspect = w / h; portrait = w / h < 0.8; camera.fov = portrait ? 62 : 50; camera.updateProjectionMatrix(); dustMat.uniforms.uScale.value = h / 900; },
    render({ p = 0, pointer = [0, 0], now = performance.now() }) {
      const time = now / 1000, ct = curveT(clamp(p));
      posCurve.getPoint(ct, camera.position); lookCurve.getPoint(ct, look);
      if (portrait) camera.position.addScaledVector(fwd.subVectors(look, camera.position).normalize(), -2.2 * smooth(p, 0.86, 1));
      look.x += pointer[0] * 0.6; look.y -= pointer[1] * 0.35;
      camera.position.y += Math.sin(time * 0.6) * 0.015;
      camera.lookAt(look);
      // dark grove -> bright showroom
      const lit = smooth(p, 0.26, 0.44);
      fogC.copy(DARK).lerp(LIGHT, lit); scene.fog.color.copy(fogC); scene.background.copy(fogC);
      scene.fog.density = 0.06 + (0.012 - 0.06) * lit;
      hemi.intensity = 0.25 + 1.15 * lit; sun.intensity = 1.4 * (1 - lit * 0.6);
      sky.intensity = 60 * lit; fill.intensity = 1.5 * lit; renderer.toneMappingExposure = 0.9 + 0.15 * lit;
      ground.material.color.copy(EARTH).lerp(STONE, lit); ceilMat.emissiveIntensity = 0.75 * lit;
      rayMat.uniforms.uOpacity.value = (1 - smooth(p, 0.3, 0.44)) * (0.6 + 0.4 * smooth(p, 0, 0.1)); rayMat.uniforms.uTime.value = time;
      dustMat.uniforms.uTime.value = time; dustMat.uniforms.uOpacity.value = 1 - smooth(p, 0.36, 0.48);
      // bamboo splits open
      const s = smooth(p, 0.45, 0.58);
      halves[0].position.x = -s * 0.42; halves[0].rotation.z = s * 0.35; halves[1].position.x = s * 0.42; halves[1].rotation.z = -s * 0.35;
      pole.rotation.y = time * 0.15 + s * 1.2; pole.position.y = POLE.y + 1.25 + Math.sin(time * 0.8) * 0.04;
      // banana fibres peel, twist and wind into the ball
      const f = ramp(p, 0.58, 0.8);
      for (const t of strands) { const k = clamp((f - t.userData.delay) / 0.65); t.geometry.setDrawRange(0, Math.floor(t.geometry.index.count * k / 3) * 3); }
      const wind = ramp(p, 0.7, 0.86);
      yarn.windings.forEach((wd, i) => { const k = clamp(wind * yarn.windings.length - i); wd.geometry.setDrawRange(0, Math.floor(wd.geometry.index.count * k / 3) * 3); });
      yarn.core.scale.setScalar(0.001 + 0.999 * smooth(wind, 0, 0.6));
      yarn.group.rotation.y = time * 0.25; yarn.group.position.y = BALL.y + Math.sin(time * 0.9) * 0.05;
      const bk = smooth(p, 0.74, 0.84);
      for (const m of [bark, leafA, leafB]) { m.visible = bk > 0.01; m.scale.setScalar(0.2 + 0.8 * bk); }
      bark.rotation.y = 0.6 + Math.sin(time * 0.3) * 0.25;
      for (const th of threads) { th.material.uniforms.uTime.value = time; th.material.uniforms.uOpacity.value = smooth(p, 0.76, 0.86) * (1 - smooth(p, 0.94, 1)); }
      exhibits[1].rotation.y = time * 0.3;
      renderer.render(scene, camera);
    },
  };
  return api;
}
