// End-to-end test of Rifat's AI mode without a real key: the page, the real Pages Function (functions/api/rifat.js)
// and a local simulated Anthropic Messages API. Proves: the page detects AI mode, the function sends the expected
// request (model, system prompt, update_enquiry tool, fallback beta, key header), runs the tool loop, the enquiry card
// fills from the tool input, the reply is shown, and an API failure drops the page back to guided mode.
// It does NOT prove Claude's real answers; that needs ANTHROPIC_API_KEY in Cloudflare (see HANDOFF_CODEX.md).
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fn = await import(path.join(ROOT, 'functions/api/rifat.js'));
let failures = 0;
const check = (ok, msg) => { console.log(ok ? 'ok  ' : 'FAIL', msg); if (!ok) failures++; };

// ------------------------------------------------------------ simulated Anthropic API
const seen = [];
const mock = http.createServer(async (q, r) => {
  let body = ''; for await (const c of q) body += c;
  const req = JSON.parse(body || '{}');
  seen.push({ url: q.url, headers: q.headers, body: req });
  const last = req.messages?.at(-1);
  const lastText = typeof last?.content === 'string' ? last.content : '';
  const send = (status, obj) => { r.writeHead(status, { 'content-type': 'application/json', 'request-id': 'req_test' }); r.end(JSON.stringify(obj)); };
  if (/FAIL/.test(lastText)) return send(500, { type: 'error', error: { type: 'api_error', message: 'simulated outage' } });
  const base = { id: `msg_${seen.length}`, type: 'message', role: 'assistant', model: req.model, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 } };
  if (Array.isArray(last?.content) && last.content.some((b) => b.type === 'tool_result')) {
    return send(200, { ...base, stop_reason: 'end_turn', content: [{ type: 'text', text: 'Noted: banana leaves, 2 tonnes, delivered to Germany. I am an AI assistant; SB Trading’s team confirms prices. What is your name and business email?' }] });
  }
  return send(200, { ...base, stop_reason: 'tool_use', content: [
    { type: 'text', text: 'Let me note that.' },
    { type: 'tool_use', id: 'toolu_1', name: 'update_enquiry', input: { products: ['Banana leaves'], quantity: 2, unit: 'tonnes', country: 'Germany' } },
  ] });
});
await new Promise((r) => mock.listen(0, '127.0.0.1', r));
const MOCK = `http://127.0.0.1:${mock.address().port}`;
const env = { ANTHROPIC_API_KEY: 'test-key', ANTHROPIC_BASE_URL: MOCK };

// ------------------------------------------------------------ site + Pages Function
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png' };
const site = http.createServer(async (q, r) => {
  const url = new URL(q.url, 'http://x');
  if (url.pathname === '/api/rifat') {
    let body = ''; for await (const c of q) body += c;
    const request = new Request(`http://${q.headers.host}${q.url}`, { method: q.method, headers: q.headers, body: q.method === 'POST' ? body : undefined });
    const res = q.method === 'POST' ? await fn.onRequestPost({ request, env }) : await fn.onRequestGet({ request, env });
    r.writeHead(res.status, Object.fromEntries(res.headers)); return r.end(await res.text());
  }
  const f = path.join(ROOT, url.pathname.endsWith('/') ? url.pathname + 'index.html' : decodeURIComponent(url.pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((r) => site.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${site.address().port}`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [], external = [];
p.on('pageerror', (e) => errors.push(e.message));
p.on('request', (r) => { if (!r.url().startsWith(ORIGIN) && !r.url().startsWith('data:')) external.push(r.url()); });
await p.goto(ORIGIN + '/');
await p.evaluate(() => document.getElementById('enquire').scrollIntoView());
await p.waitForFunction(() => /AI assistant · online/.test(document.getElementById('rifatMode').textContent), null, { timeout: 15000 }).catch(() => {});
check(/AI assistant · online/.test(await p.textContent('#rifatMode')), 'Rifat reports AI mode when the function has a key');
await p.waitForFunction(() => document.querySelectorAll('#rifatLog .msg.r').length >= 1, null, { timeout: 10000 }).catch(() => {});
check(/AI assistant/.test(await p.textContent('#rifatLog')), 'Rifat introduces itself as an AI assistant');

await p.fill('#rifatInput', 'We need 2 tonnes of banana leaves delivered to Germany');
await p.press('#rifatInput', 'Enter');
await p.waitForFunction(() => /Germany\./.test(document.getElementById('rifatLog').textContent), null, { timeout: 15000 }).catch(() => {});
const ticket = await p.textContent('#ticketList');
check(/Banana leaves/.test(ticket) && /2 tonnes/.test(ticket) && /Germany/.test(ticket), 'the enquiry card fills from Claude’s update_enquiry tool call');
check(/What is your name and business email\?/.test(await p.textContent('#rifatLog')), 'Claude’s reply after the tool loop is shown');

const first = seen[0];
check(first?.url.includes('/v1/messages') && first.body.model === 'claude-opus-5-5', 'the function calls the Messages API with claude-opus-5-5');
check(first?.headers.authorization === 'Bearer test-key' || first?.headers['x-api-key'] === 'test-key', 'the key goes only in the server-side request header');
check(/server-side-fallback-2026-07-01/.test(first?.headers['anthropic-beta'] || '') && first.body.fallbacks === 'default', 'server-side refusal fallbacks are enabled');
check(first?.body.tools?.[0]?.name === 'update_enquiry' && /You are Rifat/.test(JSON.stringify(first.body.system)), 'system prompt and update_enquiry tool are sent');
check(seen.length === 2 && seen[1].body.messages.some((m) => Array.isArray(m.content) && m.content.some((b) => b.type === 'tool_result')), 'the tool result goes back to Claude in a second call');

await p.fill('#rifatInput', 'FAIL please'); await p.press('#rifatInput', 'Enter');
await p.waitForFunction(() => /lost my connection/.test(document.getElementById('rifatLog').textContent), null, { timeout: 15000 }).catch(() => {});
check(/guided mode/i.test(await p.textContent('#rifatMode')) && /lost my connection/.test(await p.textContent('#rifatLog')), 'an API failure falls back to guided mode and says so');
check(errors.length === 0, `no page errors${errors.length ? ' - ' + errors[0] : ''}`);
check(external.length === 0, `the page makes no external requests${external.length ? ' - ' + external[0] : ''}`);

await browser.close(); site.close(); mock.close();
console.log(failures ? `\n${failures} failing` : '\nall passing');
process.exit(failures ? 1 : 0);
