# Handoff: SB Trading website (for Codex / ChatGPT), updated 10 Nov 2026 (rebuild)

Read this file, then `PRODUCT.md` (brand and product brief) and `README.md` (file map). This repo is the SB Trading client-review site.

## State in one paragraph
A cinematic scroll story for SB Trading (bamboo, banana fibre yarn, banana bark and leaves; nine products), rebuilt on 10 Nov 2026 after the owner rejected the previous version. Static HTML/CSS/JS plus one Cloudflare Pages Function. Five stages from the owner's proposal deck (Arrive, Discover, Transition, Explore, Enquire) in one continuous blue-hour palette: a scroll-scrubbed film (bamboo canopy → bamboo to fibre → banana leaves → hand-weaving; generated footage plus credited Pexels stock), a pinned Explore stage with real photographs in tilting arched windows and real-time 3D material studies (three.js) breaking out of the frames, "How ordering works" with a drawn fibre line, and **Rifat**, the enquiry assistant, with "Your enquiry" and a WhatsApp hand-off. Opt-in tactile sound. A Remotion brand film project lives in `video/`. It is a client-review draft, not a live commercial site.

- Live address: https://sb-trading.lastbenchbd.com (DNS on Cloudflare, behind a Cloudflare Access login, so only approved people can open it). The repo is built from `main` (`_headers` is a Cloudflare Pages file; `CNAME` is also present).
- Branch for work: `claude/dreamy-turing-gwgukx`. After a PR merges, restart the branch from the latest `origin/main` before adding new commits.
- Quality bar: Impeccable critique scored 22/40, then 28/40 ("Good", no P0 or P1), detector 0 findings. The six P2 findings from the second critique were fixed afterwards but not re-scored.

## Hard rules (the owner's constraints; keep them)
1. **No invented company facts.** Names, grades, specs, prices, lead times, origin, minimum order, certifications and contact details come from SB Trading only. Anything unconfirmed is shown as "to be confirmed", never made up. (The early AI drafts invented tensile grades, HS codes, "100% certified" and a $200 price; none of that is used.)
2. **Real photographs only for products.** There is no photo of banana bark or woven mats yet; the rows say so. Label any generated or illustrative image as such.
3. **Sound is opt-in** (no autoplay). Every immersive layer (film, 3D, sound, smooth scroll) must have a reduced-motion and no-JavaScript path.
4. **Self-hosted only:** no CDNs, fonts or analytics from third parties.
5. **WCAG 2.2 AA.** No logo or wordmark redrawing. `assets/img/sb-logo*.webp` / `sb-mark*.webp` are the owner's original file with only the white background removed; `-light` is the same mark knocked out to Cloud White for dark grounds (derived, awaiting owner approval). Never recolour or redraw beyond that.
6. Do not deploy to a new place, add paid services or keys, or change DNS without the owner's approval. Never put secrets in the repo or in chat.
7. Never claim a pass without evidence (run the checks below).

## Files
```
index.html            all content (semantic; readable without JS); <body data-whatsapp=""> holds SB Trading's WhatsApp number once confirmed
styles.css            tokens (:root), stages, Rifat, form, chapter bar
site.js               film loop, Explore stage controller, 3D loader + idle logic, chapter bar, sound controller, reveals, product sheet, plain form
assets/rifat.js       Rifat on the page: AI mode (calls /api/rifat) or labelled guided mode; "Your enquiry"; WhatsApp + copy
src/rifat-fn.js       Pages Function source (Anthropic TypeScript SDK) -> functions/api/rifat.js (generated, committed; edit the source)
src/materials3d.js    3D studies (three.js r187)        -> assets/materials3d.js
src/smooth.js         Lenis re-export                   -> assets/vendor/smooth.js
assets/sound.js       tactile sound cues (lazy-loaded on the Sound press)
assets/film/{d,m}/    279 WebP frames (desktop 1280x720, phone 405x720 crop): 1-30 Pexels bamboo canopy, 31-191 generated bamboo-to-fibre, 192-223 Pexels banana leaves, 224-279 Pexels handloom weaving. Do NOT use gemini_generated_video_9f29a4ec (fibres winding into yarn): the owner withdrew it.
assets/img/           five real product photographs + logo variants (see rule 5)
assets/vendor/        Motion 12, Lenis, three.js licence, fonts (Gloock, Schibsted Grotesk; OFL)
functions/api/rifat.js  GET -> { ai }, POST -> { reply, enquiry, ready }; 503 without ANTHROPIC_API_KEY
video/                Remotion project: 15 s brand film, 16:9 and 9:16
tests/smoke.mjs       browser smoke test (35 checks)
v1/                   the first single-file draft, kept unchanged
PRODUCT.md            Impeccable brief (register: brand)
DESIGN.md             design system v1.0.0 recorded from the code (tokens, components, states, motion); .impeccable/design.json sidecar
tests/tokens.mjs      design-to-code gate: styles.css :root must match DESIGN.md token block exactly (runs first in npm test)
docs/user-journey.md  buyer journey, moments of truth, gap analysis (assumptions, untested with buyers)
.graphifyignore       keeps film frames, photos, vendor and generated bundles out of /graphify (graphify-out/ is gitignored)
```

## Commands
```bash
npm ci && npm run build                                   # rebuild assets/materials3d.js, assets/vendor/smooth.js, functions/api/rifat.js after editing src/
CHROMIUM_PATH=<chrome> npm test                          # token gate + 37 browser checks, desktop + phone (Rifat runs in guided mode on the local server)
node <impeccable skill>/scripts/detect.mjs --json index.html   # Impeccable detector, expect []
cd video && npm install && REMOTION_BROWSER=<chrome-headless-shell> npm run render   # writes video/out/*.mp4 (not committed)
```

## How it works (essentials)
- **Film (stages 01-03):** `#film` is 680vh with a sticky stage. `site.js` maps scroll progress to one of 279 frames, drawn on a canvas; captions are `.beat[data-at="a,b"]` progress ranges. Frames load coarse to fine. Labelled as generated.
- **Explore (04):** `#explore` is 420vh with one sticky stage; progress thirds pick the family (`.fam.on`, inactive ones `inert`). CSS wipes and tilts the arched photo windows (`--t`, `--ry`, `--rx`); the blurred photo is the background.
- **3D studies:** `loadStudies()` imports `assets/materials3d.js` after first paint (WebGL2 only; reduced motion, no WebGL or a lost context leave photographs only, class `no-3d`). `render()` runs only while the visitor scrolls or moves the pointer, while a family transition settles, and once more at rest; then nothing is drawn (the smoke test counts draw calls).
- **Rifat (05):** `assets/rifat.js` probes `GET /api/rifat` when the section approaches. `{ ai: true }` -> AI mode (POST with the conversation and enquiry; the function calls `claude-opus-5-5` at effort `low` with server-side fallbacks, records fields through the `update_enquiry` tool and validates them). Anything else -> guided mode, labelled "AI not connected yet". Both fill "Your enquiry"; "Send on WhatsApp" opens `wa.me/<number>?text=<enquiry>` only when product, country, name and email are present and `data-whatsapp` is set; otherwise it explains and offers Copy.
- **Plain form:** hidden behind "Prefer a form?" (visible without JS). Inline validation (`check()`); on success it fills Rifat's "Your enquiry". Nothing is transmitted by the page itself.
- **Sound:** `#soundToggle` creates the AudioContext inside the click. Cue peaks measured offline: knock -15.8, open -17.6, reply -16.8, send -22.1, tick -28.8, hover about -31 dBFS. Never heard by a person yet.

### To switch Rifat's AI on (owner action; never paste keys in chat)
1. Cloudflare dashboard -> Workers & Pages -> `sb-trading` -> Settings -> Variables and Secrets -> add an encrypted secret `ANTHROPIC_API_KEY` (Production). Redeploy.
2. Check `https://sb-trading.lastbenchbd.com/api/rifat` returns `{"ai":true}` (behind Access, sign in first). Rifat's label then reads "AI assistant · online".
3. WhatsApp: set to +880 1878-707910 (`<body data-whatsapp="8801878707910">`, owner, 10 Nov 2026); also linked in the footer.
Cost: each message is one or two Claude calls (about 2-4k input tokens). Change `MODEL` in `src/rifat-fn.js` and rebuild for a cheaper model only if the owner chooses.

## Verified (10 Nov 2026)
- Production Pages deployment `48347cc7-27ee-4568-8eb6-d8e58db4f36c` completed successfully from `main` commit `d1b126dea5a0e7de561cbec1a783186904883f47`; this proves deployment completion, not public readiness.
- Pages custom domain `sb-trading.lastbenchbd.com` is active; DNS CNAME points to `sb-trading.pages.dev` and is proxied.
- Fresh local build: `npm run build` passed.
- Fresh browser smoke suite: 18/18 checks passed on macOS 12.7.6 / Chrome 150 using software WebGL. Desktop and phone checks covered validation, focus, audio opt-in, no external requests, no console errors, overflow, and idle grove rendering.
- Playwright's bundled Chromium installer does not support this Mac's macOS 12.7.6. `tests/smoke.mjs` now accepts `CHROMIUM_PATH`; CI installs its own Chromium on Ubuntu.
- GitHub Actions quality workflow is configured to run build + browser smoke tests on PRs and pushes to `main`; it is not a deployment workflow. Its first hosted run is still pending.
- Rebuild (this branch): `npm run build` passed; `npm test` 35/35 on Linux / Chromium 1243 with software WebGL (desktop 1440 and phone 390): product sheet -> Rifat focus, guided flow fills the enquiry and rejects a bad email, WhatsApp disabled without a number, form validation, no overflow, no page errors, no external requests, audio only after the Sound press, 3D draws nothing at rest. Impeccable detector: `[]`.
- Pages Function exercised locally: GET `{ai:false}` without a key; POST 503 without a key; 403 cross-origin; a dummy key reaches the Anthropic API and fails with 401 as expected (so the bundle runs). A real conversation with a real key is NOT PROVEN.
- Not verified: real GPU / real phone performance, screen-reader pass, human listening test, Rifat with a real key, WhatsApp delivery, and production commercial acceptance.

## Self-healing knowledge and incident runbook

### Incident: SB Trading receives a Cloudflare Access login instead of the showroom
**Observed 10 Nov 2026 from an unauthenticated request on `LASTBENCH.local`:**
- `https://sb-trading.lastbenchbd.com`, `https://sb-trading.pages.dev`, and the latest deployment hostname return HTTP 302 to `lastbenchbd.cloudflareaccess.com/cdn-cgi/access/login/...`.
- The response includes `www-authenticate: Cloudflare-Access` and the same Access audience as the account's `All Workers` application.
- Cloudflare API state: the account has an `All Workers` Access application with destination `all_workers` and an allow policy for Cloudflare account members. There is no SB Trading-specific Access application in the account or zone listings.
- **Verified root cause:** account-level `All Workers` Access is the gate. Do not delete or weaken this global application to fix one site.

### Separate controls — do not conflate them
- The zone has an `AI Crawl Control - Block AI bots by User Agent` firewall rule that blocks named crawlers, including Googlebot and AI crawlers. It is not the cause of the human-facing Access redirect. Review it separately only if the owner approves a public/indexable launch.
- The current page explicitly says client-review draft, has `noindex,nofollow`, says the enquiry is not sent or stored, and has contact placeholders. `PRODUCT.md` and this handoff also mark company facts and contact channels as unconfirmed. A public Access exception alone would not make this a production-ready commercial site.
- No SB Trading enquiry recipient or contact details for the intended Rifat assistant were confirmed in the connected Gmail / Contacts searches. Do not invent an enquiry destination.

### Access decision gate — owner decision required
Keep the global `All Workers` policy intact. Choose the intended audience before changing Access:
1. **Client review only:** create a hostname-specific Access application for `sb-trading.lastbenchbd.com` that allows only confirmed reviewer email addresses. Keep `sb-trading.pages.dev` and deployment URLs protected.
2. **Public launch:** only after content and commercial readiness are approved, create a hostname-specific public/bypass application for `sb-trading.lastbenchbd.com` only. Keep the Pages platform hostname and previews protected. Cloudflare documents that specific hostname / Worker destinations take precedence over account-level `all_workers` Access.
3. **No decision:** leave the current protection in place. Do not make the site public by deleting the global Access application.

No Access, DNS, credential, or production permission changes were made during this investigation.

### Recovery loop (required for every incident)
| Step | Operator action | Evidence required |
|---|---|---|
| 1. Capture | Record UTC time, hostname, status, response headers, Cloudflare Ray ID and redirect host. Never record signed redirect query strings, cookies, or tokens. | Redacted request/response summary |
| 2. Reproduce | Test the exact hostname without an authenticated browser session. | Repeatable HTTP result |
| 3. Localise | Read Pages project/deployment, custom-domain status, DNS record, account + zone Access applications, Worker routes, and relevant rulesets. | Authoritative Cloudflare API state |
| 4. Classify | 302 + `www-authenticate: Cloudflare-Access` = Access gate; 403 = Access/WAF/BIC policy; 404/1016 = route/DNS; 5xx = deployment/runtime; form summary only = preview-only form by design. | Root-cause category and evidence |
| 5. Change | Apply the smallest reversible, host-scoped fix. Preserve global controls. Require explicit approval for Access, DNS, credential, publishing, or external-delivery changes. | Before/after config and approval scope |
| 6. Guard | Add a regression test and keep `npm run build` + `npm test` in CI. | Green CI run on the exact commit |
| 7. Verify | Test the unauthenticated canonical host, intended reviewer access, desktop/mobile flows, console, network, and form delivery where configured. | Final-state HTTP + browser + delivery evidence |
| 8. Recover | If the change fails, remove only the new host-specific exception and verify the original global Access gate is active again. | Rollback receipt and repeat test |
| 9. Learn | Update this handoff with symptom → root cause → correction → regression guard → rollback. | Dated incident record |

### Safe failure handling
- Never claim an enquiry is received while the form only prepares a local summary.
- Never claim Rifat is live until an authenticated server-side assistant is deployed and tested with the approved knowledge source and human handoff.
- Never turn off `All Workers`, change DNS, publish the draft, or expose the Pages preview hostname as a shortcut for a single-host problem.
- If evidence is missing, mark the item `NOT PROVEN` and stop at the smallest reversible diagnostic check.

## Open items, in priority order
1. **Owner content:** email and phone (WhatsApp +880 1878-707910 is live); origin, minimum order, shipping terms, lead times, certifications; confirmed product names, grades and per-product photos (banana bark and woven mats have none; "Ski poles" is an unverified label). Approval of the derived light logo.
2. **Rifat AI key:** add `ANTHROPIC_API_KEY` in Cloudflare (steps above), then test five real buyer conversations, including attempts to get prices or a confirmed order (Rifat must refuse and hand to the team). Consider rate limiting per IP (Cloudflare WAF rule on `/api/rifat`) before any public launch.
3. Keep DESIGN.md in step with styles.css (the token gate enforces values); re-run `/impeccable critique` after each design pass.
4. Real-device checks: frame rate of the 3D studies on a mid-range phone; screen reader; listen to the cues on headphones and laptop speakers.
5. Replace the generated and stock film footage with real SB Trading footage when it exists. Stock sources (Pexels licence): videos 40042753 (bamboo), 37009850 (banana leaves), 11716405 (handloom weaving).
6. Remotion film: re-render from `video/` with the transparent logo; add music only with a licensed track.

## Related project
MutualBD voyage (a separate client): see `lets-colab/letscolab`, `projectx/clients/mutualbd/voyage/HANDOFF_CODEX.md`. Do not mix the two clients' content.
