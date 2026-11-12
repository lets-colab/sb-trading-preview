// Keeps the film in sync with the site's design system. Run before rendering (npm run render does it).
//   DESIGN.md colour tokens        -> src/tokens.json (committed; tests/film-sync.mjs checks it matches DESIGN.md)
//   the site's fonts, photographs, depth maps and light mark -> public/ (generated, git-ignored; MANIFEST below)
// The film never carries its own copies of the site's assets, so a change on the site reaches the film on the next render.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '..');
const PHOTOS = ['bamboo-sections', 'bamboo-poles', 'banana-fibre', 'banana-fibre-loose', 'banana-leaves'];

/** public/ path -> site path (relative to the repo root). */
export const MANIFEST = {
  'fonts/gloock-latin-400-normal.woff2': 'assets/vendor/fonts/gloock-latin-400-normal.woff2',
  'fonts/schibsted-grotesk-latin-wght-normal.woff2': 'assets/vendor/fonts/schibsted-grotesk-latin-wght-normal.woff2',
  'img/sb-mark-light.webp': 'assets/img/sb-mark-light.webp',
  ...Object.fromEntries(PHOTOS.flatMap((n) => [[`img/${n}.webp`, `assets/img/${n}.webp`], [`img/depth/${n}-depth.webp`, `assets/img/depth/${n}-depth.webp`]])),
};

/** Files the film loads that are made, not copied: public/ path -> what makes them. */
export const GENERATED = { 'score.wav': 'video/render-score.mjs (assets/sound.js, seeded, offline)' };

/** DESIGN.md frontmatter colours: the lines under "colors:" up to the next top-level key. */
export function designColors(md) {
  const block = md.split('\n---')[0].split(/\ncolors:\n/)[1]?.split(/\n[a-z]/)[0] ?? '';
  return Object.fromEntries([...block.matchAll(/^\s+([a-z0-9-]+):\s*"(#[0-9a-f]+)"/gim)].map((m) => [m[1], m[2].toLowerCase()]));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const colors = designColors(fs.readFileSync(path.join(SITE, 'DESIGN.md'), 'utf8'));
  const tokens = { source: 'DESIGN.md (synced by video/sync-design.mjs; do not edit by hand)', colors };
  fs.writeFileSync(path.join(HERE, 'src/tokens.json'), JSON.stringify(tokens, null, 2) + '\n');
  for (const [dest, src] of Object.entries(MANIFEST)) {
    const to = path.join(HERE, 'public', dest);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(SITE, src), to);
  }
  console.log(`synced ${Object.keys(colors).length} colour tokens and ${Object.keys(MANIFEST).length} assets from the site`);
}
