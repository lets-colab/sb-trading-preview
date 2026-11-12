// Copy and heading rules from the Impeccable critique (PRODUCT.md: truth before spectacle).
// - No uppercase kicker labels above headings (the chapter bar names the stage).
// - The fibre-gold accent (<em> in a heading) is kept for the hero, the film's last caption and "Ask Rifat" only.
// - No film caption may imply that the bamboo footage becomes SB Trading's yarn (their yarn is banana fibre).
// - The main navigation is the client brief's: About Us, Products, Contact Us, each pointing at a section that exists;
//   About Us states only facts already on the site and names what SB Trading has still to confirm.
// - Each of the nine products has its own address (id="p-<slug>"), so a product can be linked and shared.
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

const nav = html.match(/<nav class="nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? '';
const links = [...nav.matchAll(/<a href="#([^"]+)">([^<]+)<\/a>/g)].map((m) => [m[2], m[1]]);
check(JSON.stringify(links.map((l) => l[0])) === JSON.stringify(['About Us', 'Products', 'Contact Us']), `the main navigation is About Us, Products, Contact Us (found ${links.map((l) => l[0]).join(', ')})`);
check(links.length === 3 && links.every(([, id]) => new RegExp(`id="${id}"`).test(html)), `each navigation link points at a section that exists (${links.map((l) => '#' + l[1]).join(', ')})`);
const about = html.match(/<section[^>]*id="about"[\s\S]*?<\/section>/)?.[0] ?? '';
check(/<h2[^>]*>About Us\.?<\/h2>/.test(about) && /forestry and agricultural products/.test(about) && /Still to be confirmed by SB Trading/.test(about), 'About Us exists, states what SB Trading supplies and names what is still to be confirmed');
const ids = [...html.matchAll(/class="product"[^>]*\bid="(p-[a-z0-9-]+)"|\bid="(p-[a-z0-9-]+)"[^>]*class="product"/g)].map((m) => m[1] || m[2]);
check(ids.length === 9 && new Set(ids).size === 9, `each of the nine products has its own address (${ids.length} found)`);

console.log(failures ? `\n${failures} failing` : '\nall passing');
process.exit(failures ? 1 : 0);
