// SB Trading — the grove: a real-time bamboo grove the camera flies through on scroll, with golden fibre strands
// that weave past and braid into one thread. Everything is procedural (no models, no textures).
import {
  WebGLRenderer, Scene, PerspectiveCamera, Color, InstancedMesh, CylinderGeometry, ShaderMaterial, Object3D,
  CatmullRomCurve3, Vector3, TubeGeometry, Mesh, BufferGeometry, Float32BufferAttribute, Points, AdditiveBlending,
  PlaneGeometry, DoubleSide, MathUtils, InstancedBufferAttribute,
} from 'three';

const INK = new Color('#102a43'), FIBRE = new Color('#d7be93');
const END = -118;
const ease = (x) => x * x * (3 - 2 * x);

function rand(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

const fog = `uniform vec3 uFog; uniform float uFogD; varying float vDepth;
  vec3 applyFog(vec3 c){ float f = 1. - exp(-pow(uFogD * vDepth, 2.)); return mix(c, uFog, clamp(f, 0., 1.)); }`;

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{reduced?: boolean, low?: boolean}} opts
 */
export function createGrove(canvas, { reduced = false, low = false } = {}) {
  const renderer = new WebGLRenderer({ canvas, antialias: !low, powerPreference: 'high-performance' });
  renderer.setClearColor(INK);
  const scene = new Scene();
  const camera = new PerspectiveCamera(55, 1, 0.1, 160);
  const shared = { uFog: { value: INK }, uFogD: { value: 0.034 }, uTime: { value: 0 } };

  // ---- culms: instanced cylinders; nodes, colour drift and lighting in the shader
  const R = rand(7), count = low ? 200 : 420, culms = [];
  const geo = new CylinderGeometry(1, 1, 1, low ? 7 : 10, 1, true);
  const mat = new ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: `attribute float aTone; varying float vY; varying vec3 vN; varying float vTone; varying float vDepth; varying vec3 vW;
      void main(){ vec4 w = modelMatrix * instanceMatrix * vec4(position,1.); vW = w.xyz; vY = w.y; vTone = aTone;
        vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `${fog} varying float vY; varying vec3 vN; varying float vTone; varying vec3 vW;
      void main(){
        float seg = fract(vY * 0.55 + vTone * 3.);
        float node = smoothstep(0.035, 0.0, seg) + smoothstep(0.965, 1.0, seg) * 0.6;
        vec3 green = mix(vec3(.23,.36,.16), vec3(.42,.52,.24), vTone);
        vec3 dry = vec3(.62,.53,.36);
        vec3 base = mix(green, dry, smoothstep(.55, 1., vTone) * .7);
        vec3 L = normalize(vec3(-.4,.8,.35));
        float lit = .35 + .65 * max(dot(vN, L), 0.);
        float rim = pow(1. - abs(vN.z), 3.) * .35;
        vec3 c = base * lit * (1. - node * .45) + vec3(.95,.82,.6) * rim * .5;
        gl_FragColor = vec4(applyFog(c), 1.);
      }`,
  });
  const mesh = new InstancedMesh(geo, mat, count);
  const tone = new Float32Array(count), dummy = new Object3D();
  for (let i = 0; i < count; i++) {
    const z = 8 - R() * 140, side = R() < 0.5 ? -1 : 1, x = side * (1.3 + Math.pow(R(), 1.4) * 10);
    const r = 0.06 + R() * 0.11, h = 12 + R() * 10;
    dummy.position.set(x, h / 2 - 1.2, z);
    dummy.rotation.set((R() - 0.5) * 0.08, 0, (R() - 0.5) * 0.12);
    dummy.scale.set(r, h, r);
    dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    tone[i] = R();
    culms.push({ x, z });
  }
  geo.setAttribute('aTone', new InstancedBufferAttribute(tone, 1));
  scene.add(mesh);
  culms.sort((a, b) => b.z - a.z);

  // ---- ground: a dark plane with soft light pools
  const ground = new Mesh(new PlaneGeometry(60, 180), new ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: `varying float vDepth; varying vec2 vP; void main(){ vec4 w = modelMatrix * vec4(position,1.); vP = w.xz; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `${fog} varying vec2 vP; void main(){ float pool = .5 + .5 * sin(vP.x * .7) * sin(vP.y * .35); vec3 c = mix(vec3(.05,.09,.1), vec3(.16,.17,.12), pool * .5); gl_FragColor = vec4(applyFog(c), 1.); }`,
  }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -1.2, -55); scene.add(ground);

  // ---- light shafts: additive planes, brightest at the canopy
  const shaftMat = new ShaderMaterial({
    uniforms: { ...shared }, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
    vertexShader: `varying vec2 vUv; varying float vDepth; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uTime; varying vec2 vUv; varying float vDepth; void main(){ float a = pow(vUv.y, 1.6) * smoothstep(0., .25, vUv.x) * smoothstep(1., .75, vUv.x);
      a *= .55 + .45 * sin(uTime * .4 + vUv.x * 6.); a *= smoothstep(70., 15., vDepth); gl_FragColor = vec4(vec3(1.,.86,.62) * a * .16, 1.); }`,
  });
  for (let i = 0; i < 9; i++) {
    const s = new Mesh(new PlaneGeometry(3 + R() * 3, 22), shaftMat);
    s.position.set((R() - 0.5) * 10, 8, 4 - i * 14 - R() * 6); s.rotation.set(0, (R() - 0.5) * 0.6, 0.35 + R() * 0.2);
    scene.add(s);
  }

  // ---- fibre strands: tubes spiralling along the path, converging into one braid at the end
  const strandMat = new ShaderMaterial({
    uniforms: { ...shared, uReveal: { value: 0 } }, transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vUv; varying float vDepth; varying vec3 vN; void main(){ vUv = uv; vN = normalMatrix * normal; vec4 mv = modelViewMatrix * vec4(position,1.); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `${fog} uniform float uReveal; varying vec2 vUv; varying vec3 vN;
      void main(){ if (vUv.x > uReveal) discard;
        float sheen = pow(max(dot(normalize(vN), normalize(vec3(.3,.6,1.))), 0.), 8.);
        float glint = smoothstep(.02, 0., abs(vUv.x - uReveal)) * 1.5;
        vec3 c = vec3(.84,.74,.58) * (.55 + .45 * sheen) + glint * vec3(1.,.9,.7);
        float near = smoothstep(1.4, 4.5, vDepth); // strands brushing past the lens fade instead of smearing
        gl_FragColor = vec4(applyFog(c), near); }`,
  });
  const STRANDS = low ? 3 : 5, strands = [];
  for (let k = 0; k < STRANDS; k++) {
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60, z = 4 + t * (END - 10 - 4), conv = ease(MathUtils.clamp((t - 0.72) / 0.28, 0, 1));
      const rad = (2.1 + Math.sin(t * 9 + k) * 0.5) * (1 - conv) + 0.06 * conv, a = t * 14 + (k / STRANDS) * Math.PI * 2;
      pts.push(new Vector3(Math.cos(a) * rad, 1.5 + Math.sin(a) * rad * 0.6 * (1 - conv), z));
    }
    const curve = new CatmullRomCurve3(pts);
    const m = new Mesh(new TubeGeometry(curve, low ? 300 : 600, 0.012 + k * 0.0015, 5, false), strandMat);
    scene.add(m); strands.push(curve);
  }

  // ---- motes drifting in the light
  const motePos = new Float32Array((low ? 500 : 1200) * 3);
  for (let i = 0; i < motePos.length; i += 3) { motePos[i] = (R() - 0.5) * 16; motePos[i + 1] = R() * 8 - 1; motePos[i + 2] = 8 - R() * 140; }
  const moteGeo = new BufferGeometry(); moteGeo.setAttribute('position', new Float32BufferAttribute(motePos, 3));
  const motes = new Points(moteGeo, new ShaderMaterial({
    uniforms: { ...shared, uDpr: { value: 1 } }, transparent: true, depthWrite: false, blending: AdditiveBlending,
    vertexShader: `uniform float uTime; uniform float uDpr; varying float vA; void main(){ vec3 p = position; p.y += sin(uTime * .3 + p.z) * .25; p.x += cos(uTime * .2 + p.y) * .2;
      vec4 mv = modelViewMatrix * vec4(p,1.); gl_PointSize = uDpr * 26. / -mv.z; vA = smoothstep(40., 4., -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(vec3(1.,.88,.64) * smoothstep(.5, 0., d) * vA * .6, 1.); }`,
  }));
  scene.add(motes);

  let dpr = 1, camZ = 6;
  const look = new Vector3();
  return {
    setSize(w, h) {
      dpr = Math.min(devicePixelRatio || 1, low ? 1 : 1.5);
      renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.fov = w / h < 0.8 ? 68 : 55; camera.updateProjectionMatrix();
      motes.material.uniforms.uDpr.value = dpr;
    },
    /** Draw progress p (0–1). Returns the x of each culm the camera passed close by since the last frame. */
    render(p, now, pointer = [0, 0]) {
      const t = reduced ? 0.45 : p;
      shared.uTime.value = reduced ? 0 : now / 1000;
      const prevZ = camZ;
      camZ = MathUtils.lerp(6, END + 6, ease(t));
      camera.position.set(Math.sin(t * Math.PI * 2) * 0.5 + pointer[0] * 0.6, 1.5 + Math.sin(t * 9) * 0.12 - pointer[1] * 0.3, camZ);
      look.set(camera.position.x * 0.4 + pointer[0] * 2.2, 1.7 - pointer[1] * 1.2, camZ - 10);
      camera.lookAt(look);
      strandMat.uniforms.uReveal.value = MathUtils.clamp(t * 1.15 + 0.06, 0, 1);
      renderer.render(scene, camera);
      const passed = [];
      if (!reduced && Math.abs(camZ - prevZ) < 8) {
        const lo = Math.min(prevZ, camZ), hi = Math.max(prevZ, camZ);
        for (const c of culms) if (c.z > lo && c.z <= hi && Math.abs(c.x - camera.position.x) < 3.2) passed.push(c.x - camera.position.x);
      }
      return passed.slice(0, 3);
    },
    dispose() { renderer.dispose(); },
  };
}
