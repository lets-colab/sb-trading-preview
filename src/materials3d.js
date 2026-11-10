// SB Trading · 3D material studies for the Explore stage (three.js r187, MIT). Built into assets/materials3d.js.
// Three procedural objects (no downloaded models): bamboo culms, a wound banana fibre spool with loose strands,
// and curled banana bark with a leaf. They are visual studies of the material families, labelled on the page as
// "not a product photo". A field of fibre motes gives the stage depth. The page calls render() only while the
// visitor scrolls or moves the pointer, or while a family transition is still settling.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Points, BufferGeometry, Float32BufferAttribute,
  CylinderGeometry, TorusGeometry, RingGeometry, CircleGeometry, PlaneGeometry, TubeGeometry, CatmullRomCurve3,
  MeshStandardMaterial, MeshPhysicalMaterial, ShaderMaterial, CanvasTexture,
  HemisphereLight, DirectionalLight, PMREMGenerator, ACESFilmicToneMapping, SRGBColorSpace, RepeatWrapping,
  AdditiveBlending, DoubleSide, BackSide, Vector3, MathUtils,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const rand = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

function canvasTexture(w, h, paint, repeat = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace; t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 4;
  return t;
}
const streaks = (g, w, h, n, colors, alpha, vertical = true) => {
  for (let i = 0; i < n; i++) {
    g.globalAlpha = alpha * (0.4 + rand() * 0.6);
    g.fillStyle = colors[Math.floor(rand() * colors.length)];
    const x = rand() * (vertical ? w : h), s = 0.5 + rand() * 2.5;
    if (vertical) g.fillRect(x, 0, s, h); else g.fillRect(0, x, w, s);
  }
  g.globalAlpha = 1;
};

// ------------------------------------------------------------------ bamboo
function bamboo() {
  const skin = canvasTexture(512, 1024, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, 0);
    grd.addColorStop(0, '#3f5a22'); grd.addColorStop(0.35, '#5f7f33'); grd.addColorStop(0.55, '#6d8c3c'); grd.addColorStop(1, '#3c5620');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { // sun-bleached and yellowed patches
      g.globalAlpha = 0.1 + rand() * 0.14; g.fillStyle = rand() > 0.5 ? '#b4ad62' : '#8d9a48';
      g.beginPath(); g.ellipse(rand() * w, rand() * h, 10 + rand() * 40, 60 + rand() * 220, 0, 0, Math.PI * 2); g.fill();
    }
    streaks(g, w, h, 520, ['#7f9d4c', '#2f461a', '#a2b066', '#4b6a2a'], 0.28);
    for (let i = 0; i < 40; i++) { g.globalAlpha = 0.35; g.fillStyle = '#2a3b16'; g.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 2 + rand() * 6); } // pores and marks
    g.globalAlpha = 1;
  }, [1, 1]);
  const inner = canvasTexture(256, 512, (g, w, h) => { g.fillStyle = '#d7bd88'; g.fillRect(0, 0, w, h); streaks(g, w, h, 220, ['#b9975e', '#ecd8ab', '#c7a56c'], 0.35); });
  const skinMat = new MeshPhysicalMaterial({ map: skin, roughness: 0.42, clearcoat: 0.8, clearcoatRoughness: 0.18, sheen: 0.2, sheenColor: '#c8d68a' });
  const innerMat = new MeshStandardMaterial({ map: inner, roughness: 0.8, side: BackSide });
  const capMat = new MeshStandardMaterial({ color: '#d5b57d', roughness: 0.75, side: DoubleSide });
  const nodeMat = new MeshPhysicalMaterial({ color: '#566c2c', roughness: 0.5, clearcoat: 0.6 });
  const sheathMat = new MeshStandardMaterial({ color: '#b6a46a', roughness: 0.6 });
  const group = new Group();
  const culm = (len, r, x, y, z, rz, ry) => {
    const c = new Group();
    c.add(new Mesh(new CylinderGeometry(r, r, len, 48, 1, true), skinMat));
    c.add(new Mesh(new CylinderGeometry(r * 0.84, r * 0.84, len, 48, 1, true), innerMat));
    for (const s of [1, -1]) { const cap = new Mesh(new RingGeometry(r * 0.84, r, 48), capMat); cap.rotation.x = Math.PI / 2; cap.position.y = (s * len) / 2; c.add(cap); }
    for (let k = 1; k < Math.round(len / 0.75); k++) {
      const y = -len / 2 + k * (len / Math.round(len / 0.75));
      const node = new Mesh(new TorusGeometry(r * 1.0, r * 0.085, 12, 64), nodeMat);
      node.rotation.x = Math.PI / 2; node.position.y = y; c.add(node);
      const line = new Mesh(new TorusGeometry(r * 1.03, r * 0.02, 6, 64), sheathMat); // the pale scar ring above each node
      line.rotation.x = Math.PI / 2; line.position.y = y + r * 0.12; c.add(line);
    }
    c.position.set(x, y, z); c.rotation.set(0, ry, rz);
    group.add(c);
  };
  culm(2.6, 0.24, -0.35, 0.55, 0.1, 1.28, 0.25);
  culm(2.3, 0.21, 0.15, 0.0, -0.25, 1.36, -0.2);
  culm(2.9, 0.26, 0.0, -0.6, 0.15, 1.22, 0.1);
  return { group, tick() {} };
}

// ------------------------------------------------------------------ banana fibre spool with loose strands
function spool() {
  const wound = canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#9c7444'; g.fillRect(0, 0, w, h);
    g.lineWidth = 6;
    for (let pass = 0; pass < 2; pass++) {               // cross-wound: two diagonal layers of yarn
      for (let i = -h; i < w + h; i += 12) {
        g.strokeStyle = rand() > 0.5 ? '#e2c792' : '#cfae78'; g.globalAlpha = 0.85;
        g.beginPath(); g.moveTo(i, 0); g.lineTo(i + (pass ? -h : h) * 0.6, h); g.stroke();
        g.strokeStyle = '#8f6b3e'; g.globalAlpha = 0.5; g.lineWidth = 1;
        g.beginPath(); g.moveTo(i + 6.5, 0); g.lineTo(i + 6.5 + (pass ? -h : h) * 0.6, h); g.stroke(); g.lineWidth = 6;
      }
    }
    for (let i = 0; i < 260; i++) { g.globalAlpha = 0.5; g.strokeStyle = '#f1dfb8'; g.lineWidth = 0.8; const x = rand() * w, y = rand() * h; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 8, y - 6, x + 14 + rand() * 10, y + rand() * 6); g.stroke(); } // fuzz
    g.globalAlpha = 1;
  }, [3, 2]);
  const top = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#c9a874'; g.fillRect(0, 0, w, h);
    for (let r = 40; r < 128; r += 1.5) { g.strokeStyle = r % 3 < 1.5 ? '#b38c55' : '#e6cfa2'; g.globalAlpha = 0.6; g.beginPath(); g.arc(128, 128, r, 0, Math.PI * 2); g.stroke(); }
    g.globalAlpha = 1;
  });
  const group = new Group();
  const body = new Mesh(new CylinderGeometry(0.66, 0.7, 1.5, 96, 1, true), new MeshStandardMaterial({ map: wound, roughness: 0.92 }));
  group.add(body);
  const lid = new Mesh(new RingGeometry(0.2, 0.66, 96), new MeshStandardMaterial({ map: top, roughness: 0.85, side: DoubleSide }));
  lid.rotation.x = -Math.PI / 2; lid.position.y = 0.75; group.add(lid);
  const core = new Mesh(new CylinderGeometry(0.2, 0.2, 1.62, 48, 1, true), new MeshStandardMaterial({ color: '#8a6438', roughness: 0.6, side: DoubleSide }));
  group.add(core);
  const bottom = new Mesh(new CircleGeometry(0.7, 64), new MeshStandardMaterial({ color: '#6e5232', roughness: 0.9 }));
  bottom.rotation.x = Math.PI / 2; bottom.position.y = -0.75; group.add(bottom);
  // loose strands leaving the spool and sweeping out to the right: thin lit tubes merged into one mesh
  const tubes = [];
  for (let k = 0; k < 64; k++) {
    const y0 = -0.62 + rand() * 1.24, ph = rand() * Math.PI * 2, len = 1.6 + rand() * 1.8, amp = 0.25 + rand() * 0.55, lift = (rand() - 0.35) * 1.6;
    const pts = [];
    for (let j = 0; j <= 10; j++) {
      const u = j / 10, ang = ph + u * 1.4;
      pts.push(new Vector3(
        Math.cos(ang) * 0.69 * (1 - u) + u * len,
        y0 + Math.sin(u * 3.2 + ph) * amp * u + u * u * lift,
        Math.sin(ang) * 0.69 * (1 - u) + Math.cos(u * 2.6 + ph) * u * 0.9));
    }
    tubes.push(new TubeGeometry(new CatmullRomCurve3(pts), 48, 0.004 + rand() * 0.006, 5, false));
  }
  const strands = new Mesh(mergeGeometries(tubes), new MeshStandardMaterial({ color: '#e9d3a3', roughness: 0.7 }));
  group.add(strands);
  const tick = () => {};
  group.rotation.z = -0.12;
  return { group, tick };
}

// ------------------------------------------------------------------ banana bark curls and a leaf
function bark() {
  const barkTex = canvasTexture(128, 512, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, 0);
    grd.addColorStop(0, '#9c7342'); grd.addColorStop(0.5, '#d2a96c'); grd.addColorStop(1, '#9a7040');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    streaks(g, w, h, 120, ['#e8c995', '#7d5a30', '#b88d55'], 0.35);
  });
  const leafTex = canvasTexture(128, 512, (g, w, h) => {
    g.fillStyle = '#3f7d2c'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 5) { g.globalAlpha = 0.25; g.fillStyle = '#6aa548'; g.fillRect(0, y, w, 1.2); }
    g.globalAlpha = 0.9; g.fillStyle = '#a7c977'; g.fillRect(w / 2 - 2, 0, 4, h); g.globalAlpha = 1;
  });
  const strip = (w, len, curl, twist, bend, map, x, y, z, rot) => {
    const geo = new PlaneGeometry(w, len, 8, 96);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let px = p.getX(i), py = p.getY(i), pz = 0;
      pz += (px * px) * curl;                                   // cupped across the width
      const th = py / bend;                                       // bent along the length
      const ny = Math.sin(th) * bend, nz = pz + (1 - Math.cos(th)) * bend;
      const a = py * twist, c = Math.cos(a), s = Math.sin(a);     // gentle twist
      p.setXYZ(i, px * c - nz * s, ny, px * s + nz * c);
    }
    geo.computeVertexNormals();
    const m = new Mesh(geo, new MeshStandardMaterial({ map, roughness: 0.75, side: DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(...rot);
    return m;
  };
  const group = new Group();
  group.add(strip(0.5, 2.8, 1.6, 0.35, 1.6, barkTex, -0.4, 0.3, 0, [0.2, 0.3, 1.1]));
  group.add(strip(0.44, 2.4, 1.9, -0.5, 1.3, barkTex, 0.2, -0.2, 0.3, [-0.3, -0.2, 1.3]));
  group.add(strip(0.48, 2.6, 1.4, 0.6, 1.9, barkTex, 0.1, -0.75, -0.2, [0.1, 0.5, 1.4]));
  group.add(strip(0.7, 2.7, 0.6, 0.2, 2.6, leafTex, 0.55, 0.55, -0.4, [0.4, -0.4, 0.9]));
  return { group, tick() {} };
}

// ------------------------------------------------------------------ fibre motes (depth field)
function motes(count) {
  const pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) { pos[i * 3] = (rand() - 0.5) * 16; pos[i * 3 + 1] = (rand() - 0.5) * 10; pos[i * 3 + 2] = -9 + rand() * 9; seed[i] = rand(); }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('seed', new Float32BufferAttribute(seed, 1));
  const mat = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uLift: { value: 0 }, uPx: { value: 1 } },
    vertexShader: `attribute float seed; uniform float uTime, uLift, uPx; varying float vA; varying float vS;
      void main(){ vec3 p = position; p.y = mod(p.y + uLift * (0.6 + seed) + 5.0, 10.0) - 5.0;
        p.x += sin(uTime * 0.3 + seed * 30.0) * 0.15; vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv; gl_PointSize = (3.0 + seed * 9.0) * uPx * (9.0 / -mv.z);
        vA = smoothstep(-20.0, -6.0, mv.z) * (0.35 + seed * 0.6); vS = seed; }`,
    fragmentShader: `varying float vA; varying float vS; void main(){ float d = length(gl_PointCoord - 0.5);
      vec3 c = mix(vec3(0.84, 0.75, 0.58), vec3(0.62, 0.78, 0.95), step(0.72, vS));
      gl_FragColor = vec4(c, vA * smoothstep(0.5, 0.0, d)); }`,
  });
  return new Points(geo, mat);
}

export function createMaterials(canvas, { low = false } = {}) {
  const renderer = new WebGLRenderer({ canvas, antialias: !low, alpha: true, powerPreference: 'high-performance' });
  renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  const camera = new PerspectiveCamera(32, 1, 0.1, 60);
  camera.position.set(0, 0, 9);
  scene.add(new HemisphereLight('#9cc1ee', '#22180c', 0.7));
  const key = new DirectionalLight('#ffe3bd', 2.6); key.position.set(-4, 5, 6); scene.add(key);
  const rim = new DirectionalLight('#6aa6ff', 2.2); rim.position.set(5, 1, -4); scene.add(rim);

  const field = motes(low ? 260 : 700);
  scene.add(field);
  const studies = [bamboo(), spool(), bark()].map((s) => {
    const holder = new Group(); holder.add(s.group); holder.visible = false; scene.add(holder);
    return { ...s, holder, vis: 0 };
  });
  const anchor = new Vector3();
  let width = 1, height = 1, phone = false, lastTime = 0;

  function setSize(w, h) {
    width = w; height = h; phone = w < 820;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, low ? 1 : 1.5));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    field.material.uniforms.uPx.value = renderer.getPixelRatio();
  }
  // Place the study where the page asks (fractions of the viewport), at the plane z = 0.
  function placeAt(fx, fy) {
    const vh = 2 * Math.tan(MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    anchor.set((fx - 0.5) * vh * camera.aspect, -(fy - 0.5) * vh, 0);
  }

  /**
   * Draws one frame. state: { fam: 0..2, t: 0..1 within the family, p: 0..1 across the stage,
   * pointer: [-0.5..0.5, -0.5..0.5], at: [fx, fy] viewport fraction for the study, now: ms }.
   * Returns true while a family transition is still settling. When settle=true, snap to the final state and draw once.
   */
  function render({ fam, t, p, pointer, at, now, settle = false }) {
    const time = now / 1000, dt = Math.min(0.1, Math.max(0.001, time - (lastTime || time))); lastTime = time;
    placeAt(at[0], at[1]);
    const scale = phone ? 0.62 : Math.min(1.15, 0.8 + width / 4800);
    let settling = false;
    studies.forEach((s, i) => {
      const target = i === fam ? 1 : 0;
      if (settle) s.vis = target;
      else {
        s.vis += (target - s.vis) * Math.min(1, dt * 4.5);
        if (Math.abs(target - s.vis) < 0.002) s.vis = target; else settling = true;
      }
      s.holder.visible = s.vis > 0.003;
      if (!s.holder.visible) return;
      const e = s.vis * s.vis * (3 - 2 * s.vis);
      s.holder.position.set(anchor.x, anchor.y - (1 - e) * 1.4, anchor.z - (1 - e) * 2);
      s.holder.scale.setScalar(scale * (0.7 + 0.3 * e));
      s.holder.rotation.set(0.22 + pointer[1] * 0.35, -0.6 + (i === fam ? t : 1) * 1.3 + pointer[0] * 0.6 + (1 - e) * 1.4, 0);
      s.group.traverse((o) => { if (o.material) { o.material.transparent = e < 1; o.material.opacity = e; } });
      s.tick(time);
    });
    field.material.uniforms.uTime.value = time;
    field.material.uniforms.uLift.value = p * 3;
    const cameraX = pointer[0] * 0.5, cameraY = -pointer[1] * 0.3;
    if (settle) { camera.position.x = cameraX; camera.position.y = cameraY; }
    else {
      camera.position.x += (cameraX - camera.position.x) * 0.08;
      camera.position.y += (cameraY - camera.position.y) * 0.08;
    }
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    return settling;
  }
  return { setSize, render, dispose() { renderer.dispose(); pmrem.dispose(); } };
}
