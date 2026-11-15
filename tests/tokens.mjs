// Design-to-code fidelity gate (DESIGN.md "Fidelity controls"). Fails when a custom property in styles.css :root is
// missing from DESIGN.md's token block, when DESIGN.md lists a token the stylesheet does not define, or when the two
// values differ. DESIGN.md tokens are the lines that start with `--name:` (prose and YAML `---` lines are ignored).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const norm = (v) => v.replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').trim().toLowerCase();

const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const rootBlock = css.match(/:root\s*\{([^}]*)\}/);
if (!rootBlock) { console.error('FAIL styles.css has no :root block'); process.exit(1); }
const code = new Map([...rootBlock[1].replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)].map((m) => [m[1], norm(m[2])]));

const designMd = fs.readFileSync(path.join(ROOT, 'DESIGN.md'), 'utf8');
const doc = new Map();
for (const line of designMd.split('\n')) {
  const m = line.match(/^--([a-z0-9-]+)\s*:\s*([^;]+);/i);
  if (m) doc.set(m[1], norm(m[2]));
}

const problems = [];
// The YAML front matter's colours are what tools that read DESIGN.md (design agents, importers) take as the palette,
// so each one must equal the stylesheet's value too.
const front = designMd.match(/^---\n([\s\S]*?)\n---/);
const colorsBlock = front?.[1].match(/^colors:\n((?:[ \t]+.*\n?)*)/m)?.[1] || '';
const yamlColors = [...colorsBlock.matchAll(/^\s+([a-z0-9-]+):\s*"?([^"\n]+)"?/gim)];
if (!yamlColors.length) problems.push('DESIGN.md front matter has no colors block');
for (const [, name, value] of yamlColors) {
  if (!code.has(name)) problems.push(`front matter colour ${name} is not defined in styles.css`);
  else if (code.get(name) !== norm(value)) problems.push(`front matter colour ${name} differs: styles.css "${code.get(name)}" vs DESIGN.md front matter "${norm(value)}"`);
}
for (const [name, value] of code) {
  if (!doc.has(name)) problems.push(`--${name} is in styles.css but not documented in DESIGN.md`);
  else if (doc.get(name) !== value) problems.push(`--${name} differs: styles.css "${value}" vs DESIGN.md "${doc.get(name)}"`);
}
for (const name of doc.keys()) if (!code.has(name)) problems.push(`--${name} is documented in DESIGN.md but not defined in styles.css`);

if (problems.length) { for (const p of problems) console.log('FAIL', p); process.exit(1); }
console.log(`ok   ${code.size} design tokens match between styles.css and DESIGN.md`);
