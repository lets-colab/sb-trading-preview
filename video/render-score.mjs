// Renders the film's soundtrack from the site's own score engine (assets/sound.js), offline and seeded, so every
// render is identical: public/score.wav (16.5 s, 48 kHz stereo, loudness-normalised to -16 LUFS with true peak at
// most -1.5 dBTP by ffmpeg loudnorm, the usual level for phone and social playback) and src/score-notes.json
// (each mallet note's time and place, which the film draws as ripples of light). Chords follow the film's scenes and
// the site's cues mark each family's arrival and the closing card.
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url)), SITE = path.resolve(HERE, '..');
const server = http.createServer((q, r) => {
  const f = path.join(SITE, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(SITE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); fs.createReadStream(f).pipe(r);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
const res = await page.evaluate(async () => {
  const m = await import('/assets/sound.js');
  const SR = 48000, LEN = 16.5;
  const oc = new OfflineAudioContext(2, Math.round(SR * LEN), SR);
  const e = m.createSoundEngine(oc, { seed: 11 });
  const notes = []; e.onNote((n) => notes.push({ at: +n.at.toFixed(3), x: +n.x.toFixed(3), y: +n.y.toFixed(3), v: +n.v.toFixed(2) }));
  e.music(true, 0, 1.2);
  [[0, 0], [3.2, 3, 0], [6.8, 3, 1], [10.4, 3, 2], [13.6, 4]].forEach(([t, chapter, family = 0]) => e.scene({ chapter, family }, t));
  e.schedule(14.2);
  e.music(false, 14.6, 1.4);
  const at = (t, fn) => oc.suspend(t).then(() => { fn(); return oc.resume(); }).catch(() => {});
  at(3.25, () => e.cue('knock', 0.72)); at(6.85, () => e.cue('knock', 0.72)); at(10.45, () => e.cue('knock-soft', 0.72)); at(13.65, () => e.cue('reply', 0.5));
  const buf = await oc.startRendering();
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  let peak = 0; for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = 10 ** (-3 / 20) / peak, n = L.length, out = new DataView(new ArrayBuffer(44 + n * 4));
  const w = (o, s) => [...s].forEach((ch, i) => out.setUint8(o + i, ch.charCodeAt(0)));
  w(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true);
  out.setUint32(24, SR, true); out.setUint32(28, SR * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) { out.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i] * g)) * 32767, true); out.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i] * g)) * 32767, true); }
  let s = ''; const u = new Uint8Array(out.buffer); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return { wav: btoa(s), notes, peak: 20 * Math.log10(peak), gain: 20 * Math.log10(g) };
});
const raw = path.join(HERE, 'public/score-raw.wav'), wav = path.join(HERE, 'public/score.wav');
fs.writeFileSync(raw, Buffer.from(res.wav, 'base64'));
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', wav]);
fs.unlinkSync(raw);
fs.writeFileSync(path.join(HERE, 'src/score-notes.json'), JSON.stringify(res.notes) + '\n');
console.log(`score: ${res.notes.length} notes, raw peak ${res.peak.toFixed(1)} dBFS, gain ${res.gain.toFixed(1)} dB -> peak -3 dBFS, then loudnorm -16 LUFS`);
await browser.close(); server.close();
