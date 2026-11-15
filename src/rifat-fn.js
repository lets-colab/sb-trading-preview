// Rifat, SB Trading's AI enquiry assistant: Cloudflare Pages Function source.
// Built by `npm run build` into functions/api/rifat.js (self-contained, so the Pages deploy needs no npm install).
//
//   GET  /api/rifat  -> { ai: true|false }        (the page shows guide mode when false or unreachable)
//   POST /api/rifat  -> { reply, enquiry, ready }  body: { messages: [{ role: 'user'|'assistant', text }], enquiry }
//   enquiry: { products: [..], quantity, unit, country, name, email, company, notes }
//
// The Anthropic API key lives only in the Pages project's encrypted variable ANTHROPIC_API_KEY. Without it the
// endpoint answers 503 and the page keeps working as a guided enquiry. ANTHROPIC_BASE_URL exists only for the local
// end-to-end test (tests/rifat-ai.mjs points it at a simulated API); never set it in Cloudflare. Rifat prepares an enquiry; it never
// confirms prices, stock, lead times or orders, and nothing is stored here.
//
// Knowledge: Rifat answers questions from assets/rifat-knowledge.js (bundled here) through the search_knowledge tool.
// Optionally, when the Pages project has SUPABASE_URL and SUPABASE_ANON_KEY, rows of a Supabase table rifat_knowledge
// (id, topic, keywords, text; read-only for the anon role, see docs/supabase/rifat_knowledge.sql) are searched too, so SB
// Trading can add confirmed facts without a redeploy. Without those variables the bundled knowledge alone is used.
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM, ENQUIRY_TOOL, KNOWLEDGE_TOOL, knowledgeAnswer, clean, isReady, readBody } from './rifat-core.js';

export { clean, knowledgeAnswer };

const MODEL = 'claude-opus-5-5';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

export const onRequestGet = ({ env }) => json({ ai: Boolean(env.ANTHROPIC_API_KEY) });

export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'ai_offline' }, 503);
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: 'forbidden' }, 403);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad_json' }, 400); } // malformed JSON from the page
  const parsed = readBody(body);
  if (!parsed) return json({ error: 'bad_request' }, 400);

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 25_000, ...(env.ANTHROPIC_BASE_URL ? { baseURL: env.ANTHROPIC_BASE_URL } : {}) });
  let enquiry = parsed.enquiry;
  const messages = [
    ...parsed.messages.slice(0, -1),
    { role: 'user', content: `${parsed.messages.at(-1).content}\n\n[Enquiry so far, recorded by the page: ${JSON.stringify(enquiry)}]` },
  ];

  try {
    let reply = '';
    for (let turn = 0; turn < 4; turn++) {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low' },
        cache_control: { type: 'ephemeral' },
        system: SYSTEM,
        tools: [ENQUIRY_TOOL, KNOWLEDGE_TOOL],
        messages,
      });
      if (response.stop_reason === 'refusal') {
        reply = "I can't help with that here. I can answer questions about SB Trading's materials and prepare a quotation enquiry.";
        break;
      }
      reply = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim() || reply;
      const calls = response.content.filter((b) => b.type === 'tool_use');
      if (response.stop_reason !== 'tool_use' || !calls.length) break;
      messages.push({ role: 'assistant', content: response.content }); // full content, thinking blocks included
      messages.push({
        role: 'user',
        content: await Promise.all(calls.map(async (c) => {
          if (c.name === 'search_knowledge') return { type: 'tool_result', tool_use_id: c.id, content: await knowledgeAnswer(c.input?.query, env) };
          enquiry = { ...enquiry, ...clean(c.input) };
          return { type: 'tool_result', tool_use_id: c.id, content: `Recorded. Enquiry now: ${JSON.stringify(enquiry)}` };
        })),
      });
    }
    return json({ reply: reply || 'Could you tell me a little more about what you need?', enquiry, ready: isReady(enquiry) });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: 'busy' }, 429);
    if (error instanceof Anthropic.APIError) { console.error('Rifat API error', error.status, error.message); return json({ error: 'ai_error' }, 502); }
    console.error('Rifat failed', error);
    return json({ error: 'ai_error' }, 502);
  }
}
