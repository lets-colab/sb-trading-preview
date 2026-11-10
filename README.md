# sb-trading-preview
SB Trading — Materials in Motion | client review draft (non-production, `noindex`).

- `index.html`, `styles.css`, `site.js`: one continuous blue-hour scroll story in five stages (Arrive → Discover → Transition → Explore → Enquire), with a chapter bar along the bottom.
- `assets/film/{d,m}/`: 252 WebP frames scrubbed by scroll (desktop 1280×720, phone 405×720 crop). Cut from three generated clips (bamboo → fibre → wound yarn); segments with AI-baked text or mock interfaces were removed. Labelled on the page as generated, not SB Trading's own stock.
- Explore stage: one pinned stage, three families. Each family's real photographs sit in an arched window that wipes in and tilts in 3D with the pointer; the blurred photo fills the background.
- `src/materials3d.js` → `assets/materials3d.js`: real-time 3D studies (three.js r187, MIT) of each family — bamboo culms, a cross-wound banana fibre spool with loose strands, curled bark with a leaf — plus drifting fibre motes. Procedural, no downloaded models; labelled "3D visual study, not a product photo". Draws only while the visitor scrolls or moves the pointer. No WebGL2, reduced motion or context loss: photographs only.
- `assets/rifat.js` + `src/rifat-fn.js` → `functions/api/rifat.js`: Rifat, the enquiry assistant. With the Cloudflare Pages variable `ANTHROPIC_API_KEY` set, the Pages Function answers with Claude and records enquiry fields; without it (or on a local server) Rifat runs as a labelled guided enquiry. The finished enquiry goes to SB Trading on WhatsApp once `data-whatsapp` on `<body>` holds the number; until then it can be copied.
- `assets/sound.js`: opt-in tactile sound, loaded only when the visitor presses Sound. Synthesised cues, no background bed: a hollow bamboo knock per family, a fibre brush on product hover, a soft chime when Rifat replies, a pluck when a message is sent.
- `assets/img/`: real product photographs; `sb-logo*.webp` and `sb-mark*.webp` are the original SB Trading logo with its white background removed (`-light` = the same mark knocked out to Cloud White for dark grounds; derived from the owner's file, awaiting approval).
- `assets/vendor/`: Motion 12, Lenis (bundled) and self-hosted fonts (Gloock, Schibsted Grotesk; OFL). No external requests from the page.
- The plain quotation form (under "Prefer a form?") works without Rifat and without JavaScript submission; it fills the same enquiry.
- `v1/`: the first single-file draft, kept unchanged.
- Build and test: `npm ci`, `npm run build`, `npx playwright install chromium`, `npm test` (35 checks, desktop + phone). Set `CHROMIUM_PATH` where Playwright cannot install its own browser. GitHub Actions runs the same on pull requests and pushes to `main`; it does not deploy.
- Operational notes, open items and the Access decision gate: `HANDOFF_CODEX.md`.
- Not used from the AI drafts: invented specifications, certifications and pricing. Add them only after SB Trading confirms.
- `video/`: the Remotion brand film (15 s, 16:9 and 9:16). `cd video && npm install && npm run render`.
