// Version tags: every file the page loads is named with ?v= and the first 8 hex digits of a SHA-256 of its contents, so a
// changed file always has a new address and no cache (browser, CDN, in-app browser) can pair a new page with an old file.
// Run after changing any file the page loads:   node tools/stamp.mjs        (npm test fails while a tag is stale)
// Check without writing:                        node tools/stamp.mjs --check
//
// A tag is written by hand once, as `path?v=00000000`, in one of SOURCES; this rewrites it. A path that starts with ./
// or ../ is read from the file's own folder (module imports); any other path from the site root, as the page resolves
// it. A path inside a FOLDER unit (or the folder itself, `assets/film/?v=`) takes the folder's tag, a hash of every file
// in it: the film's frames share one tag, so the poster, the backdrop and the frames the script draws stay one cache
// entry each. Tags cascade: a module's tag covers the tags inside it, so a changed import renews every importer.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCES = ['index.html', 'styles.css', 'site.js', 'assets/rifat.js', 'src/specimens.js', 'assets/vendor/specimens.js'];
export const FOLDERS = ['assets/film/'];
const TAG = /((?:\.\.?\/)?[A-Za-z0-9_-][A-Za-z0-9_./-]*)\?v=([0-9a-f]{8})/g;
const hash = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 8);
const unitOf = (file) => FOLDERS.find((d) => file === d || file.startsWith(d)) || file;

function filesIn(dir, root) {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? filesIn(`${dir}${e.name}/`, root) : [`${dir}${e.name}`])).sort();
}

/**
 * Works out every tag without writing. `overrides` maps a site path to replacement contents (string or Buffer), to ask
 * what a change would renew. Returns the stamped contents of each source, the tag of every unit named (`tags`), the
 * references whose tag would change (`stale`: file, ref, was, want) and tags naming no file (`missing`).
 */
export function plan({ root = ROOT, overrides = {} } = {}) {
  const read = (f) => (f in overrides ? Buffer.from(overrides[f]) : fs.existsSync(path.join(root, f)) ? fs.readFileSync(path.join(root, f)) : null);
  const original = new Map(SOURCES.map((f) => [f, read(f)?.toString('utf8') ?? null]));
  const contents = new Map(original);
  const tags = new Map(), missing = [];
  const tagOf = (unit) => {
    if (FOLDERS.includes(unit)) {
      const h = crypto.createHash('sha256');
      for (const f of new Set([...filesIn(unit, root), ...Object.keys(overrides).filter((k) => k.startsWith(unit))])) h.update(f).update('\0').update(read(f) ?? '').update('\0');
      return h.digest('hex').slice(0, 8);
    }
    const body = contents.has(unit) ? contents.get(unit) : read(unit);
    return body === null ? null : hash(body);
  };
  for (let pass = 0; pass < 20; pass++) {
    let changed = false;
    tags.clear(); missing.length = 0;
    for (const f of SOURCES) {
      const text = contents.get(f);
      if (text === null) continue;
      const next = text.replace(TAG, (m, ref) => {
        const target = /^\.\.?\//.test(ref) ? path.posix.normalize(path.posix.join(path.posix.dirname(f), ref)) + (ref.endsWith('/') ? '/' : '') : ref;
        const unit = unitOf(target), tag = tagOf(unit);
        if (tag === null) { missing.push({ file: f, ref }); return m; }
        tags.set(unit, tag);
        return `${ref}?v=${tag}`;
      });
      if (next !== text) { contents.set(f, next); changed = true; }
    }
    if (!changed) break;
    if (pass === 19) throw new Error('version tags did not settle: two files tag each other');
  }
  const stale = [];
  for (const f of SOURCES) {
    const was = [...(original.get(f) ?? '').matchAll(TAG)], now = [...(contents.get(f) ?? '').matchAll(TAG)];
    was.forEach((m, i) => { if (m[2] !== now[i][2]) stale.push({ file: f, ref: m[1], was: m[2], want: now[i][2] }); });
  }
  return { contents, tags, stale, missing };
}

/** The tag a request for `file` (a site path, no query) should carry, from plan().tags. */
export const tagFor = (file, tags) => tags.get(unitOf(file));

/** Rewrites stale tags in place; returns the files written. */
export function stamp({ root = ROOT } = {}) {
  const { contents, stale, missing } = plan({ root });
  if (missing.length) throw new Error(`version tags name files that do not exist: ${missing.map((m) => `${m.file} -> ${m.ref}`).join(', ')}`);
  const files = [...new Set(stale.map((s) => s.file))];
  for (const f of files) fs.writeFileSync(path.join(root, f), contents.get(f));
  return files;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--check')) {
    const { stale, missing } = plan();
    for (const s of stale) console.log(`stale: ${s.file} -> ${s.ref}?v=${s.was} (now ${s.want})`);
    for (const m of missing) console.log(`missing: ${m.file} -> ${m.ref}`);
    process.exit(stale.length || missing.length ? 1 : 0);
  }
  const files = stamp();
  console.log(files.length ? `version tags renewed in ${files.join(', ')}` : 'version tags are current');
}
