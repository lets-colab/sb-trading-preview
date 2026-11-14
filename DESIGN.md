---
name: SB Trading
description: Materials in Motion. A blue-hour showroom for bamboo, banana fibre yarn and banana bark and leaves.
colors:
  blue: "#004a98"
  blue-glow: "#1d64b3"
  ink-0: "#051222"
  ink: "#081c31"
  ink-2: "#102a43"
  ink-3: "#173a5c"
  cloud: "#f3f8fc"
  mist: "#dbeaf6"
  fibre: "#d7be93"
  fibre-2: "#e7d6b6"
  fibre-3: "#a8875a"
  dim: "#dbeaf6b8"
  faint: "#dbeaf699"
  line: "#d7be9333"
  line-2: "#dbeaf61f"
  glass: "#0c2440c7"
typography:
  display:
    fontFamily: "Gloock, Georgia, serif"
    fontSize: "clamp(58px, 9.4vw, 140px)"
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Gloock, Georgia, serif"
    fontSize: "clamp(42px, 6.4vw, 96px)"
    fontWeight: 400
    lineHeight: 0.96
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Gloock, Georgia, serif"
    fontSize: "clamp(40px, 5.2vw, 84px)"
    fontWeight: 400
    lineHeight: 0.96
    letterSpacing: "-0.015em"
  subhead:
    fontFamily: "Gloock, Georgia, serif"
    fontSize: "clamp(26px, 2.4vw, 34px)"
    fontWeight: 400
    lineHeight: 1.1
  body:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
  lede:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "clamp(17px, 1.35vw, 20px)"
    fontWeight: 400
    lineHeight: 1.6
  ui:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1
  label:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.14em"
rounded:
  r-sm: "12px"
  r-md: "20px"
  r-lg: "28px"
  r-pill: "999px"
spacing:
  gutter: "clamp(16px, 4vw, 64px)"
components:
  button-primary:
    backgroundColor: "{colors.fibre}"
    textColor: "{colors.ink-0}"
    typography: "{typography.ui}"
    rounded: "{rounded.r-pill}"
    padding: "0 26px"
    height: "50px"
  button-primary-hover:
    backgroundColor: "{colors.fibre-2}"
    textColor: "{colors.ink-0}"
  button-small:
    backgroundColor: "{colors.fibre}"
    textColor: "{colors.ink-0}"
    rounded: "{rounded.r-pill}"
    padding: "0 18px 0 8px"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.cloud}"
    rounded: "{rounded.r-pill}"
    padding: "0 26px"
    height: "50px"
  button-disabled:
    backgroundColor: "#dbeaf61a"
    textColor: "{colors.faint}"
    rounded: "{rounded.r-pill}"
  product-chip:
    backgroundColor: "#05122266"
    textColor: "{colors.cloud}"
    rounded: "{rounded.r-pill}"
    padding: "0 18px"
    height: "46px"
  product-chip-hover:
    backgroundColor: "{colors.fibre}"
    textColor: "{colors.ink-0}"
  reply-chip:
    backgroundColor: "#05122266"
    textColor: "{colors.cloud}"
    rounded: "{rounded.r-pill}"
    padding: "0 14px"
    height: "40px"
  message-rifat:
    backgroundColor: "#13355a"
    textColor: "{colors.cloud}"
    rounded: "18px"
    padding: "12px 16px"
  message-user:
    backgroundColor: "{colors.fibre}"
    textColor: "{colors.ink-0}"
    rounded: "18px"
    padding: "12px 16px"
  input-field:
    backgroundColor: "#05122299"
    textColor: "{colors.cloud}"
    rounded: "{rounded.r-sm}"
    padding: "10px 14px"
    height: "48px"
  chat-panel:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.cloud}"
    rounded: "{rounded.r-lg}"
  sheet:
    backgroundColor: "{colors.ink-2}"
    textColor: "{colors.cloud}"
    rounded: "{rounded.r-lg}"
    width: "min(920px, calc(100vw - 32px))"
---

# Design System: SB Trading

Version: 1.0.0 (10 Nov 2026)

Changelog: 1.0.0 (10 Nov 2026) first record, extracted from the shipped preview build (styles.css, index.html, site.js, assets/rifat.js); no rule here predates the build.

Truth notes: product names, grades, photographs and commercial terms shown on the site are not yet confirmed by SB Trading. The light logo and mark (`sb-logo-light.webp`, `sb-mark-light.webp`) are derived from the owner's file, knocked out to Cloud for dark grounds, and are pending owner approval. Nothing in this file confirms a product fact.

Citation convention: every root custom property appears with its leading double hyphen exactly once in this file, inside the token block under Colors. Everywhere else tokens and runtime custom properties are cited by bare name (`fibre`, `ink-0`, `ry`).

## Overview

**Creative North Star: "The Blue-Hour Showroom"**

One continuous dusk-blue world, lit by a single warm natural-fibre accent. The page is a dark navy ground (ink-0) under a faint blue radial glow, with real material photography and a scroll-scrubbed film doing the colour work. Interface chrome is translucent ink glass with hairline fibre borders, so the material stays the brightest thing on screen. The North Star is taken from the build's own stylesheet header ("one continuous blue-hour world") and has not been separately confirmed by the owner.

Density moves from cinematic to quiet. The opening chapters are full-viewport pinned stages with very large Gloock headlines; once the visitor reaches ordering and Rifat, the layout tightens into contained panels, pill controls and plain grotesk text. Motion is scroll-bound and pointer-bound rather than decorative looping, and every motion layer has a static document equivalent.

**Key Characteristics:**
- Dark navy ground with one warm accent (fibre); blue survives as glow and tint, not as a fill.
- Gloock display at very large clamp sizes, upright only; emphasis is colour, never italic.
- Pills and circles for every control; arches for image windows; large soft radii for panels.
- Depth from translucency, blur and long soft shadows; no hard edges or offset shadows.
- Motion gated on the `motion` class; reduced motion and no-JS read as a complete document.

## Colors

A cool blue-hour neutral ladder carrying one warm natural-fibre accent.

The token block below is the source of truth and mirrors styles.css `:root` exactly, in declaration order. Values are copied verbatim; the trailing comment is the semantic role.

```css
/* tokens: parsed by tests/tokens.mjs; one custom property per line */
--blue: #004a98;            /* Brand Blue from the proposal palette; declared, not referenced by any rule (reserve) */
--blue-glow: #1d64b3;       /* brighter Brand Blue for glow; declared, not referenced (reserve) */
--ink-0: #051222;           /* page ground; html/body background; text on fibre fills; skip link text, sheet close fill */
--ink: #081c31;             /* Deep Ink step 1; declared, not referenced (reserve) */
--ink-2: #102a43;           /* raised surface: product sheet, mobile nav panel, sound hint, select options */
--ink-3: #173a5c;           /* Deep Ink step 3; declared, not referenced (ticket gradient repeats its value as a literal) */
--cloud: #f3f8fc;           /* primary text and headings; hover/active text */
--mist: #dbeaf6;            /* Mist base; declared, not referenced (dim, faint and line-2 are its alpha steps) */
--fibre: #d7be93;           /* sole accent: primary CTA fill, em accent in headings, focus ring, active tick, lit node, user message */
--fibre-2: #e7d6b6;         /* accent hover: primary button hover fill; orb highlight */
--fibre-3: #a8875a;         /* accent shade: orb body only */
--dim: #dbeaf6b8;           /* secondary text: ledes, nav links, notes, captions (Mist at 72%) */
--faint: #dbeaf699;         /* tertiary/decorative text: disclosure labels, inactive chapters, empty ticket values, disabled text (Mist at 60%; 6.05:1 on ink-0, 4.97:1 on the ticket, passes AA) */
--line: #d7be9333;          /* fibre hairline: borders of pills, panels, sheet, ticket */
--line-2: #dbeaf61f;        /* cool hairline: inner dividers, input borders, footer rule */
--glass: #0c2440c7;         /* translucent ink panel: Rifat chat, plain form */
--display: "Gloock",Georgia,serif;                      /* display family: h1 to h3, card and step titles */
--text: "Schibsted Grotesk",system-ui,sans-serif;       /* text family: body, UI, labels */
--ease: cubic-bezier(.16,1,.3,1);       /* default easing: expo-out for state changes and entrances */
--ease-io: cubic-bezier(.65,0,.35,1);   /* in-out easing: arch clip reveal, scroll cue */
--gutter: clamp(16px,4vw,64px);         /* horizontal page inset for every section and fixed bar */
--r-sm: 12px;               /* small radius: inputs, selects, pending note */
--r-md: 20px;               /* medium radius: family cards, mobile nav panel, phone arch base */
--r-lg: 28px;               /* large radius: chat, ticket, form, sheet, desktop arch base */
--r-pill: 999px;            /* pill: buttons, nav links, chips, toggles */
--z-header: 40;             /* fixed header layer */
--z-chapters: 38;           /* fixed chapter bar layer, below header */
--z-skip: 60;               /* skip link, above everything */
```

Token count: 28 (16 colour, 2 font family, 2 easing, 1 spacing, 4 radius, 3 z-index).

### Primary
- **Natural Fibre** (fibre): the one warm voice. Fills the primary button, the send button and the user's chat bubbles; colours `em` inside headings; draws the focus ring, the active chapter tick, the progress bar, the ordering fibre-line and lit step nodes. **Fibre Light** (fibre-2) is its hover state; **Fibre Shade** (fibre-3) appears only inside Rifat's orb.

### Neutral
- **Night Ground** (ink-0): the page. Also the text colour on every fibre fill.
- **Raised Ink** (ink-2): solid raised surfaces: mobile nav dropdown, sound hint (the spec drawer is Ink Glass).
- **Ink Glass** (glass): translucent panels over the ground, always with blur and a fibre hairline.
- **Cloud** (cloud): primary text and headings.
- **Dim Mist** (dim): secondary reading text.
- **Faint Mist** (faint): disclosure labels and inactive or empty states (see contrast).
- **Fibre Hairline** (line) and **Cool Hairline** (line-2): borders and dividers; fibre for outer edges, cool for inner seams.
- **Reserve** (blue, blue-glow, ink, ink-3, mist): proposal-palette values declared at root but not referenced by any rule in the shipped build. Brand Blue reaches the screen only through literal radial glows (`#0d3a6b55`, `#0f3d6e66`) in the body and enquire backgrounds.

### Text contrast (WCAG 2.x, alpha composited over the ground)

| Text on ground | Ratio | AA normal (4.5:1) | AA large / UI (3:1) |
|---|---|---|---|
| cloud on ink-0 | 17.60:1 | pass | pass |
| dim on ink-0 | 8.28:1 | pass | pass |
| faint on ink-0 | 3.90:1 | **fail** | pass |
| ink-0 on fibre | 10.46:1 | pass | pass |
| cloud on Rifat bubble `#13355a` | 11.66:1 | pass | pass |
| error text `#f6b8a6` on ink-0 | 11.04:1 | pass | pass |
| dim on ink-2 | 6.91:1 | pass | pass |
| faint on ink-2 | 3.61:1 | **fail** | pass |

faint passes only for large text and non-text UI. In the shipped build it also sets small readable text (film and study disclosure labels at 12px, the explore note at 13px, ticket field names and empty values at 15px, inactive chapter links at 12px). That is recorded as drift, not as permission.

### Named Rules
**The One Warm Voice Rule.** fibre is the only accent. Anything actionable, active or emphasised is fibre or sits on fibre; there is no second accent hue.

**The Ink-on-Fibre Rule.** Text on a fibre fill is always ink-0, never cloud.

**The Faint Is Not Copy Rule.** faint is for non-essential decoration, disabled text, large text and non-text indicators. Text a buyer needs to read at body size or smaller uses dim or cloud.

## Typography

**Display Font:** Gloock (with Georgia, serif), self-hosted, one weight (400), no italic file.
**Body Font:** Schibsted Grotesk (with system-ui, sans-serif), self-hosted variable 400 to 900.

**Character:** a high-contrast editorial serif shouting at cinema scale over a clean, slightly condensed-feeling grotesk that stays plain and quiet in the working parts of the page.

### Hierarchy
- **Display** (400, clamp(58px, 9.4vw, 140px), 0.92, -0.015em): the single h1 in the opening beat; max 9ch.
- **Headline** (400, clamp(42px, 6.4vw, 96px), 0.96): film beat captions and section headings; beats max 13ch.
- **Title** (400, clamp(40px, 5.2vw, 84px), 0.96): material family headings; phones clamp(36px, 10vw, 52px). Sheet title clamp(32px, 3.6vw, 48px); ticket title 32px (28px on phones).
- **Subhead** (Gloock 400, clamp(26px, 2.4vw, 34px), 1.1): ordering step titles; family-card titles at clamp(22px, 2vw, 28px)/1.05; Rifat's name at 22px.
- **Lede** (400, clamp(17px, 1.35vw, 20px), 1.6, dim): intro paragraphs, max 54ch; family ledes clamp(17px, 1.3vw, 19px) at 44ch.
- **Body** (400, 17px, 1.6): base text; chat messages 16px/1.5 (15px on phones); notes and footer 14px.
- **UI** (500 to 600, 14 to 15px, line-height 1): buttons, nav links, chips, toggles.
- **Label** (600, 12px, 0.14em, uppercase): chapter bar links (11px, 0.1em on phones) and the scroll cue (0.18em).

All h1 to h3 use `text-wrap: balance`; paragraphs use `text-wrap: pretty`; `font-synthesis: none` is set on html.

### Named Rules
**The Colour Not Italic Rule.** Emphasis inside a heading is an upright `em` coloured fibre. Never italic, never synthesised; Gloock ships no italic and synthesis is off.

**The Two Voices Rule.** Gloock for anything that is a name or a statement; Schibsted Grotesk for everything a buyer operates or reads at length. No third family.

## Layout

A single scroll story in five chapters (Arrive, Discover, Transition, Explore, Enquire). Every section and both fixed bars are inset by the gutter token; html sets `scroll-padding-top: 88px` for the fixed header.

- **Film (chapters 1 to 3):** a 460vh section with a sticky 100svh stage. Scroll position is the playhead of a canvas frame sequence; beat captions sit bottom-left at `bottom: clamp(96px, 16vh, 170px)`, max-width 1000px, over a left-and-bottom ink shade. The end beat carries its own linear ink scrim (it sits over the brightest frames); `tests/contrast.mjs` holds every caption at 4.5:1 or better against the brightest footage behind it.
- **Explore:** a 420vh section with one sticky 100svh stage holding three stacked families. Each family is a two-column grid (1.05fr text / 0.95fr arch, gap clamp(24px, 5vw, 80px)). At 820px and below the arch moves above the text at 38svh.
- **Ordering:** max-width 1360px, three equal columns joined by a drawn fibre line; one column with a left rule at 820px and below.
- **Enquire:** max-width 1120px; chat and ticket in a 1.5fr / 1fr grid, single column at 900px and below. Plain form rows are two columns, one at 640px and below.
- **Breakpoints observed:** 900px (header menu, Rifat stack), 820px (explore and steps stack), 720px (chapter bar condenses), 700px (sheet stacks), 640px (family cards, form rows, messages), 520px (sound label hidden).
- **Layers:** skip link 60, header 40, chapter bar 38 (z tokens). The chapter bar fades out once the visitor is within 15% of a viewport from the end (`at-end`).

## Elevation & Depth

Depth is atmospheric: translucent ink over the ground, background blur, and long, very soft black shadows, plus a fibre glow reserved for active or warm things. There are no hard or offset shadows anywhere.

### Shadow Vocabulary
- **Deep float** (`box-shadow: 0 40px 120px #000a, 0 0 0 1px #d7be9326`): the arch window; the chat panel uses `0 40px 120px #0008`.
- **Card float** (`box-shadow: 0 20px 60px #0007, inset 0 1px 0 #ffffff1f`): family cards, with `backdrop-filter: blur(14px)`.
- **Dropdown** (`box-shadow: 0 24px 60px #0009`): mobile nav panel.
- **Accent lift** (`box-shadow: 0 12px 32px #d7be9333`): primary button hover only.
- **Fibre glow** (`box-shadow: 0 0 0 8px #d7be931f, 0 0 32px #d7be9366`): lit ordering node; the orb uses a scaled fibre glow.
- **Blur steps:** 14px (family cards), 12px (chat panel), 10px (sheet backdrop), 46px on the ambient explore photographs.

### Named Rules
**The Glass Over Ink Rule.** A floating panel is ink glass plus blur plus a hairline, never an opaque light card.

**The Warm Glow Is Earned Rule.** Fibre-tinted shadow appears only on hover or active state (button hover, lit node, orb); rest-state shadows are black.

## Shapes

Three silhouettes do all the work. Controls are full pills (r-pill) or circles (send button, family-card arrow disc, sheet close, step nodes, orb). Panels use the large radius (r-lg: chat, ticket, form, sheet); cards and the mobile nav use r-md; inputs use r-sm. The signature form is the arch: an image window with fully rounded top (999px) and r-lg bottom corners (r-md on phones), aspect 73/120. Chat bubbles are 18px with one 6px tail corner on the speaker's side. The one square-edged form is the pending note: a 2px fibre left rule with r-sm on the right corners only.

## Components

### Header
Fixed, transparent-to-ink gradient (`#051222d9` to transparent), padding 14px gutter.
- **Brand mark:** the derived light mark at 38px height with a soft drop shadow, plus "SB Trading" in grotesk 600 16px; the name hides at 900px and below. The light mark is pending owner approval.
- **Nav:** the client brief's three links, About Us, Products, Contact Us (`tests/copy.mjs` holds them); pill links, min-height 44px, 500 15px, dim; hover cloud on `#dbeaf614`.
- **Menu toggle (900px and below):** bordered pill (line hairline, `#05122299`), toggles `aria-expanded`. The nav becomes an ink-2 dropdown panel (r-md, line border, dropdown shadow) with 48px cloud links; hidden only when JS is on and it is not `open`. Escape closes and returns focus.
- **Sound toggle:** bordered pill with four 2px bars. `aria-pressed="true"` turns the border fibre and animates the bars in fibre (1.1s ease-in-out, staggered 0.18s). Label hides at 520px and below. Sound is off until pressed; the status hint below it is an ink-2 pill that hides when empty.
- **Ask Rifat:** small primary button with the extra-small orb.

### Buttons
- **Shape:** full pill (r-pill), min-height 50px, padding 0 26px, gap 10px, grotesk 600 15px.
- **Primary:** fibre fill, ink-0 text.
- **Hover / Active / Focus:** fibre-2 fill, lift -2px, accent-lift shadow, all 0.3s ease; active returns to 0. Global focus is a 2px fibre outline at 3px offset.
- **Small:** min-height 44px, padding 0 18px 0 8px (room for the orb), 14px.
- **Ghost:** transparent, cloud text, inset 1px line hairline; hover `#d7be931a` fill and inset fibre hairline.
- **Disabled (`aria-disabled="true"`):** `#dbeaf61a` fill, faint text, not-allowed cursor, no shadow or lift. Used on "Send on WhatsApp" while no number is configured or the enquiry is incomplete.

### Chips
- **Product chip:** pill, min-height 46px (40px on phones), line border, `#05122266` fill, cloud 500 15px, with a fibre "+" after the label. Hover: fibre fill, ink-0 text, lift -2px, "+" turns 90deg. Opens the product sheet.
- **Reply chip (Rifat):** pill, min-height 40px, 14px, line border, `#05122266`; hover fibre fill, ink-0 text (0.25s). Sits in a horizontally scrolling row with a right-edge fade mask; the row hides when empty.

### Family cards
Three glass cards in the last film beat (3 columns, 1 column at 640px and below as 64px rows). Ink glass gradient, `#dbeaf633` border, 14px blur, card-float shadow, r-md. Photograph masked in from the right at 62% width. Title in Gloock. Hover: lift -4px, fibre border, photo scales 1.06 (0.8s), arrow disc fills fibre.

### Arch window
The explore image frame (see Shapes). Two stacked photographs per family cross-fade with scroll progress t. Motion states, set by site.js:
- **Before (default, no class):** clipped from the bottom, `rotateY(16deg) translateZ(-140px)`, hidden.
- **On (`.on`):** clip opens over 1.1s ease-io; transform settles over 1.2s ease to the pointer tilt (ry up to ±10deg, rx up to ±7deg, from a fine pointer only); image scales 1.18 to 1.04 and drifts with t. Text children fade up 34px with 0.06s steps.
- **Past (`.past`):** clips away upward, `rotateY(-16deg) translateZ(-140px)`.
Inactive families are `inert` and hidden after 1.1s. Ambient blurred copies of the active photo fade in behind (1.2s).

### Beat captions
Film captions whose opacity and lift (up to 28px) are written per frame from scroll progress with a 0.035 fade window; invisible beats get `visibility: hidden`. Without the motion class they render as a static stack under a poster frame.

### Chapter bar
Fixed bottom bar on an upward ink gradient. Links are labels in faint with a 14px tick; hover and `.on` turn cloud, and `.on` extends the tick to 28px in fibre (0.5s) and sets `aria-current="step"`. A 2px fibre bar scales with page progress. At 720px and below only the active label shows text. Hidden with no JS.

### Rifat
- **Container:** two-column grid (chat, ticket). `data-mode` is `guide` (no AI endpoint; scripted questions) or `ai`; it changes the mode label text only, not styling. `data-busy` is present while Rifat is answering: the orb rings spin at 1.6s and a typing bubble shows.
- **Chat panel:** ink glass, line border, r-lg, 12px blur, deep shadow; height min(72svh, 640px), min 480px. Header row with the 44px orb, Rifat in Gloock 22px, mode label in dim 13px, and a "Start again" outline pill.
- **Messages:** `.msg.r` (Rifat) left-aligned on `#13355a` with bottom-left tail; `.msg.u` (buyer) right-aligned on fibre with ink-0 text and bottom-right tail; max 84% (92% on phones). With motion each message enters over 0.45s (10px rise, 0.98 scale). `.msg.typing` is three 6px fibre dots pulsing on 1s, staggered 0.15s. The log is `role="log"` and polite.
- **Input row:** pill input (50px, line-2 border, `#05122299`), focus turns the border fibre; circular 50px fibre send button with an inline SVG arrow.
- **Ticket:** r-lg panel on a `#173a5c99` to `#0c2440cc` gradient with line border. A two-column definition list: field names in faint; `dd.empty` in faint; `dd.new` flashes from fibre with a fibre glow back to cloud over 0.9s. Actions: primary "Send on WhatsApp" (disabled state above) and ghost "Copy enquiry".

### Orb
Rifat's signature: a warm radial sphere (fibre-2 to fibre-3 to dark umber) with a fibre glow and three thin rings orbiting at 9s, 12s and 15s (third reversed). Sizes: 44px default, 28px extra-small inside buttons (no glow). Busy state speeds rings to 1.6s.

### Inputs / Fields
- **Style:** min-height 48px, padding 10px 14px, r-sm, line-2 border, `#05122299` fill, cloud 16px text. Labels grotesk 600 14px; required marked by a fibre 12px "required" tag.
- **Focus:** 2px fibre outline at 1px offset.
- **Error:** `aria-invalid="true"` sets border `#f0a58f`; the `.err` message below is 14px `#f6b8a6` and hides when empty. Validation runs on submit, then live on blur and input once a field is invalid.
- **Plain form:** ink glass panel, r-lg, revealed by an underlined dim text toggle; visible without JS.

### Product sheet
Native `dialog`, ink-2, line border, r-lg, max 920px; image and body side by side (stacked at 700px and below). Backdrop `#051222b3` with 10px blur; with motion it rises 24px from 0.98 scale over 0.5s. Circular 44px close on ink-0. The body ends with a primary button that hands the product to Rifat.

### Spec drawer
The product sheet as it is used: a pane of Ink Glass (glass, 24px blur, 1.3 saturation) floating 12px clear of the viewport edges (8px on phones, where it rises from the bottom), r-lg, a `#dbeaf62e` hairline and an inner top highlight; the backdrop is only `#05122266` with 2px blur, so the product's own family stays readable on stage behind it (a shared product link brings that family on stage). The photograph sits inset 10px with the radius stepped down. Under the title, a spec list in two columns with mist hairlines: Family, Grade (graded yarns only), Supplied from, then Specification and Minimum order, which read "Confirmed in your quotation" in dim until SB Trading confirms real values; never invent figures. The product's note, the two actions, and a dim hand-off line: Rifat (AI) gathers the enquiry and the buyer sends it on WhatsApp. The actions have two states, and only one primary at a time: before adding, primary "Add to enquiry" and ghost "Ask Rifat about it"; once added, they swap order and weight, so the primary is "Finish enquiry with Rifat" (the same hand-off) and the ghost reads "Added ✓", with a one-line status ("Added. Your enquiry has N products."). The drawer never holds its own enquiry form: the enquiry lives in the tray and Rifat's ticket, in one place.

### Motion
- **Easings:** ease (expo-out) for nearly everything; ease-io for the arch clip and scroll cue. Motion.dev reveals use the same curve as an array `[0.16, 1, 0.3, 1]`.
- **Durations in use:** 0.25s chips; 0.3s buttons and product chips; 0.4s chapter colour, bar fade, arrow disc; 0.45s message entry; 0.5s card lift, ticks, nodes, sheet entry; the product drawer moves with Motion: in on a spring (visual duration 0.5s, bounce 0.12), out on a 0.28s ease-in before the dialog closes (from the right on desktop, from below on phones; instant with reduced motion); 0.6s text fades and Motion reveals (stagger 0.08s); 0.7s Rifat reveal (stagger 0.1s); 0.8s text rise and card photo zoom; 0.9s ticket fill; 1.1s arch clip; 1.2s arch transform and ambient fade; loops at 1s (typing), 1.1s (sound bars), 1.6s (busy orb), 2.2s (scroll cue), 9 to 15s (orb).
- **Scroll smoothing:** film progress lerps at 0.16 per frame, pointer tilt at 0.08.
- **Reduced motion:** site.js does not add the `motion` class; the film becomes a poster with stacked captions, explore unpins into three full-height sections with one photo each, ambient layers, 3D studies and reveals are skipped, smooth scrolling is off and Rifat's pauses drop to zero. CSS also stops all looping animations and button/chip transitions.
- **No JS:** the page reads as a document; header toggles, chapter bar and Rifat are hidden by `noscript`, the nav shows inline, and the plain form is the enquiry route.

## Do's and Don'ts

### Do:
- **Do** keep fibre as the only accent, with ink-0 text on every fibre fill.
- **Do** set heading emphasis as an upright `em` in fibre.
- **Do** make every control a pill or circle with a minimum 44px target (40px for chips and the restart button, as shipped).
- **Do** float panels as ink glass with blur and a line hairline; reserve fibre glow for hover and active states.
- **Do** gate every scroll, pointer or looping effect behind the motion class and give it a static equivalent.
- **Do** use dim or cloud for any text a buyer must read below 18px.
- **Do** label generated, stock or unconfirmed media and product facts in place, as the film and study labels do.

### Don't:
- **Don't** set readable small text in faint; it measures 3.90:1 on the ground.
- **Don't** italicise or synthesise Gloock.
- **Don't** introduce a second accent hue or fill surfaces with Brand Blue; blue lives in the ground glow.
- **Don't** use hard or offset shadows; depth here is soft and atmospheric.
- **Don't** recolour or redraw the SB Trading logo or mark; the light knockout is the only derivative and awaits owner approval.

## Fidelity controls

Tokens are the source of truth. styles.css `:root` is normative for values; this file's token block (under Colors) is its documented mirror, and the YAML frontmatter repeats the colour, radius and spacing values for DESIGN.md-aware tools.

`tests/tokens.mjs` (to be added by the parent task, not shipped in this pass) fails the build if any custom property declared in styles.css `:root` is missing from the token block, if the token block names a property that `:root` does not declare, or if a value differs. Parse contract: read the fenced block whose first line is the `/* tokens: */` comment and match each line against `^\s*(--[a-z0-9-]+):\s*([^;]+);`. Each root token appears there exactly once, and nowhere else in this file with its leading double hyphen. Runtime properties set inline by script or scoped to a component (s, r, t, ry, rx, draw, page) are not root tokens and are only cited by bare name.

Bump the version when a token is added, removed or revalued, and add a changelog line.
