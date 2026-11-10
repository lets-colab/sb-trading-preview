// Browser smoke test for the SB Trading preview. Run: npm test (set CHROMIUM_PATH to an installed browser when needed).
// Serves the repo root on a random local port (no /api/rifat here, so Rifat runs in guided mode), then checks desktop
// and phone in Chromium with software GL. Passes only if: no page errors, no external requests, no horizontal overflow,
// no AudioContext before the Sound press, the product sheet hands the product to Rifat, Rifat's guided flow fills the
// enquiry and rejects a bad email, WhatsApp stays disabled while no number is configured, the plain form validates
// inline, and (desktop) the 3D studies draw nothing while the visitor is still.
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let failures = 0;
const check = (ok, msg) => { console.log(ok ? 'ok  ' : 'FAIL', msg); if (!ok) failures++; };

for (const [name, viewport, touch] of [['desktop 1440', { width: 1440, height: 900 }, false], ['phone 390', { width: 390, height: 844 }, true]]) {
  const ctx = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
  await ctx.addInitScript(() => {
    window.__ac = 0; window.__draws = 0;
    const R = window.AudioContext; if (R) window.AudioContext = class extends R { constructor(...a) { super(...a); window.__ac++; } };
    for (const C of [WebGLRenderingContext, WebGL2RenderingContext]) for (const m of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) { const f = C.prototype[m]; if (f) C.prototype[m] = function (...a) { window.__draws++; return f.apply(this, a); }; }
  });
  const p = await ctx.newPage();
  const errors = [], external = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text()); });
  p.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith('/api/rifat')) errors.push(`${r.status()} ${r.url()}`); });
  p.on('request', (r) => { const u = r.url(); if (!u.startsWith(ORIGIN) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u); });
  await p.goto(ORIGIN + '/'); await p.waitForTimeout(3000);
  check((await p.evaluate(() => window.__ac)) === 0, `${name}: no AudioContext before the Sound press`);
  const toExplore = async (q) => { await p.evaluate((x) => { const e = document.getElementById('explore'); scrollTo(0, e.offsetTop + (e.offsetHeight - innerHeight) * x); }, q); await p.waitForTimeout(1800); };

  // product sheet -> Rifat
  await toExplore(0.1);
  await p.click('#bamboo.on .product >> nth=1'); await p.waitForTimeout(500);
  check(await p.evaluate(() => document.getElementById('productSheet').open), `${name}: a product opens its sheet`);
  await p.click('#sheetAsk'); await p.waitForTimeout(3500);
  check((await p.evaluate(() => document.activeElement.id)) === 'rifatInput', `${name}: focus lands in Rifat's message field after "Ask Rifat"`);
  check(/Bamboo splits/.test(await p.textContent('#ticketList')), `${name}: the product from the sheet is in "Your enquiry"`);
  check(/guided mode/i.test(await p.textContent('#rifatMode')), `${name}: without the Pages Function Rifat says it is in guided mode`);

  // guided flow
  const say = async (t) => { await p.fill('#rifatInput', t); await p.press('#rifatInput', 'Enter'); await p.waitForTimeout(1500); };
  await say('5 tonnes'); await say('Japan'); await say('Test Buyer'); await say('not-an-email');
  check(/doesn.t look like an email/.test(await p.textContent('#rifatLog')), `${name}: Rifat rejects a malformed email`);
  await say('buyer@example.com'); await say('Skip'); await say('Nothing else');
  const ticket = await p.textContent('#ticketList');
  check(/5 tonnes/.test(ticket) && /Japan/.test(ticket) && /buyer@example\.com/.test(ticket), `${name}: Rifat fills quantity, destination and email`);
  check(/enquiry is ready/i.test(await p.textContent('#rifatLog')), `${name}: Rifat says the enquiry is ready`);
  check((await p.getAttribute('#waSend', 'aria-disabled')) === 'true', `${name}: WhatsApp stays disabled while no number is configured`);
  await p.click('#waSend', { force: true }); await p.waitForTimeout(200);
  check(/number is added once confirmed/.test(await p.textContent('#ticketNote')), `${name}: pressing the disabled WhatsApp button explains why`);

  // plain form alternative
  await p.click('#formToggle'); await p.waitForTimeout(300);
  await p.fill('#f-qty', '-3'); await p.click('#enquiryForm button[type=submit]'); await p.waitForTimeout(400);
  check((await p.textContent('#e-quantity')).length > 0, `${name}: a negative quantity shows an inline error`);
  check((await p.evaluate(() => document.querySelectorAll('.err:not(:empty)').length)) >= 3, `${name}: empty required fields show inline errors`);
  check((await p.textContent('#summary')) === '', `${name}: an invalid form prepares nothing`);
  check((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, `${name}: no horizontal overflow`);

  if (!touch) {
    check(await p.evaluate(() => document.documentElement.classList.contains('has-3d')), `${name}: the 3D studies load`);
    // keyboard reaches every family: Tab past the last bamboo product lands on the first fibre product, and back
    await toExplore(0.1); await p.focus('#bamboo .product >> nth=3'); await p.keyboard.press('Tab'); await p.waitForTimeout(300);
    check((await p.evaluate(() => document.activeElement.textContent.trim())) === 'Grade A: banana silk', `${name}: Tab moves from the bamboo products into the fibre products`);
    await p.keyboard.press('Shift+Tab'); await p.waitForTimeout(300);
    check((await p.evaluate(() => document.activeElement.textContent.trim())) === 'Woven mats', `${name}: Shift+Tab returns to the bamboo products`);
    await p.click('#soundToggle'); await p.waitForTimeout(1200);
    check((await p.evaluate(() => window.__ac)) === 1, `${name}: pressing Sound creates the audio context`);
    await toExplore(0.5); await p.waitForTimeout(4000);
    const a = await p.evaluate(() => window.__draws); await p.waitForTimeout(2000); const b = await p.evaluate(() => window.__draws);
    check(b === a, `${name}: the 3D studies draw nothing while the visitor is still (${b - a} draw calls)`);
  }
  check(errors.length === 0, `${name}: no page errors or failed loads${errors.length ? ' - ' + errors.slice(0, 2).join(' | ') : ''}`);
  check(external.length === 0, `${name}: no external requests${external.length ? ' - ' + external.slice(0, 2).join(' | ') : ''}`);
  await ctx.close();
}
await browser.close(); server.close();
console.log(failures ? `\n${failures} failing` : '\nall passing');
process.exit(failures ? 1 : 0);
