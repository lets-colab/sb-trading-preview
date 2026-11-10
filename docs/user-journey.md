# User journey: overseas buyer → enquiry (SB Trading preview)

Built from PRODUCT.md and the shipped page on 10 Nov 2026. No buyer research has been done yet: phases, feelings and timings below are assumptions to test with real buyers, not findings.

**Persona:** a procurement manager or importer outside Bangladesh, often on a phone, often not a native English speaker, comparing several natural-fibre suppliers.
**Job:** find the right material, judge whether SB Trading is a serious exporter, and start a quotation conversation with minimum effort.
**Trigger:** a referral link, a trade contact or a search result for bamboo or banana fibre suppliers.

## Current-state journey

| Phase | Action | Touchpoint | Thinking | Feeling | Pain points | Time |
|---|---|---|---|---|---|---|
| Awareness | Opens the link from a referral or search | Phone browser, then Cloudflare Access login (review stage only) | "Is this a real exporter?" | Neutral → wary | Today the site is behind a login: a cold buyer cannot open it at all (owner decision pending) | seconds |
| Arrive | Sees "Materials in Motion", the logo, the bamboo canopy | Film, stage 01 | "Looks serious. What do they sell?" | Curious | The lede names the three families, but there is no immediate shortcut to a product for a buyer in a hurry, other than "Skip to the materials" for keyboard users and the menu | 3–10 s |
| Discover / Transition | Scrolls the film: bamboo, fibre, poles, split cane, banana leaves, weaving | Film stages 02–03 | "Nice. Is this their factory?" | Engaged, then possibly impatient | 680vh of film before the products; the film is labelled generated plus stock, so it does not prove SB Trading's own operation | 30–90 s |
| Explore | Picks a family card or keeps scrolling; opens a product sheet | Glass family cards, Explore stage, product sheet | "Do they have what I need, at what grade?" | Hopeful | No specifications, sizes or grades yet (owner content pending); "Ski poles" is unverified | 1–3 min |
| Enquire | Talks to Rifat or opens the form | Rifat (guided mode today), "Your enquiry", "Prefer a form?" | "Can I just ask my question?" | Reassured if it is quick | Rifat is not AI yet (no key), so free questions get the guided path; WhatsApp is disabled until the number is confirmed, so the only exit is "Copy enquiry" | 1–2 min |
| Resolution | Copies the enquiry and has nowhere to send it | — | "Where do I send this?" | Frustrated | **Peak pain:** no published email, phone or WhatsApp yet | — |
| Return | Comes back later | Same link | "Did they reply?" | — | Nothing was sent, so there is nothing to reply to | — |

## Moments of truth

- **Make-or-break:** the first 5 seconds (does it look like a serious exporter?) and the moment the enquiry is ready (can it actually reach SB Trading?).
- **Peak pain:** the enquiry has no destination until SB Trading confirms its WhatsApp number or email.
- **Moments that work:** the opening film and logo; the three family cards; Rifat's "Your enquiry" card filling in as the buyer answers; the product sheet's "Ask Rifat about this product".

## Desired-state journey

| Phase | Action | Design opportunity | Metric |
|---|---|---|---|
| Awareness | Opens a public link | Owner approves a public launch: hostname-specific Access exception (HANDOFF_CODEX.md) | Visits from referrals reach the page (no login) |
| Arrive | Understands the offer in one screen | Keep the lede; add a visible "See the products" shortcut beside "Scroll to explore" for buyers in a hurry | % who reach Explore within 30 s |
| Discover | Watches as much film as they like | Real SB Trading footage replaces generated/stock clips | Scroll depth through the film |
| Explore | Finds their product and its basics | Confirmed names, grades, sizes and one photo per product | Product sheets opened per visit |
| Enquire | Asks Rifat a free question, gets an honest answer, sends the enquiry | ANTHROPIC_API_KEY set; WhatsApp number set; email fallback | Enquiries sent (WhatsApp opens), Rifat conversations started |
| Resolution | Receives a reply from a person at SB Trading | Team response routine on WhatsApp | Time to first human reply |

## Gap analysis

| Phase | Current | Desired | Gap | Priority |
|---|---|---|---|---|
| Awareness | Behind Access login | Public link | Owner's Access decision | High |
| Resolution | Copy only, no destination | WhatsApp hand-off live | WhatsApp number / email from SB Trading | High |
| Enquire | Guided mode only | AI answers + guided fallback | API key in Cloudflare | High |
| Explore | Names only, no specs | Confirmed specs and photos | Owner content | High |
| Arrive | Long film before products | Visible product shortcut | Small design change | Medium |
| Discover | Generated and stock footage | Real SB Trading footage | Owner footage | Medium |
