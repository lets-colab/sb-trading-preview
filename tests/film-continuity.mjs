// The film's first scene keeps moving forward (the owner, 21 Nov 2026): the grove shot carries the camera on through
// the bamboo to the pavilion's three stands (clip 97f87dc2 to 2.95 s, where the clip itself cuts away to a fibre macro
// that is left out), and the showroom is reached by a push forward, not a sideways wipe. And everything that names a
// place in the film agrees with the film the build wrote (assets/film/film.json): the frame count in site.js, each
// chapter's resting point inside its own shot, and the chapter bar's jumps on those same points.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let failures = 0;
const check = (ok, msg) => { console.log(ok ? 'ok  ' : 'FAIL', msg); if (!ok) failures++; };

const film = JSON.parse(read('assets/film/film.json'));
const html = read('index.html'), site = read('site.js');

const grove = film.clips?.grove;
check(Array.isArray(grove) && grove[1] >= 2.9, `the grove shot runs on through the bamboo to the pavilion (clip time ${JSON.stringify(grove)}, needs to reach 2.9 s)`);
check(film.how?.showroom === 'push', `the showroom is reached by a push forward, not a sideways wipe (${film.how?.showroom})`);

const FRAMES = Number(site.match(/const FRAMES = (\d+);/)?.[1]);
check(FRAMES === film.frames, `site.js draws the film's own frame count (${FRAMES} vs ${film.frames})`);

const order = ['grove', 'showroom', 'hall', 'close', 'dome'];
const shotOf = (f) => order.filter((k) => film.shots[k] <= f).at(-1);
// each chapter rests in its own shot (open and fibre: the hall, where the specimen opens and fibre twists to yarn; bark: the close shot)
const home = { grove: 'grove', showroom: 'showroom', open: 'hall', fibre: 'hall', bark: 'close', dome: 'dome' };
const beats = [...html.matchAll(/data-ch="(\w+)" data-anchor="([\d.]+)"/g)].map((m) => ({ ch: m[1], p: Number(m[2]) }));
check(beats.length === 6, `the film has six chapters (${beats.length})`);
for (const { ch, p } of beats) {
  const f = Math.round(p * (film.frames - 1));
  const joinNow = Object.values(film.joins).some(([a, b]) => f >= a && f <= b);
  check(shotOf(f) === home[ch] && !joinNow, `"${ch}" rests at frame ${f}, inside the ${home[ch]} shot and not in a join (shot ${shotOf(f)})`);
}
const bar = Object.fromEntries([...html.matchAll(/data-ch="(\d)" data-p="([\d.]+)"/g)].map((m) => [m[1], Number(m[2])]));
const anchor = Object.fromEntries(beats.map((b) => [b.ch, b.p]));
check(bar[1] === anchor.showroom && bar[2] === anchor.open, `the chapter bar jumps to the chapters' own resting points (${JSON.stringify(bar)})`);

// the opening's line drawing dissolves before the camera rests on the grove (Codex on #27)
const trace = read('assets/filmtrace.js').match(/OUT = \[([\d.]+), ([\d.]+)\]/);
check(trace && Number(trace[2]) <= anchor.grove, `the opening's traced lines have dissolved by the grove's resting point (fade ends ${trace?.[2]}, rests ${anchor.grove})`);
// the chapter bar and the sound's scene change where the chapters change, read from the chapters, not fixed numbers
check(!/c = p < 0\.\d+ \? 0 : p < 0\.\d+/.test(site), 'the chapter bar and the sound\'s scene take their film boundaries from the chapters, not from fixed numbers');

if (failures) { console.error(`\n${failures} film continuity check(s) failed`); process.exit(1); }
console.log('\nfilm continuity: all checks passed');
