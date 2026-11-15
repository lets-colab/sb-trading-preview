// Supabase Edge Function entry for Rifat (Deno). The logic is generated from src/rifat-gemini.js by `npm run build`.
// Deploy: supabase functions deploy rifat --no-verify-jwt   (the page calls it without a Supabase login; CORS limits
// it to ALLOWED_ORIGINS). Secrets: supabase secrets set GEMINI_API_KEY=... (never commit keys).
import { handle } from './core.js';

Deno.serve((request: Request) => handle(request, Deno.env.toObject()));
