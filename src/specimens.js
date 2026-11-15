// SB Trading · 3D specimens for Explore (three.js, MIT). Bundled by build.mjs to assets/vendor/specimens.js.
// Each family is a cut-out of SB Trading's own photograph (tools/build-cutouts.py) made into geometry from that
// photograph's depth map (assets/img/depth/), standing in a glass case on a lit pedestal, after the owner's showroom
// reference. Nothing is modelled: the surface, colour and silhouette are the photograph's; the depth map gives it relief,
// so it reads as an object while it turns about a quarter-turn either way (a single photograph has no back).
//
// API (site.js), the same as the depth studies it replaces:
//   createSpecimens(canvas, { low }) -> { mount(el), setSize(w, h), render(state) -> settling, whenReady(fam), dirty }
//   render({ fam, t, pointer, now, settle }) draws one frame and returns true while it is still easing; settle snaps.
import {
  WebGLRenderer, Scene, PerspectiveCamera, HemisphereLight, DirectionalLight, Mesh, Group, BoxGeometry, PlaneGeometry,
  EdgesGeometry, LineSegments, LineBasicMaterial, MeshStandardMaterial, MeshBasicMaterial, MeshDepthMaterial,
  TextureLoader, SRGBColorSpace, ACESFilmicToneMapping, PCFSoftShadowMap, DoubleSide, RGBADepthPacking,
  BufferGeometry, BufferAttribute, Points, PointsMaterial, AdditiveBlending, MathUtils,
} from 'three';

// Paths from the site root, each with its version tag (tools/stamp.mjs), so a new photograph always has a new address.
const FAMILIES = [
  { cut: 'assets/img/cutout/bamboo.webp?v=240197dc', depth: 'assets/img/depth/bamboo-sections-depth.webp?v=3b0e5e6b' },
  { cut: 'assets/img/cutout/fibre.webp?v=52e3b162', depth: 'assets/img/depth/banana-fibre-loose-depth.webp?v=b6b48b3a' },
  { cut: 'assets/img/cutout/leaves.webp?v=c82e6945', depth: 'assets/img/depth/banana-leaves-depth.webp?v=36c4dd84' },
];
const CASE = { w: 2.5, h: 3.0, d: 1.6 }, PED = { w: 2.7, h: 1.1, d: 1.8 }, RELIEF = 0.75;
const FIT = { w: 3.1, h: CASE.h + PED.h + 0.25, cy: (CASE.h - PED.h) / 2 - 0.05 };

function loadImage(src) {
  return new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });
}
function pixels(img, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
  return g.getImageData(0, 0, w, h).data;
}

// A plane whose vertices take their depth from the depth map, where the cut-out keeps the product; background vertices
// sit at the product's mean depth so the silhouette does not stretch into walls. Normals follow the relief.
function specimenGeometry(cutImg, depthImg, low) {
  const aspect = cutImg.width / cutImg.height, H = CASE.h * 0.84, W = Math.min(H * aspect, CASE.w * 0.92);
  const h = W / aspect, sx = low ? 90 : 170, sy = Math.round(sx / aspect);
  const geo = new PlaneGeometry(W, h, sx, sy);
  const d = pixels(depthImg, sx + 1, sy + 1), a = pixels(cutImg, sx + 1, sy + 1);
  let sum = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) if (a[i + 3] > 128) { sum += d[i]; n++; }
  const mean = n ? sum / n : 128, pos = geo.attributes.position;
  for (let y = 0; y <= sy; y++) for (let x = 0; x <= sx; x++) {
    const v = y * (sx + 1) + x, p = v * 4, keep = a[p + 3] / 255;
    pos.setZ(v, ((d[p] - mean) / 255) * RELIEF * keep);
  }
  geo.computeVertexNormals();
  return { geo, h };
}

export function createSpecimens(canvas, { low = false } = {}) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: !low, powerPreference: low ? 'low-power' : 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, low ? 1 : 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = !low; renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene(), camera = new PerspectiveCamera(26, 1, 0.1, 60);
  scene.add(new HemisphereLight(0xffffff, 0xd9d3c6, 1.15));
  const key = new DirectionalLight(0xfff0d8, 2.4); key.position.set(-3.2, 5, 4.5);
  key.castShadow = !low; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0008;
  Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 3, bottom: -3, near: 1, far: 16 });
  const rim = new DirectionalLight(0xdbeaf6, 1.6); rim.position.set(3.5, 2.5, -4);
  scene.add(key, rim);

  // pedestal with a warm glowing rim, and the glass case on it
  const base0 = -CASE.h / 2;
  const ped = new Mesh(new BoxGeometry(PED.w, PED.h, PED.d), new MeshStandardMaterial({ color: 0xf2f3ef, roughness: 0.6 }));
  ped.position.y = base0 - PED.h / 2; ped.receiveShadow = true;
  const glow = new Mesh(new BoxGeometry(PED.w + 0.02, 0.035, PED.d + 0.02), new MeshBasicMaterial({ color: 0xfff1d6 }));
  glow.position.y = base0 - 0.03;
  const caseGeo = new BoxGeometry(CASE.w, CASE.h, CASE.d);
  const glass = new Mesh(caseGeo, new MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.07, depthWrite: false }));
  const edges = new LineSegments(new EdgesGeometry(caseGeo), new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }));
  scene.add(ped, glow, glass, edges);

  // gold motes drifting inside the case
  const N = low ? 40 : 90, mp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { mp[i * 3] = (Math.random() - 0.5) * CASE.w * 0.9; mp[i * 3 + 1] = (Math.random() - 0.5) * CASE.h * 0.9; mp[i * 3 + 2] = (Math.random() - 0.5) * CASE.d * 0.8; }
  const motesGeo = new BufferGeometry(); motesGeo.setAttribute('position', new BufferAttribute(mp, 3));
  const motes = new Points(motesGeo, new PointsMaterial({ color: 0xe7d6b6, size: 0.028, transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false }));
  scene.add(motes);

  const specimens = FAMILIES.map(() => ({ group: new Group(), scale: 0, ready: null }));
  const loader = new TextureLoader();
  const api = { dirty: true };
  for (const [i, f] of FAMILIES.entries()) {
    const s = specimens[i];
    s.group.visible = false; scene.add(s.group);
    s.ready = Promise.all([loadImage(f.cut), loadImage(f.depth), loader.loadAsync(f.cut)]).then(([cut, depth, tex]) => {
      tex.colorSpace = SRGBColorSpace; tex.anisotropy = 4;
      const { geo, h } = specimenGeometry(cut, depth, low);
      const mesh = new Mesh(geo, new MeshStandardMaterial({ map: tex, alphaTest: 0.42, roughness: 0.82, metalness: 0, side: DoubleSide }));
      mesh.customDepthMaterial = new MeshDepthMaterial({ depthPacking: RGBADepthPacking, map: tex, alphaTest: 0.42 });
      mesh.castShadow = !low;
      mesh.position.y = base0 + h / 2 + 0.06;
      s.group.add(mesh);
      api.dirty = true;
      return true;
    }).catch(() => false);
  }

  let mounted = null, active = -1, last = 0;
  const cur = { ry: 0, rx: 0 };
  api.mount = (el) => { if (el && canvas.parentElement !== el) { el.appendChild(canvas); mounted = el; api.dirty = true; } };
  api.setSize = (w, h) => {
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const t = Math.tan(MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max(FIT.h / 2 / t, FIT.w / 2 / (t * camera.aspect)) * 1.04;
    camera.position.set(0, FIT.cy + 0.35, dist); camera.lookAt(0, FIT.cy, 0);
    camera.updateProjectionMatrix(); api.dirty = true;
  };
  api.whenReady = (fam) => specimens[fam].ready;
  api.render = ({ fam, t = 0.5, pointer = [0, 0], now = performance.now(), settle = false }) => {
    if (fam !== active) { active = fam; }
    let moving = false;
    // Easing is measured in time, not frames, so a slow or software renderer (1 frame a second on CI) still comes to rest
    // within a second or two instead of drawing for a minute. Gaps are capped at half a second (a stalled tab does not jump).
    const dt = last ? Math.min(0.5, Math.max(0, (now - last) / 1000)) : 1 / 60;
    last = now;
    const ease = (rate) => 1 - Math.exp(-rate * dt); // the per-second rates match the old 60 fps per-frame steps
    const ry = (t - 0.5) * 0.9 + pointer[0] * 0.55, rx = pointer[1] * 0.16;
    const k = ease(settle ? 7.7 : 5);
    cur.ry += (ry - cur.ry) * k; cur.rx += (rx - cur.rx) * k;
    if (Math.abs(ry - cur.ry) > 1e-3 || Math.abs(rx - cur.rx) > 1e-3) moving = true;
    for (const [i, s] of specimens.entries()) {
      const target = i === active ? 1 : 0;
      s.scale += (target - s.scale) * ease(9);
      if (Math.abs(target - s.scale) < 1e-3) s.scale = target; else moving = true;
      s.group.visible = s.scale > 0.002;
      s.group.scale.setScalar(0.6 + 0.4 * s.scale);
      s.group.position.y = (1 - s.scale) * -0.8;
      s.group.rotation.set(cur.rx, cur.ry, 0);
      s.group.traverse((o) => { if (o.material && 'opacity' in o.material) { o.material.transparent = s.scale < 1; o.material.opacity = s.scale; } });
    }
    const ph = now / 1000;
    const p = motesGeo.attributes.position;
    for (let i = 0; i < N; i++) { let y = p.getY(i) + 0.15 * dt; if (y > CASE.h * 0.45) y = -CASE.h * 0.45; p.setY(i, y); }
    p.needsUpdate = true;
    motes.material.opacity = 0.55 + 0.25 * Math.sin(ph * 0.8);
    renderer.render(scene, camera);
    api.dirty = false;
    return moving;
  };
  return api;
}
