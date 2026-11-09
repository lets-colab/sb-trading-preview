// Renders both SB Trading film formats to video/out/ (H.264, no audio).
// Uses a local Chromium headless shell when REMOTION_BROWSER is set (e.g. in sandboxes without downloads).
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'node:path';

const serveUrl = await bundle({ entryPoint: path.resolve('src/index.jsx') });
const browserExecutable = process.env.REMOTION_BROWSER || null;
for (const id of ['SBFilm16x9', 'SBFilm9x16']) {
  const composition = await selectComposition({ serveUrl, id, browserExecutable });
  await renderMedia({
    composition, serveUrl, codec: 'h264', crf: 20, browserExecutable,
    outputLocation: `out/${id === 'SBFilm16x9' ? 'sb-trading-film-16x9' : 'sb-trading-film-9x16'}.mp4`,
    onProgress: ({ progress }) => { if (Math.round(progress * 100) % 25 === 0) process.stdout.write(`${id} ${Math.round(progress * 100)}%\n`); },
  });
}
