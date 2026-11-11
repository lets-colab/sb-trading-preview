# SB Trading combined review — 11 Nov 2026
**Source:** Claude PR #10 head `562fdd2e9f5c25b48bf74c4422abe7e670973985` + staged client navigation and nine static product routes. **Status:** REVIEW ONLY / NO DEPLOYMENT.
The original cinematic film, procedural 3D studies, tactile opt-in sound, approved assets, reduced-motion fallbacks, product sheets, real WhatsApp number and Claude's multi-product Rifat remain preserved.
- Navigation: About Us / Products / Contact Us with truthful information.
- Direct links: `products/<slug>/index.html` for each of nine material products; links work without JS. With JS a quick-view dialog opens, and it links to the full page.
- Product page → `?product=<label>#enquire` → whitelisted catalogue selection → Rifat `setEnquiry({product})` merges into its products list.
- No invented product grades/specifications; unverified photos and the 'Ski poles' label are disclosed.
- Combined tests: `npm run build && npm test` including token, navigation, direct routes, simulated Rifat AI and desktop/mobile browser smoke.
**Acceptance gates:** Exact-head hosted CI; separate rendered visual desktop/phone audit; keyboard/screen reader/reduced motion/no-JS/no-WebGL; approved source photographs and brand mark; owner-approved paid model/privacy; owner-approved Cloudflare public access and production rollout. Do not merge, deploy, add keys or change DNS/Access automatically.
