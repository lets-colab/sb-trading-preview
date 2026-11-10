# SB Trading — Claudex immersive UI/UX acceptance review
**Recorded:** 10 Nov 2026 · **Baseline:** `d5e765318a356a339613c6e78ff3fbf1a27ff0cc` (merged PR #4)  
**Status:** SOURCE-BASED REVIEW / NOT VISUALLY ACCEPTED. This is not a runtime, deployment, paid-provider, or human usability-test certificate.

## Source authority
- `PRODUCT.md`: buyer, brand, product purpose and truthful claims.
- `HANDOFF_CODEX.md`: dated implementation/deployment evidence, commands, approvals and incident boundaries. Its historical results are not fresh test receipts.
- `index.html`, `site.js`, `assets/rifat.js`, `src/materials3d.js`, `src/rifat-fn.js`, `tests/smoke.mjs`: current implementation.
- Owner/client brief: original **About Us · Products · Contact Us** navigation; nine independently addressable product detail pages; the actual original logo; three material families; a buyer enquiry path. Treat unconfirmed product names and grades as pending.

## Protected good work — KEEP
- Claude's five-part story, real product-photo framing, 252-frame scroll film, three real-time material studies, safe guided-mode Rifat, opt-in tactile sound, keyboard and no-WebGL/reduced-motion fallbacks.
- Preserve the existing 35-check smoke suite; expand it with negative tests before changing working behavior.
- No second site architecture, second chatbot, replacement memory, new paid dependency, automatic provider activation, DNS, Access, merge or deployment.

## Observed gaps — priority and discriminating checks
| Priority | Observed source state | Smallest reviewable correction | Evidence needed |
| --- | --- | --- | --- |
| P1 · client navigation | `index.html` main nav is **Materials · How ordering works · Enquire**, not client's **About Us · Products · Contact Us**. | Restore three requested top-level labels and actual destinations. Keep `How ordering works` as a secondary page section and `Ask Rifat` as a CTA. An About Us section must use approved facts only. | Browser links work at desktop/mobile, keyboard + back; logo returns Home. |
| P1 · nine shareable products | Nine buttons currently open one `#productSheet` dialog. No nine independent product URLs verified in source. | Add one reusable, accessible product template with nine direct routes (static pages or equivalent rewrites) without losing fast quick-view or Rifat preselection. Keep unapproved specs labelled. | Each product URL opens directly, reloads, supports back/forward, has a distinct title, can start an enquiry, and works without JavaScript for core information. |
| P1 · quote semantics | Guided Rifat and form prepare a summary; WhatsApp is disabled without the approved client number. | Preserve this honest state; no faux sent/success messages. Add real delivery only after verified destination, privacy notice, consent and a delivery receipt. | No sending in demo; missing-contact and provider-outage flows are visible and recoverable. |
| HOLD · paid AI | `src/rifat-fn.js` selects a paid Claude model; API secret is not yet enabled per handoff. | Do not activate paid AI by default. Before any secret/deploy, document owner-approved spend ceiling, rate limiting, abuse protection, data handling and provider fallback. Keep no-key guided mode. | Cost/limit decision and explicit approval; tests for 503, 403, invalid input, 429 and model outage. |
| P2 · cinematic QA | PR #4 implements 3D material studies and 252 frames, but GPU/real-device visuals, a screen-reader pass and sound listening remain unverified. | Inspect actual scene transitions and first frame, then tune only demonstrated defects. Compare against the client's cinematic brief, not generic dashboard templates. | Paired 1440/390/320 screenshots/video of first frame, each family, CTA, forms, fallback; real phone GPU and screen-reader results separately. |
| P2 · source drift | PR #4 description mentions **279** film frames; `site.js`, `README.md` and handoff say **252**. Open PR #5 tests the removed grove. | Confirm frame inventory; correct one outdated source of documentation. Determine if PR #5 is superseded by materials3d before considering its merge. | Source file count, `FRAMES` and test output agree; no stale grove regression merged accidentally. |

## Two routes to the same buyer outcome (DR.X IGLOO)
- **Story path:** Arrive → Discover → Transition → Explore → Enquire. Camera movement earns its cost only if it helps understand bamboo/fibre/bark. No 3D decoration masking prices/specs that are not confirmed.
- **Direct path:** On first paint show `Products` and `Request a quotation / Ask Rifat` without forcing 620vh film + 420vh Explore scrolling. Deep-link straight to each product and maintain selected product into enquiry.
- Both paths must reach the same nine products, company identity, and enquiry functionality; on no-JS, reduced-motion, WebGL failure, or 320px mobile nothing essential disappears.

## Visual direction, locked to SB Trading
Architectural-white and the supplied blue identity, tactile bamboo tube interiors, believable split grain, banana fibre wisps and spool, green leaves, restrained dimensional lighting; large editorial type and confident composition. Use authentic client photos only where grade/product matches are defensible. Generated film and 3D studies remain explicitly labelled. Do **not** use decorative globes, sci-fi HUDs, generic eco icon walls, needless glass panels, fake numbers or AI-redrawn logo.

## Claude × Codex × Superpowers implementation sequence
1. Capture existing screenshots and exact main SHA. Treat new renders as proof only of those states, never of production health.
2. For one gap at a time: reproduce a failing functional check; implement the smallest patch; run focused check; run full `npm ci && npm run build && npm test`.
3. Claude leads original art direction and scene composition; Codex reviews navigation/state/semantics/performance. This is a suggested division, not confirmation either agent is running.
4. Review source and paired before/after screenshots separately; check desktop, 320/390 touch, keyboard, no-JS, reduced motion, no-WebGL, first-frame network errors and 3D context loss.
5. Deliver a draft PR and exact evidence table: BUILT / TESTED / NOT PROVEN / BLOCKED. Owner reviews visual result. Do not merge/deploy/activate paid model or change Access without explicit current approval.

## Quality gate — not a self-awarded 10.5/10
**Reject** critical misinformation, wrong/missing navigation, inaccessible product paths, form that claims sending without transport, unapproved original-logo alteration, unsupported performance claims, or regression of the guided fallback. A build that merely compiles or passes old smoke tests cannot pass the complete visual/interaction gate. Track real-device FPS and memory as measurements, not assumed targets.
