// Renders two stills of the 3D journey: the film's poster (the dark bamboo grove), shown with reduced motion, without
// WebGL and while the world loads (assets/img/journey-poster.webp), and the gallery at the journey's end, which Explore
// shows blurred behind the families (assets/img/showroom-backdrop.webp). 1600x900.
// Run after `npm run build`: CHROMIUM_PATH=<chrome> node tools/build-poster.mjs (needs python3 with Pillow for WebP).
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/') { r.writeHead(200, { 'content-type': 'text/html' }); return r.end('<!doctype html><body style="margin:0"><canvas id="c" style="width:1600px;height:900px"></canvas>'); }
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': 'text/javascript' }); fs.createReadStream(f).pipe(r);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${server.address().port}/`);
// [scroll progress, file]: the grove poster, and the gallery at the journey's end (Explore's blurred backdrop)
for (const [p, name] of [[0.03, 'journey-poster'], [1, 'showroom-backdrop']]) {
  const png = await page.evaluate(async (q) => {
    const { createJourney } = await import('/assets/vendor/world.js');
    const c = document.createElement('canvas'), j = createJourney(c, { low: false });
    j.setSize(1600, 900);
    j.render({ p: q, pointer: [0, 0], now: 4000 });
    j.render({ p: q, pointer: [0, 0], now: 4000 });
    return c.toDataURL('image/png');
  }, p);
  const tmp = path.join(ROOT, `assets/img/${name}.png`), out = path.join(ROOT, `assets/img/${name}.webp`);
  fs.writeFileSync(tmp, Buffer.from(png.split(',')[1], 'base64'));
  execFileSync('python3', ['-c', 'import sys; from PIL import Image; Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2], quality=72, method=6)', tmp, out]);
  fs.unlinkSync(tmp);
  console.log(`wrote ${path.relative(ROOT, out)} (${fs.statSync(out).size} bytes)`);
}
await browser.close(); server.close();
