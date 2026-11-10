# Handoff: SB Trading website (for Codex / ChatGPT), 10 Nov 2026

Read this file, then `PRODUCT.md` (brand and product brief) and `README.md` (file map). This repo is the SB Trading client-review site.

## State in one paragraph
A scroll-led showroom for SB Trading (bamboo, banana fibre yarn, banana bark and leaves; nine products). Static HTML/CSS/JS, no framework, no external requests. A scroll-scrubbed film, a short real-time 3D bamboo grove, a materials section with real photographs, "How ordering works", a quotation form (preview only: nothing is sent), contact placeholders, opt-in spatial sound, and a Remotion brand film project in `video/`. It is a client-review draft, not a live commercial site.

- Live address: https://sb-trading.lastbenchbd.com (DNS on Cloudflare, behind a Cloudflare Access login, so only approved people can open it). The repo is built from `main` (`_headers` is a Cloudflare Pages file; `CNAME` is also present).
- Branch for work: `claude/dreamy-turing-gwgukx`. After a PR merges, restart the branch from the latest `origin/main` before adding new commits.
- Quality bar: Impeccable critique scored 22/40, then 28/40 ("Good", no P0 or P1), detector 0 findings. The six P2 findings from the second critique were fixed afterwards but not re-scored.

## Hard rules (the owner's constraints; keep them)
1. **No invented company facts.** Names, grades, specs, prices, lead times, origin, minimum order, certifications and contact details come from SB Trading only. Anything unconfirmed is shown as "to be confirmed", never made up. (The early AI drafts invented tensile grades, HS codes, "100% certified" and a $200 price; none of that is used.)
2. **Real photographs only for products.** There is no photo of banana bark or woven mats yet; the rows say so. Label any generated or illustrative image as such.
3. **Sound is opt-in** (no autoplay). Every immersive layer (film, 3D, sound, smooth scroll) must have a reduced-motion and no-JavaScript path.
4. **Self-hosted only:** no CDNs, fonts or analytics from third parties.
5. **WCAG 2.2 AA.** No logo or wordmark redrawing: use `assets/img/sb-trading-logo.png` as is.
6. Do not deploy to a new place, add paid services or keys, or change DNS without the owner's approval. Never put secrets in the repo or in chat.
7. Never claim a pass without evidence (run the checks below).

## Files
```
index.html          all content (semantic; readable without JS)
styles.css          tokens (:root), layout, sections, form
site.js             film (WebP frames on a canvas), grove loader, loop, sound controller, reveals (Motion), menu, product dialog, form validation
src/grove.js        three.js source for the 3D grove  -> assets/grove.js  (npm install && node build.mjs)
src/smooth.js       Lenis re-export                    -> assets/vendor/smooth.js
assets/sound.js     spatial sound engine (hand-written ES module, lazy-loaded on the Sound press)
assets/film/{d,m}/  173 WebP frames (desktop 1280x720, phone 405x720 crop)
assets/img/         logo + five real product photographs
assets/vendor/      Motion 12, Lenis, three.js licence, fonts (Gloock, Schibsted Grotesk; OFL)
video/              Remotion project: 15 s brand film, 16:9 and 9:16 (cd video && npm install && npm run render)
tests/smoke.mjs     browser smoke test
v1/                 the first single-file draft, kept unchanged
PRODUCT.md          Impeccable brief (register: brand)
```

## Commands
```bash
npm install && node build.mjs                      # rebuild assets/grove.js and assets/vendor/smooth.js after editing src/
NODE_PATH=$(npm root -g) node tests/smoke.mjs      # 18 checks, desktop + phone (needs playwright + chromium)
node .claude/skills/impeccable/scripts/detect.mjs --json index.html   # Impeccable detector (if the skill is installed), expect []
cd video && npm install && REMOTION_BROWSER=<path to chrome-headless-shell> npm run render   # writes video/out/*.mp4 (not committed)
```

## How it works (essentials)
- **Film:** `#film` is 340vh with a sticky stage. `site.js` maps scroll progress to a frame, drawn on a canvas; beats are `.beat[data-at="a,b"]` (progress ranges). Frames load coarse to fine.
- **Grove:** `#grove` (200vh). `loadGrove()` skips 3D on phones (<700px), without WebGL or on context loss (class `no-3d` shows a photograph). The grove stops drawing after 1 s without scroll or pointer movement.
- **Sound:** `#soundToggle` creates the AudioContext inside the click; `assets/sound.js` loads then. Engine calls are wrapped so a failure goes quiet. Levels were measured offline (peak -7 dBFS) but never heard by a person.
- **Form:** `#enquiryForm` validates inline (`check()` in `site.js`); required: product, name, email, country; quantity must be above zero. Submit only builds a text summary; nothing is transmitted.
- **Reveals:** Motion `inView` animates from a visible default (never hides content first).

## Verified (10 Nov 2026)
- Production Pages deployment `48347cc7-27ee-4568-8eb6-d8e58db4f36c` completed successfully from `main` commit `d1b126dea5a0e7de561cbec1a783186904883f47`; this proves deployment completion, not public readiness.
- Pages custom domain `sb-trading.lastbenchbd.com` is active; DNS CNAME points to `sb-trading.pages.dev` and is proxied.
- Fresh local build: `npm run build` passed.
- Fresh browser smoke suite: 18/18 checks passed on macOS 12.7.6 / Chrome 150 using software WebGL. Desktop and phone checks covered validation, focus, audio opt-in, no external requests, no console errors, overflow, and idle grove rendering.
- Playwright's bundled Chromium installer does not support this Mac's macOS 12.7.6. `tests/smoke.mjs` now accepts `CHROMIUM_PATH`; CI installs its own Chromium on Ubuntu.
- GitHub Actions quality workflow is configured to run build + browser smoke tests on PRs and pushes to `main`; it is not a deployment workflow. Its first hosted run is still pending.
- Not verified: real GPU / real phone performance, screen-reader pass, human listening test, production form delivery, Rifat assistant, and production commercial acceptance.

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
1. **Owner content:** real contact channels (email, phone, WhatsApp), origin, minimum order, shipping terms, lead times, certifications; confirmed product names, grades and per-product photos (banana bark and woven mats have none; "Ski poles" is an unverified label). The owner also promised five more photos that never arrived as files; two looked AI-generated and need an "illustrative" label.
2. **Rifat, the AI assistant** (the owner's stated success goal: a buyer talks to Rifat, who answers questions and prepares enquiry or order requests). Always present as an AI; never confirm price, stock, lead time or an order itself; hand commitments to a person; the plain form must keep working without it. Needs owner decisions before any code: AI provider and who pays, a server-side function (e.g. Cloudflare Pages Functions) so no key is in the page, and where enquiries go (email or WhatsApp). Plan with `/impeccable shape Rifat assistant` first.
3. Send real enquiries (email routing); then add the analytics events from the telemetry plan (privacy-first, no form contents, cookieless) once the owner picks a tool.
4. Write `DESIGN.md` for the bold, cinematic direction (`/impeccable document`).
5. Re-run the Impeccable critique after the last fixes; open critique items: dark first frame, flat low-poly grove next to real footage, product dialogs carry little until real specs exist.
6. Replace or label generated film and grove before client use; consider real SB Trading footage.
7. Check on a real phone and with a screen reader; listen to the sound on headphones and laptop speakers.
8. Remotion film: the MP4s were sent to the owner but are not committed; re-render from `video/`. Add music only with a licensed or generated track.

## Related project
MutualBD voyage (a separate client): see `lets-colab/letscolab`, `projectx/clients/mutualbd/voyage/HANDOFF_CODEX.md`. Do not mix the two clients' content.
