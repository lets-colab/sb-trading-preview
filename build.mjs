// Bundles the 3D grove (three.js, MIT) and smooth scrolling (Lenis, MIT) into self-hosted files under assets/vendor.
import { build } from 'esbuild';
import fs from 'node:fs';
const common = { bundle: true, format: 'esm', minify: true, legalComments: 'none', target: 'es2020' };
await build({ ...common, entryPoints: ['src/grove.js'], outfile: 'assets/grove.js', banner: { js: '/* SB Trading grove. Includes three.js r187 (MIT, (c) three.js authors). */' } });
await build({ ...common, entryPoints: ['src/smooth.js'], outfile: 'assets/vendor/smooth.js', banner: { js: '/* Lenis (MIT, (c) darkroom.engineering) */' } });
for (const f of ['assets/grove.js', 'assets/vendor/smooth.js']) fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/[ \t]+$/gm, ''));
