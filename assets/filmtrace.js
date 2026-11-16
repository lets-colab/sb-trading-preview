// SB Trading · the handover from the live 3D grove to the footage. Lines traced from the film's own opening frames
// (tools/trace-film.py, assets/film/trace.bin) are drawn over the film canvas, fitted the way the film fits its
// frames (cover, centred; the phone set is the desktop frame's centre crop), so they sit on the bamboo in the
// picture. As the visitor enters they draw themselves in while the 3D wireframe fades, then dissolve as the footage
// brightens under them. Outside the handover nothing is drawn.
//
//   createFilmTrace(canvas, bytes, { set }) -> { size(width, height), draw(p) -> drew }
//     bytes: trace.bin as an ArrayBuffer. set: 'd' (1280x720) or 'm' (405x720, x from 437.5 of the desktop frame).
//     p: the film's progress. canvas.dataset: frame (the traced frame drawn), want (the frame the film shows).
//     Throws on a file it cannot read; the caller then simply goes without the handover.

const FRAMES = 196; // the film's frame count: progress p shows frame round(p * 195)
const IN = [0.028, 0.062], OUT = [0.085, 0.128]; // film progress: the lines draw in, then dissolve
const clamp = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

function parse(bytes) {
  const v = new DataView(bytes);
  if (v.byteLength < 6 || String.fromCharCode(v.getUint8(0), v.getUint8(1), v.getUint8(2), v.getUint8(3)) !== 'SBT1') throw new Error('filmtrace: not a trace file');
  let o = 4;
  const u16 = () => { const x = v.getUint16(o, true); o += 2; return x; };
  const frames = [];
  for (let f = u16(); f > 0; f--) {
    const index = u16(), lines = [];
    for (let n = u16(); n > 0; n--) {
      const count = u16(), pts = new Float32Array(count * 2);
      let x = u16(), y = u16();
      pts[0] = x; pts[1] = y;
      for (let k = 1; k < count; k++) { x += v.getInt8(o++); y += v.getInt8(o++); pts[k * 2] = x; pts[k * 2 + 1] = y; }
      lines.push(pts);
    }
    frames.push({ index, lines });
  }
  if (!frames.length) throw new Error('filmtrace: empty');
  return frames;
}

export function createFilmTrace(canvas, bytes, { set = 'd' } = {}) {
  const g = canvas.getContext('2d', { willReadFrequently: true });
  if (!g) throw new Error('filmtrace: no 2D canvas context');
  const frames = parse(bytes);
  const IW = set === 'm' ? 405 : 1280, IH = 720, X0 = set === 'm' ? 437.5 : 0;
  let cleared = true, edgeTop = '#0000';
  return {
    size(width, height) { // the film canvas's pixel size, so the lines land on its pixels
      canvas.width = width; canvas.height = height;
      edgeTop = g.createLinearGradient(0, 0, 0, height * 0.14); edgeTop.addColorStop(0, '#000'); edgeTop.addColorStop(1, '#0000');
      cleared = false;
    },
    draw(p) {
      const shown = smooth(IN[0], IN[1], p) * (1 - smooth(OUT[0], OUT[1], p));
      if (shown <= 0.004) {
        if (!cleared) { g.clearRect(0, 0, canvas.width, canvas.height); cleared = true; }
        return false;
      }
      cleared = false;
      const want = Math.round(clamp(p) * (FRAMES - 1));
      let best = frames[0];
      for (const f of frames) if (Math.abs(f.index - want) < Math.abs(best.index - want)) best = f;
      const cw = canvas.width, ch = canvas.height, s = Math.max(cw / IW, ch / IH), ox = (cw - IW * s) / 2, oy = (ch - IH * s) / 2;
      const reveal = smooth(IN[0], IN[1] + 0.008, p); // each line draws from its start to its end
      const path = new Path2D();
      for (const pts of best.lines) {
        const n = pts.length / 2, upto = Math.max(2, Math.ceil(n * reveal));
        path.moveTo((pts[0] - X0) * s + ox, pts[1] * s + oy);
        for (let k = 1; k < upto; k++) path.lineTo((pts[k * 2] - X0) * s + ox, pts[k * 2 + 1] * s + oy);
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, cw, ch);
      g.lineJoin = g.lineCap = 'round';
      const px = Math.max(1, cw / 1440); // about one CSS pixel at any canvas density
      g.lineWidth = 1.1 * px;
      g.strokeStyle = `rgba(243,248,252,${(0.82 * shown).toFixed(3)})`; // Cloud; a warm Fibre edge as they dissolve
      g.stroke(path);
      const warm = smooth(OUT[0], OUT[1], p);
      if (warm > 0) { g.strokeStyle = `rgba(231,214,182,${(0.5 * warm * shown).toFixed(3)})`; g.stroke(path); }
      g.globalCompositeOperation = 'destination-out'; // under the header the lines fade, as the 3D grove's do
      g.fillStyle = edgeTop; g.fillRect(0, 0, cw, ch * 0.14);
      g.globalCompositeOperation = 'source-over';
      canvas.dataset.frame = String(best.index); canvas.dataset.want = String(want);
      return true;
    },
  };
}
