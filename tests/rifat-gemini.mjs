// Rifat's free AI endpoint (Supabase Edge Function, Google Gemini free tier) against a local simulated Gemini API.
// Proves: GET reports AI mode only with a key and names the provider; POST sends the system prompt, both tools and the
// key in a header (never the URL); the function-calling loop records enquiry fields and answers from the knowledge base;
// CORS admits only the allowed origins; a missing key, a bad request and a Gemini failure each answer the page with an
// error it turns into guided mode. It does NOT prove Gemini's real answers; that needs GEMINI_API_KEY in Supabase.
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { handle } = await import(path.join(ROOT, 'supabase/functions/rifat/core.js'));
let failures = 0;
const check = (ok, msg) => { console.log(ok ? 'ok  ' : 'FAIL', msg); if (!ok) failures++; };

const seen = [];
const mock = http.createServer(async (q, r) => {
  let body = ''; for await (const c of q) body += c;
  const req = JSON.parse(body || '{}');
  seen.push({ url: q.url, headers: q.headers, body: req });
  const send = (status, obj) => { r.writeHead(status, { 'content-type': 'application/json' }); r.end(JSON.stringify(obj)); };
  const last = req.contents?.at(-1), lastText = last?.parts?.map((p) => p.text || '').join('') || '';
  if (/OUTAGE/.test(lastText)) return send(500, { error: { code: 500, message: 'simulated outage' } });
  const responses = last?.parts?.filter((p) => p.functionResponse) || [];
  const reply = (parts) => send(200, { candidates: [{ content: { role: 'model', parts }, finishReason: 'STOP' }] });
  if (responses.length) {
    const r0 = responses[0].functionResponse;
    if (r0.name === 'search_knowledge') return reply([{ text: `From what I know: ${String(r0.response?.result || '').slice(0, 60)}` }]);
    return reply([{ text: 'Noted: banana leaves, 2 tonnes to Germany. I am an AI assistant. What is your name and business email?' }]);
  }
  if (/ordering/i.test(lastText)) return reply([{ functionCall: { name: 'search_knowledge', args: { query: 'how does ordering work' } } }]);
  return reply([{ functionCall: { name: 'update_enquiry', args: { products: ['Banana leaves'], quantity: 2, unit: 'tonnes', country: 'Germany' } } }]);
});
await new Promise((ok) => mock.listen(0, '127.0.0.1', ok));
const MOCK = `http://127.0.0.1:${mock.address().port}`;
const env = { GEMINI_API_KEY: 'gem-test', GEMINI_BASE_URL: MOCK, ALLOWED_ORIGINS: 'https://lets-colab.github.io' };
const ORIGIN = 'https://lets-colab.github.io';
const post = (body, e = env, origin = ORIGIN) => handle(new Request('https://x.supabase.co/functions/v1/rifat', { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(body) }), e);
const msgs = (text) => ({ messages: [{ role: 'user', text }], enquiry: {} });

{ // GET: AI mode and provider
  const on = await (await handle(new Request('https://x/functions/v1/rifat', { headers: { origin: ORIGIN } }), env)).json();
  const off = await (await handle(new Request('https://x/functions/v1/rifat', { headers: { origin: ORIGIN } }), {})).json();
  check(on.ai === true && on.provider === 'gemini' && off.ai === false, `GET reports AI mode only with a key, and names the provider (${JSON.stringify({ on, off })})`);
}
{ // CORS
  const pre = await handle(new Request('https://x/functions/v1/rifat', { method: 'OPTIONS', headers: { origin: ORIGIN, 'access-control-request-method': 'POST' } }), env);
  check(pre.status === 204 && pre.headers.get('access-control-allow-origin') === ORIGIN, 'the CORS preflight admits the GitHub Pages site');
  const evil = await post(msgs('2 tonnes of banana leaves to Germany'), env, 'https://evil.example');
  check(evil.status === 403 && seen.length === 0, 'a request from any other website is refused before Gemini is called');
}
{ // enquiry through the function-calling loop
  const res = await post(msgs('2 tonnes of banana leaves to Germany'));
  const out = await res.json(), first = seen[0], second = seen[1];
  check(res.status === 200 && res.headers.get('access-control-allow-origin') === ORIGIN, 'a request from the site is answered with its CORS header');
  check(/\/models\/gemini-[\w.-]+:generateContent$/.test(first?.url || '') && !/key=/.test(first.url) && first.headers['x-goog-api-key'] === 'gem-test', `the key goes only in the x-goog-api-key header, never the URL (${first?.url})`);
  const names = first?.body.tools?.[0]?.functionDeclarations?.map((f) => f.name) || [];
  check(names.includes('update_enquiry') && names.includes('search_knowledge') && /You are Rifat/.test(first.body.systemInstruction?.parts?.[0]?.text || ''), 'the system prompt and both tools are sent');
  check(out.enquiry?.products?.[0] === 'Banana leaves' && out.enquiry.quantity === 2 && out.enquiry.country === 'Germany', 'the enquiry fills from Gemini\'s update_enquiry call');
  check(second?.body.contents?.some((c) => c.parts?.some((p) => p.functionResponse?.name === 'update_enquiry')) && /What is your name/.test(out.reply), 'the function result goes back to Gemini, and its reply is returned');
}
{ // knowledge
  seen.length = 0;
  const out = await (await post(msgs('How does ordering work?'))).json();
  const fr = seen[1]?.body.contents?.at(-1)?.parts?.[0]?.functionResponse;
  check(fr?.name === 'search_knowledge' && /three steps/i.test(fr.response?.result || '') && /From what I know/.test(out.reply), 'a question is answered from the knowledge base through search_knowledge');
}
{ // failures fall back
  const offline = await post(msgs('hello'), { ALLOWED_ORIGINS: ORIGIN });
  const bad = await post({ messages: [] });
  const outage = await post(msgs('OUTAGE please'));
  check(offline.status === 503 && bad.status === 400 && outage.status === 502, `no key 503, bad request 400, Gemini failure 502: the page falls back to guided mode (${offline.status}, ${bad.status}, ${outage.status})`);
}
mock.close();
if (failures) { console.error(`${failures} Gemini endpoint check(s) failed`); process.exit(1); }
console.log('rifat-gemini: all passing');
