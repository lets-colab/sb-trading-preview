// Design sync gate for the Remotion film in video/. Run: npm test.
// The film must be built from the same design system and the same words as the site, so it cannot drift:
//  - video/src/tokens.json colours equal DESIGN.md's colour tokens (written by video/sync-design.mjs);
//  - the film source uses no literal colours (only the synced tokens), no font family other than Gloock and
//    Schibsted Grotesk, and no italics (DESIGN.md: emphasis is an upright fibre-coloured em, never italic);
//  - every on-screen line in video/src/copy.json appears on the site (index.html), apart from the labelled
//    exceptions listed there, so the film makes no claim the site does not;
//  - every asset the film loads is synced from the site by video/sync-design.mjs (no separate copies that can drift).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const V = path.join(ROOT, 'video');
let failures = 0;
const check = (ok, msg) => { console.log(ok ? 'ok  ' : 'FAIL', msg); if (!ok) failures++; };
const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null);

const { MANIFEST, GENERATED, designColors } = await import('../video/sync-design.mjs');
const colors = designColors(read(path.join(ROOT, 'DESIGN.md')));
check(Object.keys(colors).length >= 10, `DESIGN.md lists its colour tokens (${Object.keys(colors).length})`);

const tokens = JSON.parse(read(path.join(V, 'src/tokens.json')) ?? '{}');
const synced = Object.entries(colors).every(([k, v]) => tokens.colors?.[k]?.toLowerCase() === v) && Object.keys(tokens.colors ?? {}).length === Object.keys(colors).length;
check(synced, 'the film\'s colours are DESIGN.md\'s colour tokens, synced (video/src/tokens.json)');

const src = fs.readdirSync(path.join(V, 'src')).filter((f) => /\.(jsx?|tsx?)$/.test(f)).map((f) => read(path.join(V, 'src', f))).join('\n');
const literal = [...src.matchAll(/['"`(\s,]#[0-9a-f]{3,8}\b/gi)].map((m) => m[0].trim());
check(literal.length === 0, `the film source has no literal colours, only tokens${literal.length ? ` (found ${[...new Set(literal)].slice(0, 4).join(' ')})` : ''}`);
const families = [...src.matchAll(/font-?family\s*[:=]\s*["'`]?\\?"?([A-Za-z][A-Za-z ]+)/gi)].map((m) => m[1].trim());
const allowed = /^(Gloock|Schibsted Grotesk)$/;
check(families.length > 0 && families.every((f) => allowed.test(f)), `the film uses only Gloock and Schibsted Grotesk (${[...new Set(families)].join(', ') || 'none found'})`);
check(!/italic/i.test(src), 'the film sets no italics (emphasis is an upright fibre em)');

const copy = JSON.parse(read(path.join(V, 'src/copy.json')) ?? '{"lines":[],"labelled":[]}');
const site = read(path.join(ROOT, 'index.html')).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const missing = (copy.lines ?? []).filter((l) => !site.includes(l));
check((copy.lines ?? []).length >= 5 && missing.length === 0, `every line the film shows is the site's own copy${missing.length ? ` (not on the site: ${missing.map((m) => `"${m}"`).join(', ')})` : ''}`);
check((copy.labelled ?? []).every((l) => l.reason), 'film lines that are not site copy each give their reason (labelled exceptions)');
check(/from '\.\/copy\.json'|from "\.\/copy\.json"/.test(src), 'the film reads its words from copy.json, not inline strings');

const assets = [...src.matchAll(/staticFile\(\s*['"`]([^'"`$]+)['"`]/g)].map((m) => m[1]);
const unsynced = assets.filter((a) => !GENERATED[a] && (!MANIFEST[a] || !fs.existsSync(path.join(ROOT, MANIFEST[a]))));
check(assets.length > 0 && unsynced.length === 0, `every asset the film loads is synced from the site (video/sync-design.mjs)${unsynced.length ? ` (not from the site: ${unsynced.join(', ')})` : ''}`);
const photos = Object.keys(MANIFEST).filter((k) => /^img\/(?!depth|sb-)/.test(k));
check(photos.every((k) => fs.existsSync(path.join(ROOT, MANIFEST[k]))), `the depth renderer's photographs and depth maps come from the site (${photos.length} photos)`);

if (failures) { console.error(`${failures} film sync check(s) failed`); process.exit(1); }
console.log('film-sync: all passing');
