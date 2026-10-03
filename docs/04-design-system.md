# Design system

The rules behind `src/styles/tokens.css` and `src/styles/globals.css`, with the reason for each. This is the file `tokens.css` points at. It is written for the person adding the next page: if a decision here does not cover your case, choose what a strong editorial designer would and add the reason below, rather than inventing a token.

The product is a fragrance journal and object catalogue. Every decision below is tested against one question: does it make a bottle, a scent and a person's opinion of it read as real things on a counter, in a publication, rather than as rows in a dashboard?

## 1. Colour

### Neutrals: porcelain and ink, nudged warm

| token | value | role |
|---|---|---|
| `--ink` | `#1c1a17` | text, the only action colour |
| `--ink-2` | `#47423c` | secondary text, 9.1:1 on porcelain |
| `--ink-3` | `#6a645b` | meta text, 5.3:1 on porcelain, 4.9:1 on linen |
| `--stone`, `--stone-2` | `#a79f93`, `#c9c2b6` | decorative only, never text |
| `--linen` | `#e5e0d6` | sunk surfaces |
| `--porcelain` | `#f3f0ea` | the page |
| `--paper` | `#fcfaf6` | raised surfaces |

Why warm, and why not cream: the brief asks for a warm palette; the research flags cream plus terracotta as the current default "tasteful AI" look. So the neutrals move a hair warm at equal lightness (porcelain from `#f2f0eb` to `#f3f0ea`, linen `#e6e2da` to `#e5e0d6`, paper `#fbfaf7` to `#fcfaf6`) and the fallback scent accent is warm stone, not cool grey. The untinted wash samples around `#e6e2db`. Nothing goes yellow.

Lines: `--line` is ink at 20% (1.60:1 on porcelain), `--line-strong` at 36% (2.44:1). They were 14% and 28%, which made rules the only structure on the page and nearly invisible. The 2px ink rule stays the section-opener device.

### Surfaces: three legible steps

- **Page** is porcelain. The default; it needs no declaration.
- **Raised** is `--paper` with `border: 1px solid var(--line)` and `box-shadow: var(--shadow-raised)` (a single 1px contact line at 6%). `.surface-raised` in globals. Only for things that float or are typed into: popover, menu, sheet, input, textarea. The review empty state is the one exception: a dashed `--line-strong` border and no fill.
- **Sunk** is `--linen`. `.surface-sunk`. Wells, tracks, skeletons, the demo banner, and the two full-bleed data bands on the fragrance page ("Listed vs. smelled", "How it wears").

Nothing else gets a background. Paper on porcelain is 1.09:1, so a sheet without a border is a smudge; a sheet on a thing that does not float is a card, and cards are how a catalogue turns into a SaaS template. The old tree had 41 `background: var(--paper)` declarations outside the list above; each page package removes its own.

### Signals, with fixed meanings

- `--oxblood` (`#7a302c`, 8.4:1): focus ring, favourite, destructive and attention. Exclusion chips.
- `--bergamot` (`#c5a63c`; `--bergamot-ink #6f5a12` for text at 6.0:1): selection marks, the viewer's own mark in a chart, the demo flag.
- `--juniper` (`#607165`; `--juniper-ink #445249` at 7.7:1): owned, positive confirmation, the "on" bars of the confidence meter.

No coloured CTA. Ink is the only action colour, one ink primary per screen.

### The scent accent

Each fragrance (and each note) contributes one `--scent`, set inline on the element that owns it: the fragrance page root, a card, a shelf bottle, a diary row, the home feature, the note page. Three tokens derive from it:

```css
* {
  --scent-wash:   oklch(from var(--scent) 0.94 clamp(0.012, calc(c * 0.6), 0.030) h);
  --scent-wash-2: oklch(from var(--scent) 0.90 clamp(0.018, calc(c * 0.8), 0.045) h);
  --scent-ink:    oklch(from var(--scent) 0.36 clamp(0.040, c, 0.100) h);
}
```

Two decisions here, both load-bearing.

1. **They live on `*`, not `:root`.** A custom property resolves its `var()` where it is declared. Declared on `:root`, the three washes were computed once from the fallback grey and every page inherited the same `#e3e2dd`, so the per-fragrance colour never arrived. On the universal rule each element derives them from the `--scent` it inherits.
2. **Only the hue survives.** Lightness is fixed (0.94 / 0.90 / 0.36) and chroma is clamped, so Sauvage is slate, N°5 is ivory, Black Opium is plum-grey and Aventus is khaki, all at the same lightness. Measured on the live pages: every wash at L 0.940, ink at 14.4 to 14.6:1 on it; every `--scent-ink` at 9.5 to 9.9:1 on porcelain. The chroma cap is 0.030, lower than the colour critique's 0.045, because at L 0.94 a 0.045 blue reads as sky and 0.030 reads as slate. Browsers without relative colour syntax get the `color-mix` fallback under `@supports not`.

Seed accents with chroma under 0.03 cannot tint anything and are raised at the same hue in the seed (`aventus` to moss, `club-de-nuit-intense-man` to navy, and five more), except where the bottle is genuinely grey (`bvlgari-black`, `molecule-01`, `not-a-perfume`, `lazy-sunday-morning`), which the clamp floor tints warm stone.

### The Trail palette

`DIMENSION_META.hue` in `src/lib/scent/vocab.ts`. Thirteen hues, one per character dimension, in the fixed stack order fresh to smoky. The cut rule: every stack-neighbour at least 0.076 apart in OKLab and lightness alternating down the stack, so a thumbnail with five 4px bands still separates. Clean (`#C7D2CE`) and creamy (`#E3D2A8`) are pale by nature and cannot reach 3:1 on porcelain while staying pale, so the rule is structural instead: every Trail silhouette is stroked (1px, ink 22%) and every standalone swatch carries a 1px inset ink-20% edge. Band labels are ink when the hue's OKLab L is 0.6 or more and paper otherwise, never with alpha; a band whose label would fall under 4.5:1 gets an end-label on porcelain. Smoky is warm graphite (`#514A45`), no longer the ink itself.

### The ledge

`--ledge-top: #cdbfa6`, `--ledge-front: #8f8168`. Two faces, lit from above: the shelf is the most tactile idea in the product and a 10px beige bar did not carry it.

## 2. Typography

### Two voices, cleanly split

- **Newsreader roman** is the display and reading voice: page titles, section heads, ledes, prose. `.t-display`.
- **Newsreader italic** means exactly one thing: a fragrance name, as the title of a work. `.t-title`. Nothing else is italic.
- **Archivo** is the instrument: labels, data, buttons, nav, numbers. It stays at normal width everywhere except the wordmark and `.kicker` (13px, 112%, tracked +0.04em), where wide and tracked reads as a magazine kicker rather than a startup headline.

Why the inversion: the old tree set every title in a wide, bold, tight-tracked grotesque and confined the serif to names and prose, which is the Linear/Vercel idiom the brief bans. Moving the serif to the titles is the single change that turns "startup" into "publication". Negative tracking at or below −0.02em and `font-stretch` above 100% (outside the two exceptions) are gone.

### The scale

| token | value | use |
|---|---|---|
| `--t-title-xl` | 44 to 72 | object names: fragrance, note |
| `--t-title-l` | 36 to 52 | page titles, the home statement |
| `--t-title-m` | 26 to 30 | section h2 |
| `--t-h3` | 20 | in-section heads, utility-page titles, data-module heads |
| `--t-sub` | 17 | |
| `--t-body` | 16 | |
| `--t-prose` | 18 | review bodies, note/learn/about prose |
| `--t-serif-l` | 21 | ledes, pull quotes, the feature summary |
| `--t-serif` | 18 | |
| `--t-serif-s` | 16 | |
| `--t-name` | 20 | card names |
| `--t-name-s` | 17 | row and inline names |
| `--t-small` | 14 | |
| `--t-label` | 13 | |
| `--t-micro` | 12 | **the floor** |
| `--t-figure-xl` | 40 to 56 | hero score, "7–10 h" |
| `--t-figure-l` | 28 | diary dates, stat strips |

`--t-head` is a retired alias of `--t-h3` kept until every module has moved; do not use it in new code.

Rules: every `font-size` references a token (`.stylelintrc` warns on a literal; run `npm run lint:css` once stylelint is installed). Nothing renders below 12px; where something must read as smaller than its neighbour, change weight or colour, not size. The ladder has a 20px step (`--t-h3`) because the old page went 77 → 32 → 17 → 12 and eight sections read as eight identical blocks.

### Roles

```
.t-display       serif roman 400, −0.005em, lh 1.02, balance, opsz 72
.t-title         serif italic 400, same metrics; fragrance names only
.t-h3            sans 600 at --t-h3, normal width, lh 1.25
.kicker          sans 650 at --t-label, 112%, +0.04em, --fg-2
.t-prose         serif 400 at --t-prose, lh 1.6, 62ch, opsz 18
.t-figure        tabular lining, 88%, 560; data at 20px and under
.t-figure-serif  serif 400 tabular lining, lh 1; headline figures at 28px and over
.t-label / .t-sub / .t-meta / .tnum   unchanged
```

Numbers: tabular figures everywhere a column of them can appear. Headline figures take the serif so a score and a name share one voice; the condensed sans is for data at text size only.

Fonts: both families are subset variable fonts in `src/fonts`. `font-optical-sizing: auto` is declared on the faces in `layout.tsx` and pinned per role (`'opsz' 72` on display, `18` on prose). Handoff: the shipped Newsreader subsets still lack the `opsz 6–72` axis and the Archivo subset lacks U+2190–2193 and U+2197 (arrows fall back to Arial); re-export from the OFL sources with `wawoff2`, keeping each file under 60KB. Until then the declarations are inert but correct.

## 3. Spacing, grid and breakpoints

Spacing is a 4px base, `--s-1` (4) to `--s-12` (120). Section rhythm deliberately varies; there is no single section padding, because identical 48px padding on eight sections is how a page stops having a shape.

### The twelve-column grid

Content is 1280px wide from 1100px up and never wider: twelve 85px columns with 24px gutters (`--col`, `--col-gap`; 12 × 85 + 11 × 24 = 1284). Every page measure is a run of these columns, so the left edge of the type lands on the same lines from page to page. The old tree had five content measures that shared no grid line (1280, 900 centred, 700 centred, 916 + 300, 440 left), which is what people feel as "not one product".

Named runs in `globals.css`, applied to a child of `.page`:

| class | desktop | tablet | phone |
|---|---|---|---|
| `.cols-3-10` | columns 3–10 (848px, x 298 to 1062 at 1440): learn, about, list detail | 100%, max 640 | full |
| `.cols-4-9` | columns 4–9 (630px): sign-in, review composer | 100%, max 640 | full |
| `.layout-8-3` | main 1–8 + rail 10–12 (303px), column 9 is the gutter: fragrance body | one column; the rail's actions and section list become a sticky bar (page module) | one column; rail folds (page module) |
| `.layout-3-9` | rail 1–3 (303px) + results 4–12: discover | one column; rail is a sheet | one column; rail is a sheet |

`--measure-read: 62ch` for prose, `--measure-form: 440px` for forms. `.bleed` runs a band edge to edge inside `.page` (the hero wash, "Listed vs. smelled", the shelf planks) while keeping its content on the grid.

### Four breakpoints, not two

| | ≤ 719 phone | 720–1099 tablet | 1100–1599 desktop | ≥ 1600 large |
|---|---|---|---|---|
| content | 358 (16px gutters) | 100% − 64px, max 960 | 1280 | 1280, centred; bands and the hero wash bleed |
| header | 48px, hides on scroll-down | 56px, hides on scroll-down | 64px, static | 64px, static |

The tokens (`--gutter`, `--content-max`, `--page-max`, `--header-h`) switch at 720 and 1100. No module adds a breakpoint of its own: `@media (min-width)` in a module is 720, 840 (a two-column fold inside a section), 1100 or 1600, nothing else. Tablet is a real layout, captured and QA'd, not an untested midpoint. Above 1600 nothing stretches: the extra width goes to the full-bleed bands.

The header hides on scroll under 1100px only (`useScrollDirection` in `src/lib/hooks`). At 1100 and up it stays, because the fragrance rail is sticky against the header's height and a hiding header would leave a 64px hole above it.

## 4. Radii, borders, shadows

Radii have hierarchy; most surfaces are square and softness is reserved: `0` for images, sections, tables and the bottle stage; `2px` buttons, inputs, menus; `4px` popovers and tooltips; `12px` the bottom sheet's top corners and dialogs; pill for filter chips, status tags and avatars. Nothing else.

Shadows are warm and low and only floating layers cast them: `--shadow-pop` (`0 1px 2px / .10, 0 10px 28px −8px / .26`) for popovers and menus, whose borders are `--line-strong` so they detach from the page; `--shadow-sheet` for the bottom sheet; `--shadow-raised` (one 1px contact line) for inputs. Bottles get contact shadows in the render, not in CSS. No gradients, no glass, no glow.

## 5. Motion

Quiet by default so four signatures read as special: the atomizer press, the cap lift and spray, the Trail drawing on, and the shelf placement. Nothing grows on mount, nothing zooms on hover, nothing fades up on scroll, nothing spins idle.

Tokens: `--ease-evaporate` (eases out like something lifting off skin), `--ease-settle` (a hair of overshoot for an object placed on a shelf), `--ease-standard`, `--ease-exit` (the ease-in every overlay and cap leaves with); `--d-instant 90`, `--d-quick 160`, `--d-exit 160`, `--d-standard 240`, `--d-slow 420`, `--d-signature 900`. Every `animation` and `transition` references one. JavaScript reads them through `src/lib/motion.ts` (`duration('slow')`, `ease('evaporate')`, `easeFn()` for rAF loops, `reducedMotion()`), so the product's feel can be changed from one file.

Reduced motion renders final states: every `--d-*` goes to 0 and a safety net sets `animation-duration`, `transition-duration` to 0.001ms and `animation-iteration-count` to 1 on everything, so an animation that forgot its token still lands. The two things that must not even jump (card hover, the 3D auto-load) keep their targeted overrides.

## 6. Controls

- **Buttons**: `.btn` is the ink primary at 44px, one per screen. `.btn--quiet` is outlined at 36px for secondary controls; `.btn--bare` has no border; `.btn--small` is 36px.
- **Chips**: two pill styles only, outlined and ink-filled when on. Exclusions (`.chip--exclude[data-on]`) are oxblood-filled with porcelain text and always carry a "No" or an × as well, so colour is never the only carrier. No coloured dots inside chips.
- **Hit areas**: 44px minimum on `(pointer: coarse)`. Global classes grow their `min-height`; radio buttons inside a `radiogroup` grow by selector; module-scoped controls whose drawn box must stay small (`.del`, the steppers, `.views`, `.editBtn`, `.more`, compare's `.remove`, the discover `.seg` and `.match` buttons) add the `hit` class, which extends the target with an invisible pseudo-element.
- **Radio groups**: `useRadioGroup` in `src/lib/hooks` gives a row of buttons the ARIA pattern (roving tabindex, arrow keys, Home/End, wrapping) for score rows, the vote sheets, review kinds and the discover segments.
- **Inputs**: 16px (anything smaller makes iOS zoom), paper, `--line-strong` border, contact shadow, focus ring at offset 0.
- **Focus**: a 2px oxblood ring at 2px offset on everything focusable; never removed, never replaced by a colour change alone.

## 7. Data

- **No bar without a number.** Every bar, track, column and meter has its value in the DOM: a visible figure on the same line, or a `visually-hidden` "{pct}%" in the row. A chart is a table first; the hidden table and `describeTrail` stay.
- **Sample size is the brightest small text in a section**, not the faintest: the count in tabular 600 ink ("1,828 people"), the descriptor in `--fg-2`.
- Bars: one treatment. Label and value on one 13px line above a 6px linen track, fill in `--scent-ink` or the dimension hue, a 3px end cap in the note's hue, 24px rows. No dot before the label.
- Seasons are the `SeasonsGlyph`, never four grey columns with two leaves.
- Colour dots (9–14px) are retired everywhere in favour of the dipped-blotter glyph.

## 8. Null values, three phrases

- **"Not known yet"**: a fact nobody has sourced.
- **"Not enough votes"**: a community figure under the threshold.
- **"Not published"**: the house did not disclose it.

The hero drops a row rather than printing a null; tables keep the row in `--fg-3` italic. Perfumer: "Not disclosed" in both the hero and Details. Never "N/A", never a dash, never "New" meaning "few votes" (`ratingCount < 5` renders "Unrated"; "New" is for `status === 'upcoming'` or a release within 12 months).

## 9. Demo data

Labelled once in the hero, once in the sources table and once in the banner, and nowhere else on a page. Demo counts are at early-community scale (hundreds, not thousands). JSON-LD omits demo ratings.

## 10. The AI-tell checklist

Walk every page at 1440, 768 and 390 against this before calling it done. The question is "could this screenshot plausibly come from a generic AI SaaS template?" If yes, redesign it; do not solve it by making things strange.

- No wide-bold tight-tracked grotesque titles; no lowercase stretched wordmark; no 70px three-line headline over a search box.
- No tinted boxes around bottles in grids; no 4:5 plate walls; no identical-size bottles.
- No section template repeated eight times; no identical 48px padding; no five identical outlined buttons; no empty 300px rail.
- No `background: var(--paper)` on a thing that does not float; no sidebar "upsell" boxes; no dark four-column footer.
- No text under 12px; no information carried by shade or colour alone; no `title=` tooltips; no bar without a number.
- No hover zoom, no fade-up on scroll, no charts growing on mount, no "like" bounce, no idle spin, no torch-beam sheen.
- No "→" glyph links as the house link style (the arrow lives on the search submit only); no "Be the first to…"; no "Thanks."; no "Try asking"; no "Noun, verbed." taglines; no triplet in every lede; no agent-log text in sources; no "checked not yet"; no "New" meaning "few votes".
- No "Demo figures" more than twice per page; no demo counts shaped like a mature community.
- No seeded or invented reviews of real products; reviews are only ever real.
- No page left at the old dress because no critique covered it.
- No per-column sorted character rows on Compare; no "spr 86"; no 10px season labels; no 32px targets on phones; no two bottom bars.
- No site serif on bottle labels; no procedural box standing in for a bottle anyone knows.
- No em dashes in UI copy; copy is human and specific, with a point of view.

## 11. What must survive

The Trail concept and its fixed band order; the hero identity order (house, name, facts, rule, summary, quick facts, actions) and the 2px ink rule; "Listed vs. smelled" and the vote questions; the copy with a point of view; ink as the only action colour and the signal meanings; square plates and the radius ladder; Archivo + Newsreader with italic reserved for names; tabular figures; poster-first, 3D-second behind `autoLoad3d()`; bottom sheets with "Show N results"; the provenance model; optimistic shelf updates with rollback; the tab bar with Wear in the thumb position; and the research/legal stance: no scraping, no hotlinking, no copied CAD, illustrations credited as illustrations.
