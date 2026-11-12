// SB Trading · photographs in depth. Raw WebGL2, no library.
// Each family's real photograph is drawn with its depth map (Depth Anything V2, generated offline from the same
// photograph). Moving the camera samples nearer pixels further than distant ones, so a still photo gains real
// parallax, a scroll-driven dolly, depth of field, distance haze and a light sweep. Every pixel comes from SB Trading's
// photograph; nothing is modelled or invented.
//
// API (site.js, and the Remotion film in video/): createPhotoDepth(canvas, { low, base, preserve })
//   -> { mount(el), setSize(w, h), render(state) -> settling, whenReady(fam) -> Promise<boolean> }
//   render({ fam, t, pointer, settle }) draws one frame and returns true while it is still easing; settle snaps.
//   base: where the photographs live (default 'assets/img/'; depth maps in base + 'depth/').
//   preserve: keep the drawing buffer after compositing, so a frame can be captured (the film renderer needs it).
//   whenReady(fam) resolves once that family's photographs and depth maps have loaded (false if any failed).
const FAMILIES = [
  ['bamboo-sections', 'bamboo-poles'],
  ['banana-fibre', 'banana-fibre-loose'],
  ['banana-leaves'],
];

const VERT = `#version 300 es
in vec2 p; out vec2 vUv;
void main(){ vUv = p * 0.5 + 0.5; vUv.y = 1.0 - vUv.y; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uA, uDA, uB, uDB;
uniform vec2 uAspA, uAspB;   // image aspect correction (cover fit) for A and B
uniform float uMix, uT, uTime, uLow;
uniform vec2 uLook;          // pointer, -0.5..0.5
uniform vec2 uView;          // canvas size in px

vec2 cover(vec2 uv, vec2 asp, float zoom){ return (uv - 0.5) * asp / zoom + 0.5; }

// Parallax: march toward the displaced position, refining with the depth found there (less tearing at edges).
vec2 parallax(sampler2D d, vec2 uv, vec2 shift){
  vec2 q = uv;
  for (int i = 0; i < 4; i++) { float z = texture(d, q).r; q = uv + shift * (z - 0.45); }
  return q;
}

vec3 shade(sampler2D img, sampler2D dep, vec2 asp, vec2 uv){
  float zoom = 1.16 - 0.12 * uT;                        // slow dolly in as the visitor scrolls through the family
  vec2 base = cover(uv, asp, zoom);
  vec2 shift = vec2(uLook.x * 0.045, uLook.y * 0.03 + (uT - 0.5) * 0.035);
  vec2 q = parallax(dep, base, shift);
  float z = texture(dep, q).r;
  // depth of field: focus on the near-middle, soften the far background
  float coc = smoothstep(0.35, 0.0, z) * (uLow > 0.5 ? 1.0 : 2.2) / uView.y;
  vec3 c = texture(img, q).rgb * 0.4;
  c += texture(img, q + vec2( coc, 0.0)).rgb * 0.15;
  c += texture(img, q + vec2(-coc, 0.0)).rgb * 0.15;
  c += texture(img, q + vec2(0.0,  coc)).rgb * 0.15;
  c += texture(img, q + vec2(0.0, -coc)).rgb * 0.15;
  // distance haze toward the blue-hour ink
  c = mix(c, vec3(0.04, 0.10, 0.19), smoothstep(0.45, 0.0, z) * 0.55);
  // light sweep: a warm band that crosses the frame with the scroll, strongest on near surfaces
  float band = exp(-pow((uv.x + uv.y * 0.6) - (uT * 1.9 - 0.3), 2.0) * 18.0);
  c += vec3(1.0, 0.86, 0.62) * band * z * 0.22;
  return c;
}

void main(){
  vec3 a = shade(uA, uDA, uAspA, vUv);
  vec3 c = a;
  if (uMix > 0.001) c = mix(a, shade(uB, uDB, uAspB, vUv), uMix);
  // grade: gentle contrast, vignette, fine grain
  c = pow(c, vec3(1.05));
  vec2 v = vUv - 0.5; c *= 1.0 - dot(v, v) * 0.75;
  float g = fract(sin(dot(gl_FragCoord.xy + uTime, vec2(12.9898, 78.233))) * 43758.5453);
  c += (g - 0.5) * 0.025;
  o = vec4(c, 1.0);
}`;

function loadImage(src) {
  return new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });
}

export function createPhotoDepth(canvas, { low = false, base = 'assets/img/', preserve = false } = {}) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: preserve, powerPreference: low ? 'low-power' : 'default' });
  if (!gl) throw new Error('no WebGL2');
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; for (const n of ['uA', 'uDA', 'uB', 'uDB', 'uAspA', 'uAspB', 'uMix', 'uT', 'uTime', 'uLow', 'uLook', 'uView']) U[n] = gl.getUniformLocation(prog, n);
  gl.uniform1i(U.uA, 0); gl.uniform1i(U.uDA, 1); gl.uniform1i(U.uB, 2); gl.uniform1i(U.uDB, 3);
  gl.uniform1f(U.uLow, low ? 1 : 0);

  // Textures load lazily per family; a family draws once its photo and depth map have arrived.
  const tex = new Map();
  function texture(img) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    return t;
  }
  let dirty = true, showing = [];   // showing: the photo names of the family on screen
  function want(name) {
    if (tex.has(name)) return tex.get(name);
    const entry = { ready: false, failed: false, aspect: 1 };
    tex.set(name, entry);
    entry.loaded = Promise.all([loadImage(`${base}${name}.webp`), loadImage(`${base}depth/${name}-depth.webp`)]).then(([im, dm]) => {
      if (gl.isContextLost()) return;
      entry.img = texture(im); entry.depth = texture(dm); entry.aspect = im.width / im.height; entry.ready = true; if (showing.includes(name)) dirty = true; // a prefetch for the next family does not redraw
    }).catch(() => { entry.failed = true; if (showing.includes(name)) dirty = true; }); // the canvas hides for that family and its <img> shows
    return entry;
  }
  FAMILIES[0].forEach(want);

  let w = 1, h = 1, look = [0, 0], mix = 0, shownFam = -1;
  const ease = (a, b, k) => (Math.abs(b - a) < 1e-3 ? b : a + (b - a) * k);
  function bind(unit, entry, depthUnit, aspLoc) {
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, entry.img);
    gl.activeTexture(gl.TEXTURE0 + depthUnit); gl.bindTexture(gl.TEXTURE_2D, entry.depth);
    const view = w / h, a = entry.aspect;          // cover fit
    gl.uniform2f(aspLoc, view > a ? 1 : view / a, view > a ? a / view : 1);
  }

  return {
    mount(el) { if (canvas.parentElement !== el) { el.appendChild(canvas); dirty = true; } },
    setSize(cw, ch) {
      const dpr = Math.min(devicePixelRatio || 1, low ? 1 : 1.75);
      w = Math.max(1, Math.round(cw * dpr)); h = Math.max(1, Math.round(ch * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; dirty = true; }
    },
    render({ fam, t, pointer, now = 0, settle = false }) {
      const names = FAMILIES[fam] || FAMILIES[0];
      showing = names;
      names.forEach(want);
      FAMILIES[(fam + 1) % FAMILIES.length].forEach(want); // prefetch the next family
      const A = tex.get(names[0]), B = tex.get(names[1] || names[0]);
      // Until this family's photo and depth map are ready (or if they failed), the canvas steps aside so the plain
      // <img> in the arch shows instead of a blank frame. Loading keeps the loop alive; a failure lets it stop.
      canvas.style.visibility = A.ready ? 'visible' : 'hidden';
      if (!A.ready) { dirty = false; return !A.failed; }
      const targetMix = names[1] && B.ready ? Math.min(1, Math.max(0, (t - 0.45) * 6)) : 0;
      const k = settle ? 1 : 0.12;
      const lx = ease(look[0], pointer[0], k), ly = ease(look[1], pointer[1], k), m = ease(mix, targetMix, settle ? 1 : 0.2);
      const settling = lx !== pointer[0] || ly !== pointer[1] || m !== targetMix;
      look = [lx, ly]; mix = m;
      if (fam !== shownFam) { shownFam = fam; dirty = true; }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(U.uView, w, h);
      gl.uniform2f(U.uLook, lx, ly);
      gl.uniform1f(U.uT, t);
      gl.uniform1f(U.uMix, m);
      gl.uniform1f(U.uTime, settle ? 0 : (now % 1000));
      bind(0, A, 1, U.uAspA);
      bind(2, B.ready ? B : A, 3, U.uAspB);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      dirty = false;
      return settling;
    },
    get dirty() { return dirty; },
    whenReady(fam) {
      const names = FAMILIES[fam] || FAMILIES[0];
      return Promise.all(names.map((n) => want(n).loaded)).then(() => names.every((n) => tex.get(n).ready));
    },
  };
}
