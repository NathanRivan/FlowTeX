---
name: FlumenWrite
description: A calm, precise document editor that types and typesets like LaTeX without the source.
colors:
  ink: "#1a2535"
  navy: "#2c3d54"
  navy-hover: "#3a4f6e"
  cream-bg: "#f7f4ef"
  paper-white: "#ffffff"
  paper-faint: "#faf8f5"
  thumb-tint: "#f0ebe2"
  muted: "#bbb"
  muted-soft: "#aaa"
  faint: "#ccc"
  link-blue: "#4285f4"
  link-blue-bg: "#e8f0fe"
  warm-accent: "#cc9944"
typography:
  display:
    fontFamily: "'Playfair Display', Georgia, serif"
    fontSize: "17px"
    fontWeight: 400
    fontStyle: "italic"
    letterSpacing: "normal"
  headline:
    fontFamily: "-apple-system, 'Segoe UI', sans-serif"
    fontSize: "28px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.6px"
  title:
    fontFamily: "-apple-system, 'Segoe UI', sans-serif"
    fontSize: "13px"
    fontWeight: 600
    letterSpacing: "-0.1px"
  body:
    fontFamily: "-apple-system, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, 'Segoe UI', sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.1em"
    textTransform: "uppercase"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "16px"
  lg: "36px"
  xl: "52px"
components:
  button-primary:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.cream-bg}"
    rounded: "{rounded.lg}"
    padding: "11px 20px"
  button-primary-hover:
    backgroundColor: "{colors.navy-hover}"
  card:
    backgroundColor: "{colors.paper-white}"
    rounded: "{rounded.xl}"
    padding: "12px 12px 14px"
---

# Design System: FlumenWrite

## 1. Overview

**Creative North Star: "The Quiet Desk"**

FlumenWrite reads like a well-kept desk, not a dashboard: cream paper, navy ink, a single serif flourish on the brand mark, everything else in restrained system sans. Nothing here competes with the document. Cards sit flat until touched — hover lifts them a couple of pixels and adds a soft, low-contrast shadow, then they settle back down. Color is almost entirely tonal: navy-on-cream, with two rationed exceptions (a blue "Shared" pill, a warm amber hover for destructive actions) that stay legible precisely because nothing else is competing for saturation.

This system explicitly rejects gradient-text headers, hero-metric tiles, tracked uppercase eyebrows over every section, numbered 01/02/03 scaffolding, and glassmorphism-as-decoration — the generic AI-SaaS dashboard grammar. FlumenWrite is a writing tool; it should feel like an instrument, not a funnel.

**Key Characteristics:**
- Flat at rest, lifted only on interaction (hover-triggered elevation, never ambient)
- One serif accent (Playfair Display italic) reserved for the brand mark only — everywhere else is system sans
- Color is tonal navy/cream by default; saturated color is rationed to two semantic uses (shared-doc pill, destructive hover)
- Borders and dividers are navy at low opacity (`rgba(44,61,84,0.07–0.14)`), never a separate gray

## 2. Colors

Tonal navy-on-cream carries the system; saturated color appears twice, on purpose.

### Primary
- **Deep Ink Navy** (#1a2535): Headings, card titles, primary text. The darkest tone in the system.
- **Slate Navy** (#2c3d54): Primary buttons, the header "f" mark's true color, and the source hue for every tinted border/shadow in the system (`rgba(44,61,84,…)`).
- **Slate Navy Hover** (#3a4f6e): Hover state for navy buttons, paired with a 1px lift.

### Neutral
- **Warm Paper** (#f7f4ef): App background. Never pure white — this is the "desk," everything else sits on top of it.
- **Card White** (#ffffff): Card and header surfaces, floating just above the paper background.
- **Faint Paper** (#faf8f5): Document thumbnail interiors — one step warmer/darker than white, reads as "page."
- **Thumbnail Tint** (#f0ebe2): Template thumbnail backdrop, a deeper paper tone for nested preview content.
- **Muted** (#bbb) / **Muted Soft** (#aaa): Secondary text — dates, descriptions, placeholders, section labels.
- **Faint** (#ccc): Lowest-emphasis text, e.g. search placeholder.

### Named Rules
**The Tonal Border Rule.** Every border, divider, and resting shadow in the system is `rgba(44,61,84, 0.07–0.18)` — a transparency of the primary navy, never an independent gray. This is what keeps the flat cream-and-navy palette feeling like one material instead of a UI-kit default.

**The Rationed Color Rule.** Saturated, non-tonal color appears in exactly two places: the blue "Shared" pill (`#4285f4` on `#e8f0fe`) and the warm amber delete-hover (`#cc9944` on `rgba(204,153,68,0.08)`). Do not add a third. If a new state needs color, ask whether tone (weight, opacity) can carry it instead.

## 3. Typography

**Display Font:** 'Playfair Display' (italic), with Georgia/serif fallback
**Body Font:** -apple-system / 'Segoe UI' system sans stack

**Character:** One deliberate serif italic flourish (the brand mark's lowercase "f") against an otherwise all-sans system. The contrast is the point — it reads as a hand-set initial in an otherwise typewritten document, not a font-pairing exercise.

### Hierarchy
- **Display** (400, italic, 17px): The "f" in the FlumenWrite wordmark only. Never used for body content.
- **Headline** (400, 28px, letter-spacing -0.6px): "Welcome back" hero heading; the `<strong>` child goes 700 for the name.
- **Title** (600–700, 12–13px, letter-spacing -0.1px): Card titles — document names, template names.
- **Body** (400, 11–14px): Descriptions, dates, sub-copy. Color carries hierarchy here more than size (`#aaa`/`#bbb`).
- **Label** (600, 11px, letter-spacing 0.1em, uppercase): Section labels ("YOUR DOCUMENTS", "START FROM A TEMPLATE") — the one uppercase-tracked element in the system, reserved for this single role.

### Named Rules
**The One Uppercase Rule.** Tracked uppercase labels are reserved for section headers exclusively. Don't reach for them as a generic "eyebrow" over new sections — one role, one place.

## 4. Elevation

Flat by default; elevation is a response to interaction, never ambient. Cards and buttons carry no shadow at rest. On hover, a diffuse navy-tinted shadow appears alongside a 1–2px upward translate, then both reverse on mouse-leave.

### Shadow Vocabulary
- **Card hover** (`box-shadow: 0 4px 14–16px rgba(44,61,84,0.08–0.09)`): Template and document cards on hover, paired with `transform: translateY(-2px)`.
- **Floating control** (`box-shadow: 0 1px 4px rgba(44,61,84,0.08)`): Small resting controls that float above a card, e.g. the hover-revealed delete button — the one exception that carries a shadow at rest, because it's already an overlay element.
- **Focus ring** (`box-shadow: 0 0 0 3px rgba(44,61,84,0.06)`): Search input and other focusable fields on `:focus-within`.

### Named Rules
**The Hover-Only Rule.** Nothing casts a shadow at rest except small floating overlay controls. If a shadow is visible before interaction, it's wrong.

## 5. Components

### Buttons
- **Shape:** 10px radius (`border-radius: 10px`)
- **Primary:** Navy background (#2c3d54), cream text (#f0e6dc), 11px/20px padding, 600 weight, no border.
- **Hover:** Background shifts to #3a4f6e, `translateY(-1px)`, 0.15s transition.
- **Ghost/icon (back button, search-clear, delete):** No background, `#bbb`/muted icon color at rest, darkens to navy or a semantic color on hover — never gains a background fill except the hover-revealed delete button, which is a floating white chip.

### Cards
- **Corner Style:** 12px radius, consistently across document cards, template cards.
- **Background:** White (#fff) on the cream page background — the contrast is the only elevation cue at rest.
- **Shadow Strategy:** none at rest; see Elevation.
- **Border:** 1.5px, `rgba(44,61,84,0.07–0.08)` at rest, darkening slightly to `rgba(44,61,84,0.16–0.2)` on hover — the border tightens before the shadow appears.
- **Internal Padding:** 12–14px.

### Inputs / Fields
- **Style:** White/transparent fill inside a pill-like container (`border-radius: 8px`), 1.5px tonal navy border at low opacity.
- **Focus:** Border darkens to `rgba(44,61,84,0.3)` plus a soft 3px navy focus ring (`rgba(44,61,84,0.06)`) — no color change, purely tonal.
- **Placeholder:** `#ccc`, the faintest tone in the system.

### Navigation (Header)
- **Style:** Sticky white header, 52px tall, 1px tonal-navy bottom border. Brand mark (serif "f" + "FlumenWrite" wordmark) is left-anchored after a back button; user name is right-anchored, muted.

### Signature Component: Document Card
A hover-revealed delete affordance (`fw-doc-card-del`) sits absolute-positioned top-right, invisible until the card is hovered, then fades in as a small white floating chip. This hide-until-hover pattern is the system's answer to "how do we show a destructive action without cluttering the resting state" — reuse it for any new per-item destructive or secondary action (e.g. rename, move) rather than inventing a persistent icon row.

## 6. Do's and Don'ts

### Do:
- **Do** keep every border and shadow color-derived from navy (`rgba(44,61,84,…)`), never an independent gray.
- **Do** use the hover-reveal pattern (`opacity: 0` → `1` on card `:hover`) for any new secondary/destructive per-card action, matching `fw-doc-card-del`.
- **Do** keep new UI flat at rest; earn shadow only through hover interaction.
- **Do** reuse the 12px card radius and 1.5px tonal border for any new card-shaped element (including folder cards) so it reads as the same family, then differentiate by icon or accent tint — not by shape.

### Don't:
- **Don't** introduce gradient text, hero-metric tiles, tracked uppercase eyebrows outside the established section-label role, or numbered 01/02/03 scaffolding — generic AI-SaaS dashboard grammar this system explicitly rejects.
- **Don't** add a third saturated color beyond the existing blue "Shared" pill and amber delete-hover. Reach for opacity/weight before a new hue.
- **Don't** add shadow-at-rest to cards or buttons; elevation here is exclusively a hover response.
- **Don't** use `border-left`/`border-right` as a colored accent stripe on cards or list rows.
- **Don't** mix in a second serif or display font — Playfair Display italic is reserved for the single-letter brand mark only.
