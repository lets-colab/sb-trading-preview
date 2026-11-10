# sb-trading-preview
SB Trading — Materials in Motion | client review draft (non-production, `noindex`).

- `index.html`, `styles.css`, `site.js`: the scroll-led showroom (Arrive → Discover → Transition → Explore → Enquire).
- `assets/film/{d,m}/`: 173 WebP frames scrubbed by scroll (desktop 1280×720, phone 405×720 crop). Cut from two generated clips; segments with AI-baked text were removed. The film does not show SB Trading's own stock.
- `assets/img/`: the SB Trading logo and the real product photographs from the first draft. Banana bark has no photograph yet (leaves image shown, labelled).
- `assets/vendor/`: Motion 12 (MIT) and self-hosted fonts (Gloock, Schibsted Grotesk; OFL), three.js and Lenis (MIT, bundled). No external requests.
- `src/grove.js` → `assets/grove.js` (`npm install && node build.mjs`): the real-time 3D grove (three.js r187, MIT), loaded after first paint; a bamboo grove flown through on scroll, golden fibre strands braiding into one thread. No WebGL or context loss: a still photograph. Reduced motion: a still frame.
- `assets/sound.js`: opt-in spatial sound, loaded only when the visitor presses Sound. All synthesised (no audio files): wind and leaves, bamboo knocks placed on the side each stalk passes, fibre swishes crossing in front, wooden interface clicks. Pauses when off or hidden.
- Desktop extras (fine pointer, motion allowed): Lenis smooth scrolling (MIT, `assets/vendor/smooth.js`); a golden thread on the right edge fills with page progress.
- `v1/`: the previous single-file draft, kept unchanged.
- Enquiry form is preview-only: nothing is sent or stored.
- Not used from the AI drafts: invented specifications (tensile grades, HS codes, moisture, lead times, Incoterms, certifications) and pricing. Add them only after SB Trading confirms.
- `video/`: the SB Trading brand film in Remotion (React), 15 s, 16:9 and 9:16, built from the real logo and product photographs. `cd video && npm install && npm run render` writes `video/out/*.mp4` (set `REMOTION_BROWSER` to a local Chromium headless shell where downloads are blocked). Edit live with `npm run studio`.
