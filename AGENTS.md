# SB Trading — project agent instructions

## Source order
1. Read `PRODUCT.md` for client identity, visitor job, and truth restrictions.
2. Read `HANDOFF_CODEX.md` for the latest recorded implementation, tests, and deployment boundaries; recheck changing claims.
3. Read `docs/reviews/2026-11-10-claudex-ux-acceptance.md` as a **review proposal**, not approved design governance.
4. Inspect current `index.html`, `site.js`, `assets/rifat.js`, `src/materials3d.js`, `src/rifat-fn.js` and `tests/smoke.mjs` before modifying.

## How Claude and Codex should work
- One existing SB Trading site, not competing versions. Keep cinematic film, 3D studies, three families, nine products, Rifat guided mode, plain form, sound opt-in, and fallback paths.
- Compare the owner's original client brief with the current source; preserve the specified About Us / Products / Contact Us navigation and addressable product details unless the owner explicitly approves a deviation.
- Use IGLOO-style originality and meaningful camera choreography, not the reference firm's assets or another client's branding.
- Each patch: failing targeted test first → smallest correction → focused test → full build/smoke → paired desktop/mobile screenshots → review findings.
- If browser, GPU, accessibility, email transport or provider evidence is unavailable, say NOT VERIFIED. Tests never prove visual quality by themselves.
- Source photos and derived logos need SB Trading provenance/approval. No invented specs, certifications, stock, prices, origins, MOQ, lead times or contact data.
- `npm ci && npm run build && npm test` is the local baseline. Preserve all existing tests and fail-closed fallbacks.

## Authority and cost
- No automatic merge, deploy, DNS/Cloudflare Access change, credential/secret installation, publishing, commercial email or WhatsApp sending.
- Keep paid Anthropic Rifat **off** until the owner approves spend and security controls; guided mode is default.
- Avoid new files or agents duplicating `PRODUCT.md`, `HANDOFF_CODEX.md` or DR.X canonical memory. Draft PRs are review candidates, not acceptance proof.
