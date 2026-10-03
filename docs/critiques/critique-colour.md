# Design critique: colour, surfaces and materiality

Lens: colour. Judged against `docs/00-brief.md` §12 (visual direction), §13 (colour system), §19 (accessibility), §29 (design system), §30 (recognisable visual system), §5A (bottle stage). Screenshots at 1440px and 390px; all hex values below were sampled from the PNGs or computed from `src/styles/tokens.css`, not guessed.

## Headline

The palette on paper is right (ink, porcelain, oxblood, bergamot, juniper, one controlled accent per fragrance). On screen almost none of it arrives. Measured: the hero wash on Sauvage, N°5 and Aventus, the Black Opium feature panel, every card plate on Home/Discover/Similar, the "Note of the week: Amber" band and the Bergamot note hero are all exactly `#e3e2dd`; every data bar on the fragrance page is `#555754`. Those are precisely `color-mix(in oklab, #8a8f8c 14%, #f2f0eb)` and `color-mix(#8a8f8c 55%, #1c1a17)`, i.e. the *fallback* accent. The per-fragrance accent system that the brief calls the core of the colour strategy is not functioning anywhere, so the site reads as a cool grey database with some coloured bottle renders dropped in. Fixing that one cascade bug, then tuning the wash recipe and the surface steps, moves the site from "flat and grey" to the warm, tactile object catalogue the brief describes.

## Keep

- Ink as the only action colour; no coloured CTA buttons. Oxblood/bergamot/juniper used as small signals with fixed meanings (focus/destructive, "you"/demo, owned/official).
- Solid porcelain header with a hairline, no glass; ink footer as a colophon.
- Radii hierarchy: square plates and images, 2px buttons/inputs, pills only for chips, tags and status.
- Shadows only on floating layers, warm-tinted (`rgb(28 26 23 / …)`), low.
- The blotter motif: the dipped strips in the Notes index and the 46×220 tilted blotter on the note page. Tactile and ownable.
- The Trail's "muted material" hue philosophy (citrus peel, cedar, resin, graphite) and the fact that every colour is paired with a text label.
- Wear-diary accent dots (the one place the fragrance accent is applied directly and works), and the bergamot 28% highlighter for shared notes on Compare.
- The "We read that as" chip pair on Discover: bergamot wash for include, oxblood wash for exclude (6.9:1 text).
- Oxblood 2px focus ring, bergamot selection, bergamot-ink "Demo figures" flag (honest labelling in a signal colour).

## Findings (severity ranked)

### 1. Severity 3 · global · tokens.css · The per-fragrance accent never reaches any surface
**Finding.** `--scent-wash`, `--scent-wash-2` and `--scent-ink` are declared on `:root` with `var(--scent)` inside. Custom properties resolve `var()` where they are declared, so the three tokens are computed once from the root `--scent` (`#8a8f8c`) and the *resolved grey* is inherited. Setting `--scent` inline on the fragrance root (`page.tsx:86`), `FragranceCard`, `ShelfView`, `DiaryView`, home `.feature`/`.note` and the note page therefore changes nothing. Sampled: Sauvage/N°5/Aventus hero = `#e3e2dd`; Portrait of a Lady plate = `#e3e2dd`; Amber band = `#e3e2dd`; longevity peak = `#555754`; histogram = `#b1afa8`. All three equal the computed fallback mixes to the digit.
**Brief.** §13 "Each fragrance can then introduce a controlled scent accent based on its identity"; §30 recognisable visual system.
**Direction.** Move the three derived declarations off `:root` into a universal rule so they recompute per element from the inherited `--scent`:
```css
:root { --scent: #9a8f80; }           /* warm stone fallback, see #12 */
* {
  --scent-wash:   color-mix(in oklab, var(--scent) 14%, var(--porcelain));
  --scent-wash-2: color-mix(in oklab, var(--scent) 26%, var(--porcelain));
  --scent-ink:    color-mix(in oklab, var(--scent) 55%, var(--ink));
}
```
(or a `.scented` class applied on every element that sets `--scent` inline). Acceptance: sample Sauvage hero ≠ N°5 hero ≠ Aventus hero.
**Effort.** S

### 2. Severity 3 · global · wash recipe · Even when alive, a 14% mix of dark accents stays grey
**Finding.** Computed washes with the current recipe: Sauvage `#3D5573` → `#d7d9da`; Aventus → `#dcdad3`; Black Opium `#4A2E3A` → `#d9d2d0`; but Cheirosa `#D9967A` → `#efe3db` (pink and lighter). Dark, low-chroma accents (and seed values like `#8A8F96`, `#9C9A8C`, `#A69C8A`, oklch C < 0.02) can never produce a visible tint; pale ones overshoot. Lightness also varies per fragrance, so text contrast and the "ours" feel drift.
**Brief.** §13 "controlled scent accent … Do not let dynamic fragrance colors destroy brand consistency."
**Direction.** Derive in oklch with fixed lightness and clamped chroma, keeping only the hue from the accent:
```css
--scent-wash:   oklch(from var(--scent) 0.935 clamp(0.018, calc(c * 0.9), 0.045) h);
--scent-wash-2: oklch(from var(--scent) 0.89  clamp(0.025, c, 0.06) h);
--scent-ink:    oklch(from var(--scent) 0.36  clamp(0.04, c, 0.10) h);
```
Keep the `color-mix` version as `@supports not (color: oklch(from red l c h))` fallback. Sauvage becomes a cool slate stage, Aventus mossy khaki, Black Opium plum-grey, N°5 warm ivory, all at the same lightness (ink text ≥ 12:1 on every wash). Audit the 50 seed accents and raise chroma on any with C < 0.03 (the three listed above read grey at any strength).
**Effort.** M

### 3. Severity 3 · fragrance · bottle stage · The object floats on a flat fill; nothing is tactile
**Finding.** `.hero` is a single flat `--scent-wash` rectangle 880px tall. The poster carries a faint baked shadow but there is no ground plane, light direction, horizon or edge; the bottle reads as a cut-out on a grey card, not an object on a counter. Same on Home (Black Opium panel) and every plate.
**Brief.** §5A "object in a digital museum"; §12 "tactile … boutique perfume counter"; §17 "bottle reflections respond subtly".
**Direction.** Give the stage three quiet material cues, no glow, no blur: (a) vertical gradient `linear-gradient(var(--scent-wash) 0 60%, var(--scent-wash-2))` so the lower third is a counter; (b) a contact shadow pseudo-element under the bottle, 60% of frame width × 14px, `radial-gradient(ellipse at center, color-mix(in oklab, var(--scent-ink) 30%, transparent), transparent 70%)`, positioned at the poster's base line; (c) a 1px `--line-strong` horizon rule across the stage column at that base line. Reuse (b) at card scale (40% × 6px) in `FragranceCard .ground` and `ShelfView .bottle`.
**Effort.** M

### 4. Severity 2 · global · surfaces · Paper sheets are invisible (1.09:1)
**Finding.** porcelain `#f2f0eb` → paper `#fbfaf7` = 1.09:1, → linen `#e6e2da` = 1.13:1, → wash = 1.14:1, and raised sheets carry no border. The "Worn it?" panel, "No reviews yet", "Your shelf, read back", diary "This month", the sign-in demo box, the Lists cards and the Trail's heart-phase block (`#eae8e4`) all read as faint smudges rather than sheets of paper.
**Brief.** §29 "border hierarchy"; §12 tactile; §15 "everything inside cards" is the failure mode to avoid, which means the few real sheets must read as sheets.
**Direction.** Three legible steps: page `#f2f0eb`; raised `--paper: #fdfcf9` + `border: 1px solid var(--line)` + `box-shadow: 0 1px 0 rgb(28 26 23 / .06)`; sunk `--linen: #e3ded3` (wells, tracks, skeletons, demo banner). Apply to `sections.module .empty`, `ShelfView .insights/.empty`, `auth` demo box, `lists` card ground, `TodayPanel`, and the Trail phase block.
**Effort.** S

### 5. Severity 2 · global · hairlines · Rules are the only structure and they nearly vanish
**Finding.** `--line` = ink 14% → 1.38:1 on porcelain; `--line-strong` = 1.97:1. On "Explore by feeling", Trending, the glossary, Details table and every bar track the rule is the sole separator; on the hero wash it is lost entirely.
**Brief.** §13 "Do not sacrifice readability for aesthetic subtlety"; §29.
**Direction.** `--line: color-mix(in oklab, var(--ink) 20%, transparent)`; `--line-strong: 36%`. Keep the 2px ink rule for section heads and the ink underline for current nav.
**Effort.** S

### 6. Severity 2 · global · Trail palette · Seven of thirteen dimension hues fail 3:1 on porcelain
**Finding.** Computed: Clean `#B7C2C4` 1.6:1, Creamy `#DCCBA8` 1.4, Fruity `#D9A06B` 2.0, Fresh `#86A7AE` 2.26, Floral 2.33, Powdery 2.35, Warm 2.67. Consequences on screen: the Discover rail's 9px "Clean" swatch samples as the page colour; the Clean band is a ghost on every Trail thumbnail; the Creamy bar on the Perfumer page barely exists.
**Brief.** §19 "sufficient contrast … no information communicated solely through color"; §13 "Check WCAG contrast".
**Direction.** Deepen the pale hues while keeping them material (all ≥ 3:1 on `#f2f0eb`): Clean `#9FB0B3`, Creamy `#C9B690`, Fruity `#CF8F55`, Fresh `#6F97A0`, Floral `#BD807C`, Powdery `#9A8A98`, Warm `#B37F2D`. Change the thumbnail band stroke from porcelain to `color-mix(in oklab, var(--ink) 18%, var(--porcelain))` so every band keeps an edge.
**Effort.** S

### 7. Severity 2 · fragrance · Trail band labels · Light/dark choice is a hard-coded list and four bands fail
**Finding.** `TrailChart.tsx:128` sets `data-dark` for smoky/earthy/spicy/woody/green. Computed label contrast at 11px: Green (light label) 2.93:1, Sweet (dark) 3.8, Warm (dark) 4.22, Woody (light) 4.22. "Spicy" on the oxblood-red band is the most prominent label on the page and is barely legible.
**Brief.** §19.
**Direction.** Pick the label ink per band from the hue's luminance at build time, and add a halo in the band's own colour so ink text works everywhere: `.bandLabel { paint-order: stroke; stroke: var(--band); stroke-width: 3px; stroke-linejoin: round; }` with `--band` set inline per `<text>`. Bands thinner than 14px get no label (legend only).
**Effort.** S

### 8. Severity 2 · fragrance, compare, shelf · data marks · The whole data layer is monochrome
**Finding.** Longevity histogram `#555754` / `#b1afa8`, projection bars, occasion bars, season tubes, rating histogram, rating sub-bars (ink), Compare character bars (ink), Compare season bars (ink .75), shelf season bars (ink). Below the hero the only chroma on the fragrance page is the Trail. On Compare, columns A/B/C are visually identical apart from the letters.
**Brief.** §30 "recognisable"; §12 "sensory"; §5F/G "make performance understandable".
**Direction.** With `--scent-ink` live (fix #1/#2): primary mark = `--scent-ink`, secondary = `color-mix(in oklab, var(--scent-ink) 30%, var(--linen))`, track = `--linen`. Ink stays for text and bergamot for the "you" marker. On Compare set `--scent` per column (`.colHead`, `.cell`) so the A/B/C badge, bars and season blocks carry each fragrance's scent-ink.
**Effort.** M

### 9. Severity 2 · home · plates · Twenty identical grey rectangles in one scroll
**Finding.** Trending thumbs, "Made for autumn" plates, "Newest in the catalogue", and the four Note-of-the-week plates all sit on `#e3e2dd`. The page reads as a grid of grey boxes with bottles pasted on, the exact "everything in cards" silhouette the brief warns about.
**Brief.** §11 "editorial composition"; §15 vibe-code audit; §12 "modern object catalog".
**Direction.** Beyond #1 (plates take their own tint), differentiate the modules by material: Trending rows with no ground (bottle on page, 1px rule); autumn plates on each fragrance's wash; Newest as one continuous `--linen` ledge strip across all bottles (the shelf idea from `/shelf`) rather than seven separate plates.
**Effort.** M

### 10. Severity 2 · home · note of the week · "Amber" band is grey
**Finding.** `.note` sets `--scent: noteOfWeek.hue` but the band and its plates are `#e3e2dd`; only `--trail-gap` is tinted because `.noteFrags` overrides `--porcelain` locally. An amber feature that is grey undermines the whole "note as a material" idea.
**Brief.** §11 "popular note"; §13 citrus → pale bergamot yellow etc.
**Direction.** After #1: band = `--scent-wash`, plates inside = `--scent-wash-2` (one step deeper, so plates sit "in" the band), serif "Amber" title in `--scent-ink`. Check note hues for the same C < 0.03 problem as the fragrance accents.
**Effort.** S

### 11. Severity 2 · fragrance · hero split · Stage and identity share one surface
**Finding.** The wash runs full-bleed behind both the bottle and the identity/10-second-read column, so the object and the text are not layered; on phones the split flips (wash behind bottle only, text on porcelain).
**Brief.** §5A bottle stage as an object; §18 desktop "larger bottle stage, split layouts".
**Direction.** Desktop: paint the wash only behind the stage column (grid column 1) plus a 96px band across the top of the hero; identity column on porcelain with the existing 2px ink rule. This matches the mobile structure and makes the stage a distinct "museum plinth".
**Effort.** S

### 12. Severity 2 · global · warmth · The site reads cool grey, not warm
**Finding.** Porcelain `#f2f0eb` has oklch C ≈ 0.008; paper is near-white; the fallback `--scent` `#8a8f8c` is a *cool* grey; so untinted pages (Discover, Lists, Sign in, Learn) and, because of #1, every page, fall to a cool neutral. The brief's "warm palette" is not perceptible anywhere except the bottle renders.
**Brief.** §13 "sophisticated warm palette"; §12 "tactile, sensory".
**Direction.** Do not go cream (the team's own research correctly flags cream + terracotta). Instead: fallback `--scent: #9a8f80` (warm stone) so untinted washes land at hue ≈ 70°; nudge neutrals a hair warmer at equal lightness: porcelain `#f3f0ea`, linen `#e5e0d6`, paper `#fcfaf6`; keep ink as is. Measure: the untinted wash should sample around `#e6e2db`, not `#e3e2dd`.
**Effort.** S

### 13. Severity 2 · discover · filter chips · Include and exclude look the same in the toolbar
**Finding.** "We read that as" uses bergamot wash for Vanilla and oxblood wash for No tobacco (good), and the rail's "Must not have" chip is oxblood, but the active toolbar chips "With Vanilla ×" and "No Tobacco ×" are both ink. The one semantic colour pairing on the page is applied in two of three places.
**Brief.** §7 note exclusion as a first-class tool; §19 colour never the only carrier, but consistency when used.
**Direction.** Toolbar active chips render with `.chip--exclude[data-on]` for exclusions (oxblood background, porcelain text, 8.1:1). Keep the "×" and the "No" prefix as the non-colour carrier.
**Effort.** S

### 14. Severity 1 · global · popovers and menus · Floating layers barely detach
**Finding.** Menus and tooltips are paper with a `--line` border (1.38:1) and `--shadow-pop` whose contact stop is 2px at 8%; on porcelain they read as part of the page.
**Brief.** §29 shadows.
**Direction.** `--shadow-pop: 0 1px 2px rgb(28 26 23 / .10), 0 10px 28px -8px rgb(28 26 23 / .26)`; popover border `--line-strong`. Keep bottom sheets as they are.
**Effort.** S

### 15. Severity 1 · shelf · ledge · The most tactile idea on the site is a 10px beige bar
**Finding.** `.bottle::after` is a hard-coded `#b9ab93 → #9c8e77` strip, 10px tall, 6px shadow. It reads as a divider, not a shelf; the profile page repeats it at full width.
**Brief.** §8 "clean virtual shelf"; §12 "record collection".
**Direction.** Tokenise (`--ledge-top: #cdbfa6; --ledge-front: #8f8168`) and build the ledge from two faces: 10px top face + 6px front face stacked, `box-shadow: 0 10px 14px -10px rgb(28 26 23 / .5)` below; bottles get the 40% × 6px contact ellipse from #3. Keep the settle animation.
**Effort.** S

### 16. Severity 1 · diary · calendar · Raised/sunk is inverted
**Finding.** Wear days are `#e7e6e3` (linen, "sunk"), empty days are paper (`#fbfaf7`, "raised") with a 1px line. The day with activity looks like the hole.
**Brief.** §9 wear diary as a retention loop; §29 surface roles.
**Direction.** Wear day = paper sheet with `--line-strong` edge; empty day = flat porcelain with `--line`; today = 2px ink outline. Keep the accent dots exactly as they are.
**Effort.** S

### 17. Severity 1 · profile, header · avatar · Default monogram fails AA at header size
**Finding.** `Avatar.tsx` default `#8e7f6a` with `#fbfaf7` initials = 3.89:1; at the 32px header size the initials are 12px/600 → needs 4.5:1. The 72px profile avatar passes as large text.
**Brief.** §19.
**Direction.** Default hue `#6d6150` (≈5.5:1), or ink initials on `--linen`; when a user picks a hue, choose text colour by luminance (`l > 0.6 ? ink : paper`).
**Effort.** S

### 18. Severity 1 · fragrance · confidence meter · "Settled" bars do not read as a meter
**Finding.** `confBars` off-state uses `--stone-2` (1.55:1 on porcelain) so the three-bar meter shows only its lit bars; juniper, the site's "positive confirmation" colour, is used in only three files.
**Brief.** §4 "confidence indicator based on number of community votes"; §13 colour roles.
**Direction.** Off bars `color-mix(in oklab, var(--ink) 25%, transparent)`; on bars `--juniper-ink`, so "settled" shares the owned/official signal consistently.
**Effort.** S

### 19. Severity 1 · fragrance · NoteTag · Pale note hues lose their arrow tip
**Finding.** The tag's tip is a gradient to `color-mix(hue 85%)`; for Clean/Musk/Creamy-type hues (L > 0.85) the tip is indistinguishable from the paper chip (Ambroxan, Elemi, Lavender tips in "Listed vs. smelled").
**Brief.** §19; §30 recognisable glyphs.
**Direction.** Tip = solid hue block with a 1px inner edge `color-mix(in oklab, var(--ink) 20%, var(--note))`; for hues with L > 0.85 mix 20% ink into the tip.
**Effort.** S

### 20. Severity 1 · fragrance · when to wear · Day/Night is the loudest colour on the page
**Finding.** Day uses `bergamot 34% paper` and Night uses solid ink; they are the only saturated blocks in the section, so the eye ranks day/night above seasons and occasions.
**Brief.** §5G "avoid reducing everything to arbitrary scores"; §13 signals have meanings (bergamot = "you").
**Direction.** Day = `--scent-wash-2`, Night = `--scent-ink` with porcelain text; bergamot reserved for the user's own vote marker once they have voted.
**Effort.** S

## Verification checklist for the engineer
1. After #1/#2, sample the hero on `/fragrance/sauvage`, `/fragrance/no5`, `/fragrance/aventus`: three different hues at L ≈ 0.93.
2. Run a contrast pass on `DIMENSION_META` hues against `#f2f0eb` (≥ 3:1) and on band labels (≥ 4.5:1).
3. Confirm paper/porcelain/linen steps are visible with the border on `.empty` and `.insights` at 1440 and 390.
4. Toggle `prefers-reduced-motion`: none of the above introduces motion.
