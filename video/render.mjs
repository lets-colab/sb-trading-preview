// Renders both SB Trading film formats to video/out/ (H.264 + AAC). Syncs the design system and renders the score
// first, so the film always matches the site. WebGL (the depth renderer) runs on SwiftShader ANGLE, so no GPU is needed.
// REMOTION_BROWSER: a local Chromium headless shell, for sandboxes that cannot download one.
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

execFileSync('node', ['sync-design.mjs'], { stdio: 'inherit' });
execFileSync('node', ['render-score.mjs'], { stdio: 'inherit' });
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.jsx') });
const browserExecutable = process.env.REMOTION_BROWSER || null;
const chromiumOptions = { gl: 'swangle' };
const only = process.argv[2];
for (const id of ['SBFilm16x9', 'SBFilm9x16'].filter((x) => !only || x === only)) {
  const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions });
  let last = -1;
  await renderMedia({
    composition, serveUrl, codec: 'h264', crf: 18, audioCodec: 'aac', browserExecutable, chromiumOptions,
    outputLocation: `out/${id === 'SBFilm16x9' ? 'sb-trading-film-16x9' : 'sb-trading-film-9x16'}.mp4`,
    onProgress: ({ progress }) => { const p = Math.floor(progress * 4) * 25; if (p !== last) { last = p; console.log(`${id} ${p}%`); } },
  });
}
