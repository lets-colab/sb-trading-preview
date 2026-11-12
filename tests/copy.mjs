// Copy and heading rules from the Impeccable critique (PRODUCT.md: truth before spectacle).
// - No uppercase kicker labels above headings (the chapter bar names the stage).
// - The fibre-gold accent (<em> in a heading) is kept for the hero, the film's last caption and "Ask Rifat" only.
// - No film caption may imply that the bamboo footage becomes SB Trading's yarn (their yarn is banana fibre).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const html = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.html'), 'utf8');
let failures = 0;
const check = (ok, msg) => { console.log(ok ? 'ok  ' : 'FAIL', msg); if (!ok) failures++; };

check(!/class="eyebrow/.test(html), 'no kicker labels above headings');
const accents = [...html.matchAll(/<h[1-3][^>]*>[^<]*<em>/g)].length;
check(accents <= 3, `heading accents limited to hero, last caption and Ask Rifat (found ${accents})`);
check(!/Drawn out <em>into fibre|into fibre\./i.test(html), 'no caption says the bamboo is drawn out into fibre');

console.log(failures ? `\n${failures} failing` : '\nall passing');
process.exit(failures ? 1 : 0);
