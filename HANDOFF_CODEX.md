# Handoff: SB Trading website (for Codex / ChatGPT), updated 12 Nov 2026

Read this file, then `PRODUCT.md` (brand and product brief) and `README.md` (file map). This repo is the SB Trading client-review site.

## Start here, Codex / ChatGPT (latest state, 12 Nov 2026)
- **Preview:** `main` at merge `876d5df` (PR #15) is what Cloudflare Pages deploys to https://sb-trading.lastbenchbd.com, still behind the Cloudflare Access login. Nobody has confirmed the deployed page from inside this workflow (the login blocks it): NOT VERIFIED live.
- **Merged since 10 Nov (PRs #10, #14, #15):** photographs in depth (`assets/photodepth.js`) replacing the procedural 3D; specimen-stage opening; film 460vh with a new ending; spec drawer (Motion spring in, eased exit) and enquiry tray; phone enquiry summary; opt-in generated score with note ripples and a live meter (`assets/sound.js`); caption contrast gate; Remotion film rebuilt from the site's design system (`video/`, `tests/film-sync.mjs`); `docs/SHOTLIST.md`.
- **This branch (open PR, not merged):**
  - the film label names each shot's own source (Pexels stock or generated);
  - `tests/access.mjs`: reduced motion, keyboard path, axe-core WCAG A/AA scan (no serious or critical violations in five states, desktop and phone);
  - staged frame loading and lazy 3D setup (simulated mid-range phone: main-thread blocking about 970 ms -> about 100 ms; Lighthouse mobile performance 42 -> 57, accessibility 100, best practices 100; SEO 63 only because the draft is `noindex`);
  - the client brief's navigation (About Us, Products, Contact Us) with an About Us section built from facts already on the page;
  - a shareable address for each of the nine products (`#p-<slug>`: title, Back/Forward, direct load, no-JavaScript note).
- **Assessment:** about 8.5/10, not award level. What remains is content and owner decisions, listed under "Open items". Do not claim 10.5/10 or PASS without them.
- **To switch Rifat's AI on (owner action):** Cloudflare dashboard → Pages project `sb-trading` → Settings → Variables and secrets → add encrypted `ANTHROPIC_API_KEY` for Production → redeploy. Never set `ANTHROPIC_BASE_URL` there (test only). AGENTS.md keeps paid AI off until the owner approves spend and rate limiting. A real conversation has not been proven yet.
- **Rules that bind agents here:** AGENTS.md (no automatic merge, deploy, Access change, secret installation or publishing; failing test first; say NOT VERIFIED when evidence is missing).

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
index.html            all content (semantic; readable without JS); <body data-whatsapp="8801878707910"> is SB Trading's WhatsApp (+880 1878-707910)
styles.css            tokens (:root), stages, Rifat, form, chapter bar
site.js               film loop, Explore stage controller, 3D loader + idle logic, chapter bar, sound controller, reveals, product sheet, plain form
assets/rifat.js       Rifat on the page: AI mode (calls /api/rifat) or labelled guided mode; "Your enquiry"; WhatsApp + copy
src/rifat-fn.js       Pages Function source (Anthropic TypeScript SDK) -> functions/api/rifat.js (generated, committed; edit the source)
src/materials3d.js    3D studies (three.js r187)        -> assets/materials3d.js
src/smooth.js         Lenis re-export                   -> assets/vendor/smooth.js
assets/sound.js       tactile sound cues (lazy-loaded on the Sound press)
assets/film/{d,m}/    255 WebP frames (desktop 1280x720, phone 405x720 crop): 1-30 Pexels bamboo canopy, 31-191 generated bamboo-to-fibre, 192-223 Pexels banana leaves, 224-255 generated bamboo -> fibre -> yarn ball + bark sheet (owner's Gemini clip 65bdd3ff, 3.4-6.0 s only: its HUD, fake 'spec drawer' with invented MOQ/grade and a wrong WhatsApp number are excluded). Do NOT use gemini_generated_video_9f29a4ec (owner withdrew it).
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
CHROMIUM_PATH=<chrome> npm test                          # 158 checks: tokens, copy/nav, film sync, Rifat AI (simulated API), score, contrast, accessibility (axe), smoke on desktop + phone (incl. opening studio, label, dust, spec drawer)
node <impeccable skill>/scripts/detect.mjs --json index.html   # Impeccable detector: 10 findings, all documented intent
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
- **Current canonical production deployment:** Pages deployment `0621ce84-960a-4ea6-9845-9b3a310da9e2` (`https://0621ce84.sb-trading.pages.dev`) from `main` commit `d5e765318a356a339613c6e78ff3fbf1a27ff0cc` completed every stage successfully. It is the active canonical deployment for `sb-trading.lastbenchbd.com`. Earlier PR #3 merge commit `c94bcf3a32e4b51efbcbd348ae803da51a8f3146` also deployed successfully; PR #4 subsequently replaced it with the current cinematic rebuild. Deployment success does not prove public reachability or commercial readiness.
- **Public reachability:** fresh unauthenticated GETs to `https://sb-trading.lastbenchbd.com`, `https://sb-trading.pages.dev`, and the canonical deployment hostname all return HTTP 302 to `lastbenchbd.cloudflareaccess.com/cdn-cgi/access/login/...`; each response includes `www-authenticate: Cloudflare-Access`.
- **Access root cause:** Cloudflare account application `All Workers` (`b7281231-8adb-412c-a513-45a770dc9427`) has destination `{type: all_workers}` and an allow policy named `Cloudflare account members`. There is no SB Trading-specific Access application in the account or zone. The global application is the verified gate. Do not delete or weaken it to expose one site.
- **Rifat / enquiry readiness:** the Pages project's production `env_vars` are empty; `ANTHROPIC_API_KEY` is not configured, so Rifat remains in guided mode. WhatsApp +880 1878-707910 is configured (owner, 10 Nov 2026): a ready enquiry opens WhatsApp with the text filled in; the page itself sends or stores nothing. This is still a client-review draft, not a production-ready commercial funnel.
- **Hosted CI failure on current `main`:** run `42763891793` for `d5e7653` completed with failure. `npm ci`, `npm run build`, and Playwright installation passed; `npm test` failed two desktop checks: (1) focus after “Ask Rifat” was checked after a fixed 3.5-second sleep; (2) 3D studies continued drawing after input stopped (80 draw calls in the 2-second measurement window). The same focus flow passed locally, indicating a timing-sensitive test rather than a confirmed user-facing focus defect.
- **3D idle root cause:** `site.js` kept calling `studies.render()` while `src/materials3d.js` returned `settling=true`. The material transition used frame-time easing capped at 0.1 seconds; on slow/software WebGL it could keep the page rendering for several seconds after the visitor stopped. Current repair adds a `settle` mode: after one second without input, the next frame snaps family visibility and camera position to their final values, returns `settling=false`, and lets the loop stop. The canvas exposes `data-render-state` (`active`, `idle`, `offscreen`) for deterministic verification.
- **Regression coverage:** the focus test now waits for the actual `#rifatInput` focus (10-second ceiling) instead of a fixed sleep. The desktop test waits for the explicit idle state, confirms zero additional draw calls, triggers a viewport resize, and verifies a fresh render followed by a return to idle.
- **Local verification on this repair branch:** `npm run build` passed; `npm test` passed all 36 desktop/phone assertions on macOS 12.7.6 / Chrome 150 with software WebGL. `npm ci` completed with zero reported vulnerabilities. Hosted CI for this repair branch is still pending.
- No Cloudflare Access, DNS, credentials, production permissions, or deployment settings were changed during this repair.
- Not verified: real GPU / real phone performance, screen-reader pass, human listening test, Rifat with a real key, WhatsApp delivery, and production commercial acceptance.

## Self-healing knowledge and incident runbook

### Incident: SB Trading receives a Cloudflare Access login instead of the showroom
**Observed 10 Nov 2026 from an unauthenticated request on `LASTBENCH.local`:**
- Canonical domain, Pages hostname, and current deployment hostname all return HTTP 302 to Cloudflare Access login.
- `www-authenticate: Cloudflare-Access` confirms the response is an Access challenge.
- Cloudflare account application `All Workers` targets all Workers and allows Cloudflare account members. No SB Trading-specific Access application exists.
- **Verified root cause:** account-level `All Workers` Access is the gate. Do not delete or weaken this global application to fix one site.

### Separate controls — do not conflate them
- The zone has an `AI Crawl Control - Block AI bots by User Agent` firewall rule that blocks named crawlers, including Googlebot and AI crawlers. It is not the cause of the human-facing Access redirect. Review it separately only if the owner approves a public/indexable launch.
- The current page explicitly says client-review draft, has `noindex,nofollow`, says the enquiry is not sent or stored, and has contact placeholders. `PRODUCT.md` and this handoff also mark company facts and contact channels as unconfirmed. A public Access exception alone would not make this a production-ready commercial site.
- No SB Trading enquiry recipient or contact details for the intended Rifat assistant were confirmed in the connected Gmail / Contacts searches. Do not invent an enquiry destination.

### Access decision gate — owner decision required
Keep the global `All Workers` policy intact. Choose the intended audience before changing Access:
1. **Client review only:** create a hostname-specific Access application for `sb-trading.lastbenchbd.com` that allows only confirmed reviewer email addresses. Keep `sb-trading.pages.dev` and deployment URLs protected.
2. **Public launch:** only after content and commercial readiness are approved, create a hostname-specific public/bypass application for `sb-trading.lastbenchbd.com` only. Keep the Pages platform hostname and previews protected.
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
1. **SB Trading's own footage and photographs:** run `docs/SHOTLIST.md` (two days: location at dusk, then studio). Every film shot is currently Pexels stock or generated and says so on screen. Stock sources (Pexels licence): videos 40042753 (bamboo), 37009850 (banana leaves).
2. **Owner content:** email and phone (WhatsApp +880 1878-707910 is live); origin, minimum order, shipping terms, lead times, certifications; confirmed product names, grades and per-product photos (banana bark and woven mats have none; "Ski poles" is an unverified label). Approval of the derived light logo. About Us states only what the page already said; extend it only with facts SB Trading confirms.
3. **Rifat AI key (owner decision on spend first):** add `ANTHROPIC_API_KEY` in Cloudflare (steps above), then test five real buyer conversations, including attempts to get prices or a confirmed order (Rifat must refuse and hand to the team). Add rate limiting per IP (Cloudflare WAF rule on `/api/rifat`) before any public launch.
4. **Owner's ten-minute check on a real phone (nothing here is verified on a real device):**
   - the film scrubs smoothly with the thumb and each caption is readable;
   - Explore: the three arches respond and a product opens from the bottom and closes cleanly;
   - open a product, copy the address from the browser, send it to yourself on WhatsApp and open it: the same product must open;
   - press Sound with headphones: the music is pleasant and never louder than the cues; press again and it stops;
   - Rifat: build an enquiry and press "Send on WhatsApp": the message arrives filled in on +880 1878-707910;
   - with a screen reader (TalkBack or VoiceOver) the page reads in order and Rifat's replies are announced.
5. **Product pages:** each product has a shareable address that opens its drawer. The acceptance review also asks for core product information without JavaScript and a distinct title on first load; the no-JavaScript note is printed beside each product, but separate static product pages do not exist. Decide whether they are needed once specs are confirmed.
6. **Public launch (owner decision):** removing Cloudflare Access, `noindex`, the "client review draft" wording and the Remotion film's draft notice all wait for items 1 to 4. Remotion licensing: free for individuals and companies of up to three people; larger companies need a company licence.
7. Keep DESIGN.md in step with styles.css (the token gate enforces values); re-run `/impeccable critique` after each design pass (detector: 10 findings, documented intent).

## Related project
MutualBD voyage (a separate client): see `lets-colab/letscolab`, `projectx/clients/mutualbd/voyage/HANDOFF_CODEX.md`. Do not mix the two clients' content.
