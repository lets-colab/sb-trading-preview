// Offline listening test for the generated score in assets/sound.js. Run: npm test.
// Renders the score in an OfflineAudioContext inside Chromium (same seed every run) and measures it, so levels are
// numbers, not opinions: it must stay under the cues (peak below -6 dBFS), sit at a background level (RMS -38..-20
// dBFS), fade in without a click, spread across the stereo field (spatial placement), report each note's position for
// the visual ripples, follow a chapter change, and fall fully silent after it is switched off.
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const p = await browser.newPage();
await p.goto(ORIGIN + '/index.html');
let failures = 0;
const check = (ok, msg) => { console.log(ok ? 'ok  ' : 'FAIL', msg); if (!ok) failures++; };

const r = await p.evaluate(async () => {
  const m = await import('/assets/sound.js');
  const SR = 44100, LEN = 24;
  const oc = new OfflineAudioContext(2, SR * LEN, SR);
  const eng = m.createSoundEngine(oc, { seed: 7 });
  if (typeof eng.music !== 'function') return { missing: true };
  const notes = [];
  eng.onNote((n) => notes.push(n));
  eng.music(true, 0);
  eng.scene({ chapter: 0 }, 0);
  eng.scene({ chapter: 2 }, 8);
  eng.schedule(16);
  eng.music(false, 16);
  const buf = await oc.startRendering();
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  const db = (x) => 20 * Math.log10(Math.max(x, 1e-9));
  const rms = (a, b) => { let s = 0; for (let i = a * SR; i < b * SR; i++) s += (L[i] * L[i] + R[i] * R[i]) / 2; return Math.sqrt(s / ((b - a) * SR)); };
  let peak = 0, finite = true;
  for (let i = 0; i < L.length; i++) { const v = Math.max(Math.abs(L[i]), Math.abs(R[i])); if (!Number.isFinite(v)) finite = false; else if (v > peak) peak = v; }
  let sl = 0, sr = 0, slr = 0;
  for (let i = 2 * SR; i < 16 * SR; i++) { sl += L[i] * L[i]; sr += R[i] * R[i]; slr += L[i] * R[i]; }
  return {
    finite, peak: db(peak), body: db(rms(2, 16)), start: db(rms(0, 0.25)), settled: db(rms(4, 6)), tail: db(rms(21, 24)),
    corr: slr / Math.sqrt(sl * sr), notes: notes.length, xs: notes.every((n) => n.x >= 0 && n.x <= 1 && Number.isFinite(n.at)),
    chords: [...new Set(notes.map((n) => n.chord))],
  };
});

if (r.missing) check(false, 'the sound engine has a generated score (music, scene, schedule, onNote)');
else {
  const f = (x) => x.toFixed(1);
  check(r.finite, 'the score renders finite samples');
  check(r.peak < -6, `the score peaks below -6 dBFS, under the cues (${f(r.peak)} dBFS)`);
  check(r.body > -38 && r.body < -20, `the score sits at a background level, RMS -38..-20 dBFS (${f(r.body)} dBFS)`);
  check(r.start < r.settled - 12, `the score fades in without a click (first 0.25 s ${f(r.start)} vs settled ${f(r.settled)} dBFS)`);
  check(r.corr < 0.9, `the score is spread across the stereo field (L/R correlation ${r.corr.toFixed(2)})`);
  check(r.notes >= 4 && r.xs, `each note reports its place for the visual ripples (${r.notes} notes)`);
  check(r.chords.length >= 2, `a chapter change moves the harmony (chords heard: ${r.chords.join(', ')})`);
  check(r.tail < -70, `switched off, the score falls silent (${f(r.tail)} dBFS)`);
}
// the film's own sound: the clips' audio cut as the picture is. A flight through the hall's opening plays that stretch
// (the split is heard as it is seen); a move backwards is declined, so the page uses its generated whoosh instead; the
// film map gives every frame a time, in order, within the soundtrack
const fs2 = await p.evaluate(async () => {
  const m = await import('/assets/sound.js');
  const SR = 48000, oc = new OfflineAudioContext(2, SR * 4, SR), eng = m.createSoundEngine(oc, { seed: 7 });
  const loaded = await eng.loadFilm({ track: '/assets/film/sound.mp3', bed: '/assets/film/bed.mp3', map: '/assets/film/film.json' }).then(() => true, () => false);
  const map = await (await fetch('/assets/film/film.json')).json();
  const forward = eng.film(74, 101, 1.8), backward = eng.film(101, 74, 1.8);
  const buf = await oc.startRendering(), L = buf.getChannelData(0);
  let s = 0; for (let i = 0; i < 1.8 * SR; i++) s += L[i] * L[i];
  const track = await new OfflineAudioContext(2, 48000, 48000).decodeAudioData(await (await fetch('/assets/film/sound.mp3')).arrayBuffer());
  return { loaded, forward, backward, rms: 10 * Math.log10(s / (1.8 * SR) + 1e-12), frames: map.frames, times: map.time.length, ordered: map.time.every((t, i, a) => i === 0 || t > a[i - 1]), last: map.time.at(-1), dur: track.duration };
});
const site = fs.readFileSync(path.join(ROOT, 'site.js'), 'utf8').match(/const FRAMES = (\d+);/)?.[1];
check(fs2.loaded && fs2.forward && fs2.rms > -45 && !fs2.backward, `a flight through the film plays its own sound for the frames it crosses, and a move backwards is left to the generated cue (${JSON.stringify({ loaded: fs2.loaded, forward: fs2.forward, rms: +fs2.rms.toFixed(1), backward: fs2.backward })})`);
check(fs2.times === fs2.frames && String(fs2.frames) === site && fs2.ordered && fs2.last < fs2.dur, `every film frame has its time in the soundtrack, in order, and the page knows the same frame count (${JSON.stringify({ frames: fs2.frames, times: fs2.times, site, last: fs2.last, dur: +fs2.dur.toFixed(2) })})`);

await browser.close(); server.close();
if (failures) { console.error(`${failures} score check(s) failed`); process.exit(1); }
console.log('score: all passing');
