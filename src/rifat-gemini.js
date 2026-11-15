// Rifat's free AI endpoint: a Supabase Edge Function that answers with Google Gemini (free tier), for the site on GitHub
// Pages (which runs no server code). Built by `npm run build` into supabase/functions/rifat/core.js; the Edge Function
// entry supabase/functions/rifat/index.ts serves handle(). Same request and reply as the Cloudflare/Claude endpoint
// (src/rifat-fn.js), and the same rules, fields and knowledge (src/rifat-core.js), so the page needs no changes:
//   GET  -> { ai, provider }                    POST { messages, enquiry } -> { reply, enquiry, ready }
// Secrets live only in Supabase (`supabase secrets set`): GEMINI_API_KEY (free key from Google AI Studio). Optional:
// GEMINI_MODEL (default below; confirm the current free model name in AI Studio), ALLOWED_ORIGINS (comma-separated sites
// allowed to call it; default the GitHub Pages site), SUPABASE_URL and SUPABASE_ANON_KEY (Supabase provides both to Edge
// Functions automatically) for the rifat_knowledge table. GEMINI_BASE_URL exists only for tests/rifat-gemini.mjs.
// Note for the owner: on Gemini's free tier, outside the EEA, Switzerland and the UK, Google may use what buyers type to
// improve its models; the page says so beside Rifat. A paid key removes that.
import { SYSTEM, ENQUIRY_TOOL, KNOWLEDGE_TOOL, knowledgeAnswer, clean, isReady, readBody } from './rifat-core.js';

const DEFAULT_MODEL = 'gemini-3.6-flash';
const DEFAULT_ORIGINS = 'https://lets-colab.github.io';

// Gemini's function declarations use an OpenAPI subset: no additionalProperties.
const declare = ({ name, description, input_schema: { additionalProperties, ...parameters } }) => ({ name, description, parameters });
const TOOLS = [{ functionDeclarations: [declare(ENQUIRY_TOOL), declare(KNOWLEDGE_TOOL)] }];

function cors(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(',').map((s) => s.trim()).filter(Boolean);
  const ok = Boolean(origin && allowed.includes(origin));
  return { ok, headers: ok ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'origin' } : { vary: 'origin' } };
}
const reply = (body, status, headers) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
});

async function gemini(env, contents) {
  const base = (env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
  const res = await fetch(`${base}/v1beta/models/${env.GEMINI_MODEL || DEFAULT_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents, tools: TOOLS, generationConfig: { temperature: 0.4, maxOutputTokens: 800 } }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw Object.assign(new Error(`gemini ${res.status}`), { status: res.status });
  return res.json();
}

/** Serves one request (GET, OPTIONS or POST) with the environment's settings; returns a Response. */
export async function handle(request, env = {}) {
  const { ok, headers } = cors(request.headers.get('origin'), env);
  if (request.method === 'OPTIONS') return new Response(null, { status: ok ? 204 : 403, headers });
  if (request.method === 'GET') return reply({ ai: Boolean(env.GEMINI_API_KEY), provider: 'gemini' }, 200, headers);
  if (request.method !== 'POST') return reply({ error: 'method' }, 405, headers);
  if (!ok) return reply({ error: 'forbidden' }, 403, headers);
  if (!env.GEMINI_API_KEY) return reply({ error: 'ai_offline' }, 503, headers);
  let body;
  try { body = await request.json(); } catch (e) { return reply({ error: 'bad_json' }, 400, headers); } // malformed JSON from the page
  const parsed = readBody(body);
  if (!parsed) return reply({ error: 'bad_request' }, 400, headers);

  let enquiry = parsed.enquiry;
  const contents = parsed.messages.map((m, i, all) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: i === all.length - 1 ? `${m.content}\n\n[Enquiry so far, recorded by the page: ${JSON.stringify(enquiry)}]` : m.content }],
  }));
  try {
    let text = '';
    for (let turn = 0; turn < 4; turn++) {
      const data = await gemini(env, contents);
      const content = data?.candidates?.[0]?.content;
      const parts = content?.parts || [];
      text = parts.filter((p) => typeof p.text === 'string' && !p.thought).map((p) => p.text).join('\n').trim() || text;
      const calls = parts.filter((p) => p.functionCall);
      if (!calls.length) break;
      contents.push({ role: 'model', parts }); // the model's turn as given, thought signatures included
      contents.push({ role: 'user', parts: await Promise.all(calls.map(async ({ functionCall: { name, args } }) => {
        if (name === 'search_knowledge') return { functionResponse: { name, response: { result: await knowledgeAnswer(args?.query, env) } } };
        enquiry = { ...enquiry, ...clean(args) };
        return { functionResponse: { name, response: { result: `Recorded. Enquiry now: ${JSON.stringify(enquiry)}` } } };
      })) });
    }
    return reply({ reply: text || 'Could you tell me a little more about what you need?', enquiry, ready: isReady(enquiry) }, 200, headers);
  } catch (error) {
    console.error('Rifat (Gemini) failed', error.status || '', error.message);
    return reply({ error: error.status === 429 ? 'busy' : 'ai_error' }, error.status === 429 ? 429 : 502, headers);
  }
}
