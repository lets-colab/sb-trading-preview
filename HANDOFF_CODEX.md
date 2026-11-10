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
- `tests/smoke.mjs`: 18/18 passing (no console errors, no external requests, no overflow, no audio before the Sound press, form validation, dialog focus, idle grove).
- Detector: 0 findings. Impeccable design review: 28/40 before the last P2 fixes.
- Not verified: how it looks on a real GPU or real phones; frame rate on a mid-range phone; screen-reader pass; a human listening test of the sound; the live Cloudflare deployment (behind Access, so not viewable from the build session).

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
