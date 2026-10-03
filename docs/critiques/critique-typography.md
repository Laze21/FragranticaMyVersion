# Critique: editorial typography and hierarchy

Lens: typography. Judged against docs/00-brief.md §12–15 (editorial, tactile; "editorial display face paired with an extremely readable UI sans"; display/headline/body/caption/data scales; tabular figures; no "huge modern SaaS headings"; no untouched defaults) and §5A ("Beautiful typography" on the bottle stage).

Evidence base: tokens.css, globals.css, 40 CSS modules, the three font files (inspected with fontTools), and the 1440/390 screenshots cropped to viewport height.

## What must survive

- The Archivo + Newsreader pairing itself: both variable, self-hosted, OFL; Archivo's `wdth` axis (62–125) is real and used.
- Newsreader italic for fragrance names on cards, rows, links and the hero: the instinct is right, only its scope needs tightening.
- The 10-second summary in Newsreader roman (27px, 34ch, `text-wrap: pretty`) and "Our take" prose at 18px/1.6/70ch with `hanging-punctuation: first`.
- Serif placeholders in search inputs ("Describe it, or type a name", "vanilla without tobacco").
- Tabular figures on bar values, histograms and percentage columns; the `.tnum` utility.
- 2px ink rules as section openers (10-second read, feelings list, compare header) instead of boxes.
- 13px condensed eyebrows ("What it smells like", "Note of the week", "Explore by feeling").
- The feelings list: serif word + sans gloss, a contents page rather than a card grid.
- Condensed Archivo numerals on diary dates and trending ranks.
- Quiet 14px nav, 14px/600 buttons, no tracked-uppercase luxury clichés anywhere.
- `text-wrap: balance` on heads; the dotted Term affordance inside prose.

## Findings (severity-ranked)

### 1. [3] global / headings. The display voice is a wide, bold, tight-tracked grotesk, which is the startup look the brief bans
Every page title and section head is Archivo at 112–118% width, 650–720 weight, tracking −0.02 to −0.04em: "Find something", "Your shelf", "Wear diary", "Compare", "Sign in", "Lists", "Notes" (52px), "Dior", "François Demachy" (52px), home h1 "What do you want to smell like?" (70px, three lines), and every 32px section head ("How it moves", "Trending", "Citrus"). Wide + heavy + negative tracking is the Linear/Vercel/Notion headline idiom; the serif, which is the editorial character, is confined to names and prose. The brief asks for the opposite split: an editorial display face plus a readable UI sans.
Brief: §14 "editorial display face paired with an extremely readable UI sans"; §15 "huge 'modern SaaS' headings"; §12 "a design magazine".
Direction: make Newsreader roman the display voice. Page titles 44–52px (`--t-title-l`), weight 420, tracking −0.01em, line-height 1.02; section heads 28–30px (`--t-title-m`), weight 450; fragrance names stay italic. Keep Archivo wide (118%) only in the wordmark and in 12–13px eyebrows with +0.04em tracking, where wide-and-tracked reads as a magazine kicker. Delete every −0.03/−0.04em letter-spacing. Files: discover/page.module.css `.title`, profile.module.css `.title`, auth.module.css `.title`, ShelfView `.title`, DiaryView `.title`, compare `.title`, editorial `.title`, notes/page `.title`, sections.module.css `.title`, page.module.css `.askTitle` `.h2`, NotesBrowser `.h2`, u/[handle] `.name`.
Effort: M.

### 2. [3] fragrance / section hierarchy. Eight sections, one head size, no level between 17px and 32px
Every section is 32px head + 17px grey lede + 12px meta, 48px top padding, 20px head margin (sections.module.css `.section`, `.head`). Inside, the h3s ("Longevity", "Projection over time", "Seasons", "Day or night", "Listed by the house", "What people smell") are 17px/650: bold body, not headings. Below that, "Top / Heart / Base", "Listed", "People notice most" are 12px/600 fg-3. The ladder is 77 → 32 → 17 → 12 with nothing at 20–24, so the page reads as eight identical blocks rather than a page with a shape.
Brief: §14 "Establish display scale, headline scale, body, caption, data labels"; §15 "every section having identical vertical padding".
Direction: add `--t-h3: 1.25rem` (20px, Archivo 600, normal width, line-height 1.25) and use it for every in-section head; h4/eyebrow 12.5px/600 condensed 88% +0.02em fg-3. Give section heads two weights: primary sections (How it moves, Listed vs. smelled, Reviews) keep title + lede; secondary (Ratings, If you like this, Details and sources) take a 24px head with the lede folded into the meta line and 32px top padding instead of 48px.
Effort: M.

### 3. [3] cards / rating + count collision. "7.5 6" reads as "7.56"
FragranceCard.tsx:106–110 renders `<b>7.5</b><small>6</small>` with a 4px gap, 15px/650 next to 11px grey. On home ("Newest in the catalogue": Paradigme "7.5 6") and anywhere a count is under 1,000 the digits merge into a false score. Counts ≥1k ("1.9k", "2.3k") are 11px, below the token floor, and sit on a different baseline from the score.
Brief: §14 "Numbers matter heavily in this product"; §24 "Always show sample size".
Direction: never let a bare digit follow the score. Render `7.5` then `· 6` (middle dot, 6px gap) or `(6)`; count 12px fg-3 tabular; score 15px/650 tabular. Same fix for `.rowRating`. FragranceCard.module.css `.rating`, `.rating small`.
Effort: S.

### 4. [2] fragrance / trail chart axis. "Spray" is clipped to "Sprav"; chart type is 11px on a 900px plot
TrailChart.tsx:50 `axisH = 26`, axis group translated +8, text at y=18: the baseline lands exactly on the SVG's bottom edge, so descenders are cut (visible on desktop and mobile). Axis labels are 11px/500 fg-3, band labels 11px/600 condensed, phase labels 11.5px, all on a chart that is the product's signature visualisation.
Brief: §30 the signature visual must be "beautiful, understandable"; §19 readability.
Direction: `axisH = 32`, text `y = 16`; axis labels 12px tabular; band labels 12.5px/600; phase labels 12.5px/600 +0.02em. TrailChart.tsx:50,145,152; TrailChart.module.css `.axis text`, `.bandLabel`, `.phaseLabel`.
Effort: S.

### 5. [2] global / fonts. Newsreader is shipped without its optical-size axis, so every display setting is the 16pt text cut
fontTools on src/fonts/newsreader-var*.woff2: axes = `wght 200–800` only. Google's Newsreader variable has `opsz 6–72`; without it `font-optical-sizing: auto` (globals.css body) does nothing. The 77px italic "Sauvage"/"Bergamot"/"Amber" and the 27px summary are rendered from the text design: hairlines too heavy, fit too loose, serifs blunt. The museum-label hero loses exactly the crispness it is meant to have.
Brief: §5A "Beautiful typography"; §14 "Select typography intentionally".
Direction: re-export Newsreader with `opsz` (keep the subset small), keep `font-optical-sizing: auto`, and pin `font-variation-settings: 'opsz' 72` on `.t-title` and `'opsz' 18` on `.t-prose`/review bodies. Then re-tune `.t-title`: weight 380 → 400, tracking −0.012em → −0.005em, because the display cut is already tighter. layout.tsx:21–29, globals.css `.t-title`.
Effort: S.

### 6. [2] global / arrow glyph. "→" is missing from all three subset fonts; every arrow link is a fallback glyph
Archivo and Newsreader subsets lack U+2190–2193. "Read it in ten seconds →", "All autumn picks →", "The whole glossary →", "Where it comes from … →", "See all 7 →", "Spot something wrong? … →" and the hero "Arm's length → conversational" all render the arrow from Helvetica/Arial: thinner, smaller, sitting low (clearly visible on home at 1440).
Brief: §14 "untouched AI-builder default"; §16 plain language.
Direction: re-subset Archivo including U+2190–2193 and U+2197, or replace text arrows with the `Icon` 16px arrow aligned to x-height inside `.arrow-link`. In data, drop the arrow: "Arm's length, then conversational".
Effort: S.

### 7. [2] global / type scale discipline. 28 invented sizes contradict the token file's own rule
tokens.css says "components may not invent sizes", yet 40 modules hardcode 1.02, 1.04, 1.05, 1.06, 1.0625, 1.08, 1.1, 1.12, 1.15, 1.2, 1.22, 1.25, 1.3, 1.35, 1.4, 1.5, 1.6, 2.2rem and 10, 10.5, 11, 11.5, 15, 16px. Serif text alone appears at 16.3, 16.8, 17, 17.3, 18, 18.4, 19.2 and 20px (footer blurb, diary note, review body, quick take, prose, profile bio, house lede, notes lede). This is why nothing lines up across pages: each component is its own scale.
Brief: §14 "Establish display scale, headline scale, body, caption, data labels, numeric style"; §29 "Do not create arbitrary tokens".
Direction: add `--t-serif-s: 1rem`, `--t-serif: 1.125rem`, `--t-serif-l: 1.3125rem`, `--t-name: 1.25rem` (card names), `--t-name-s: 1.0625rem` (row/inline names), `--t-h3: 1.25rem`; replace every hardcoded value; enforce with stylelint `declaration-property-value-disallowed-list` on `font-size`.
Effort: M.

### 8. [2] global / sub-12px text. 26 uses of 10–11.5px, below the token floor
"not listed" flag 10.5px oxblood condensed (NoteTag), "Editorial"/"Community" source pill 10.5px/700 (Details), review focus tags 11.5px, counts 11px, compare season labels 10px, calendar day numbers 10px, mobile tab labels 11px, chart labels 11px, "Reformulated" 11px, `.tag` 10.5px. At 1440 with 40px gutters these are the least legible objects on the page while carrying meaning (provenance, "not listed").
Brief: §13 "Do not sacrifice readability for aesthetic subtlety"; §19 accessibility as product quality.
Direction: floor at `--t-micro` 12px everywhere; where something must read as smaller than its neighbour, change weight or colour, not size. Source pills 12px/650; "not listed" 12px; counts 12px.
Effort: S.

### 9. [2] fragrance / hero identity line. The house is set smaller than the nav
"Dior · Designer house" is 14px/600 (Hero.module.css `.house`); "Eau de Toilette · 2015 · by François Demachy" is 14px with three dotted terms. The brief's museum label lists Brand before Fragrance; here the brand is the smallest text in the block and visually a caption to the 77px name.
Brief: §5A "Beautiful typography. Brand. Fragrance. Concentration. Release year. Perfumer."
Direction: house link 18px Archivo 600 normal width, ink; "Designer house" 13px fg-3 after a middle dot; facts line 15px with the year tabular; only "Eau de Toilette" keeps a Term underline. Mobile: house 16px.
Effort: S.

### 10. [2] fragrance / Term underline overload. Eleven dotted terms on one page, heavier than the labels they sit under
Term.module.css sets a 1.5px dotted underline; on 12px `dt` labels ("Lasts", "Projection" in the hero grid; "Opening", "Heart", "Drydown"; "Longevity", "Projection over time"; "note list", "Concentration", "Designer house", "Perfumer") the dots are visually heavier than the text. When every label is a tooltip, none reads as one and the hero looks stippled.
Brief: §6 "subtle explanations accessible through tooltips"; §16 "Do not over-explain obvious UI elements".
Direction: thickness 1px, offset 0.25em, colour `currentColor` at 40%; on `dt` labels ≤13px suppress the dotted line and reveal it (or a 12px "?") on hover/focus; keep the dotted underline inside prose and ledes where it belongs.
Effort: S.

### 11. [2] global / sample-size meta. The one line the brief insists on is the faintest text on the page
SectionHead renders "1,828 people describing it · Settled · Demo figures" at 12px fg-3, right-aligned at the end of the lede row (sections.module.css `.meta`). Same for "2,948 people reporting", "2,506 people", "7,615 ratings".
Brief: §5F "Communicate sample size"; §4 "confidence indicator based on number of community votes"; §24 "Always show sample size".
Direction: 14px; count in tabular 600 ink ("1,828 people"), descriptor fg-2; on widths under 900px put it directly under the lede as its own line rather than floating right.
Effort: S.

### 12. [2] cards / brand eyebrow and foot. 12px grey brand above a 19.5px italic name
FragranceCard: `.brand` 12px/600 fg-3, `.name` 19.5px italic 420, `.foot` 12px, count 11px. At 1440 "Frédéric Malle", "Parfums de Marly", "Jean Paul Gaultier" are the hardest things on the card to read, and the row variant's rank numerals (22px, fg-3) are greyed out even though rank is the point of the list.
Brief: §14 "practical for dense database pages"; §13 contrast.
Direction: brand 13px/600 ink-2 +0.01em; name 20px italic 400 (`--t-name`); foot 13px; rating 15px/650 tabular; count 12px fg-3 after a middle dot. Row: rank 24px ink-2, name 18px (`--t-name-s`).
Effort: S.

### 13. [2] global / italic convention diluted. Italic no longer means "a fragrance"
The brief and tokens.css define italic Newsreader as fragrance names "like titles of works". Italic is also used for note names ("Bergamot", "Amber" at 77px), the twelve feelings ("Clean", "Dark", "Date night" at 32px), the glossary letters (A/B/C at 35px), and the "Reviewing / Sauvage" link; roman serif is used for list titles and panel titles. A reader cannot scan an italic string and know it is a fragrance.
Brief: §14 "Typography should create character"; tokens.css "Fragrance names: Newsreader italic, like titles of works".
Direction: italic = fragrance names only (hero, cards, rows, links, compare, diary, shelf). Notes, feelings, people, houses, glossary terms and letters = Newsreader roman. Files: notes/[slug]/page.module.css `.name`, page.module.css `.feelingWord` `.noteName`, editorial.module.css `.letterMark`.
Effort: S.

### 14. [2] global / inconsistent heading sizes for the same level
Section h2 is 32px (`--t-title-m`) on fragrance, home and notes index but 24px (`--t-head`) on note, house, perfumer, profile and diary pages. Page h1 is 52px sans on utility pages but 77px italic on fragrance/note pages. Users move between these pages constantly; the same semantic level changing size by 33% is the "no system" tell.
Brief: §14 "Establish display scale, headline scale"; §29 "a real design system".
Direction: one h1 per page type (object pages: 64–72px serif; index/utility/people pages: 44px serif roman), one h2 (30px), one h3 (20px). Map `.h2` in profile.module.css, u/[handle], DiaryView, notes/[slug] to the same token as sections.module.css `.title`.
Effort: S.

### 15. [2] global / wordmark. Lowercase wide-bold "wake" + a feather mark is a 2020s tech lockup
SiteHeader `.wordmark`: 20.8px, Archivo 118%, 720, −0.035em, forced lowercase. Even with the name as a placeholder (`APP_NAME`), the treatment sets the tone: it reads as a dev-tools brand, not a publication.
Brief: §12 NOT "generic startup"; §28 "capable of becoming a noun people use naturally".
Direction: a masthead. `APP_NAME` in Newsreader italic 500 at 22px header / 24px footer, natural case, no forced lowercase; or Archivo 700 at normal width. Drop `text-transform: lowercase` and the −0.035em tracking. SiteHeader.module.css `.wordmark`, SiteFooter.module.css `.brand`.
Effort: S.

### 16. [2] home / h1. The question is a 70px three-line grotesk; the search is the point
`.askTitle` 70px/700 wide, −0.04em, three lines, above a 24px serif input. A prompt is not a headline; this is the "giant headline + CTA" hero in left-aligned clothing.
Brief: §11 "Do NOT create the AI-template layout: centered giant headline"; §15 "huge 'modern SaaS' headings".
Direction: Newsreader roman 400 at 44px desktop / 32px mobile, max 18ch, line-height 1.1; the input becomes the loud element (30px serif italic placeholder, 2px ink rule, 64px tall); dateline 13px Archivo condensed +0.04em eyebrow.
Effort: S.

### 17. [1] fragrance / headline figures. Condensed sans numerals are a third display voice beside the italic
`7.5 /10` at 52px and "7–10 hours" at 28px use `.t-figure` (Archivo 82% width, 560): a scoreboard/DIN texture next to a 77px Newsreader italic. "hours" is set in the same weight as the number.
Brief: §14 "numeric style"; §12 "a design magazine".
Direction: headline figures ≥28px in Newsreader roman 400 with `font-variant-numeric: tabular-nums lining-nums`; unit ("/10", "hours") in Archivo 13px fg-3 baseline-aligned. Keep `.t-figure` condensed for data ≤20px (bars, histogram, compare, diary dates).
Effort: S.

### 18. [1] global / underlined italic names. Display-size serif links wear a default 1px underline
Review composer "Reviewing / Sauvage" 32px italic underlined; compare column names underlined; hero "Compare with: Acqua di Giò, Wood Sage & Sea Salt" underlined and wrapping to two lines.
Brief: §15 "default … appearance is not" allowed.
Direction: for serif-italic name links `text-decoration: none`, underline on hover only; where an underline is needed for discoverability, `text-decoration-color: var(--line-strong)`, thickness 1px, offset 0.14em.
Effort: S.

### 19. [1] learn / glossary entries read as a link list
Every term is a 17px/650 Archivo link with a full underline; definitions 14px fg-2; letters 35px italic fg-3.
Brief: §6 "Create note pages as actual educational destinations".
Direction: term 20px Newsreader roman 500, no underline (entry is the link, hover underline); definition 15px sans fg-2 at 60ch; letter 40px Newsreader roman fg-3.
Effort: S.

### 20. [1] notes / index entries have no rhythm
157 entries at 16px Archivo 650 + 14px description under 32px sans family heads; "Fizzy descriptor" flag 11px.
Brief: §14 "practical for dense database pages".
Direction: note name 18px Newsreader roman 500; descriptor flag 12px condensed; description 14px; family head 30px serif roman; "157 notes" tabular.
Effort: S.

### 21. [1] compare / mobile sticky header crowds three italic underlined names
At 390px: A/B/C badges + 15.7px italic underlined names ("Bleu de Chanel" wraps to two lines) + × buttons in one row.
Brief: §5J "Make comparisons excellent on mobile".
Direction: names 15px italic, no underline, single line with ellipsis, house dropped; or a three-row legend under the badges. compare/page.module.css `@max-width 839 .nameLink`.
Effort: S.

### 22. [1] fragrance / details and sources. dt and dd differ by colour only
`.facts dt` 14px/600 fg-3 vs `dd` 14px/540 ink; the sources list stacks field (14px), pill (10.5px), value (14px), note (12px), confidence (12px) within a 10.5–14px band.
Brief: §23 provenance is "a major strategic advantage"; §19 "no information communicated solely through color".
Direction: dt 13px/600 condensed 88% +0.02em fg-3; dd 15px/500; source-type pill 12px/650; confidence line 12.5px with the level word at 600.
Effort: S.

### 23. [1] diary / calendar numerals at 10px
Day numbers 10px fg-3 inside 40px cells; entry dates 25.6px condensed with weekday 11px.
Brief: §19 readability.
Direction: day numbers 12px tabular; entry date 28px with "Oct Fri" 12px condensed +0.04em.
Effort: S.
