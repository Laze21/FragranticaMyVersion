# Vibe-code audit: "could this have come from an AI SaaS template?"

Lens: skeptical designer, brief section 35. Reviewed every screenshot in `scratchpad/shots` at 1440 and 390, sliced to viewport height, plus the component sources behind each repeated pattern and the raw bottle assets in `public/bottles`.

Verdict first. The foundation is not a template: the palette is a warm neutral with ink-only CTAs, the radii have a real hierarchy (0 / 2 / 4 / 12 / pill), there are no gradients, no glass, no shadows outside popovers, no three feature cards, no testimonials, and the Trail is a genuinely bespoke mark. A skeptic would not say "Claude made this" from the token file. They would say it from the screenshots, and for three reasons that sit above everything else: the bottle renders, the grid of identical grey plates those renders sit in, and a fragrance page that is a 7,356px single-column wall of identically-dressed sections. Fix those three and the rest of this list turns a competent prototype into something that reads as designed.

Note on the screenshots: every page shows the Next.js dev badge (the black "N" circle, bottom left). The client is judging dev-mode captures. Shoot production builds before the next review.

## Keep (must survive the redesign)

- Colour roles: porcelain page, ink text and ink-only buttons, linen for wells and tracks; oxblood / bergamot / juniper reserved as signals; no coloured CTAs, no gradients, no glassmorphism anywhere.
- Type pairing: Archivo with its width axis for UI and labels, Newsreader for prose and ledes, fragrance names always in Newsreader italic; tabular lining figures on every number.
- Radius hierarchy and the fact that plates, inputs, tables and the bottle stage are square.
- The Trail: the shape (nib, swell, long taper), the phase bands, the "typical end" dashed line, the scrub tooltip, and the logo mark derived from it.
- The hero quick read: 2px ink rule, "What it smells like" in Newsreader at ~28px, plain-language summary, then Lasts / Projection / Best for / When / Price / Compare with as a six-cell dl.
- "Listed vs smelled" as a thesis: listed notes on the left, perceived shares on the right, "Not on the list, but people smell it", "Listed, but rarely noticed".
- Performance as distributions with sample size, the "Divisive" read, projection-over-time rows, and the "Percentages are fits votes out of 2,506, they don't add up to 100" footnote.
- Sticky section nav on the fragrance page; sticky filter rail and "Filters (2)" bottom sheet on discover; 44px targets throughout.
- The shelf ledge (bottles standing on a wooden ledge, favourite heart, format tag) and the "Your shelf, read back" sentences.
- The sources table with source type, confidence and verified state, and the demo-data banner. This honesty is a differentiator; keep it, just stop repeating it per section.
- Copy register where it is already human: "Worn it?", "What do you smell?", "Marketing says for men; this is what wearers actually do", "Nothing matches all of that. Our catalogue is still small."
- The no-results state that offers to relax one constraint at a time.
- The custom icon set, the atomizer press + puff, the shelf settle, the mist-to-notes transition. These are the motion budget; everything else should go quiet.

## Findings (severity-ranked)

### 1. [3] global / bottle renders. Every bottle is the same procedural glass box.
What I see: 50 webp posters, all 900x1200, all at the same three-quarter angle, same flat matte lighting, same soft contact blob, same scale, the label always centred and typeset in the site's own Newsreader italic. Chanel N°5 is a rounded slab with a yellow rectangle for juice; Good Girl is a blurry navy cone with no heel, no facets, no gold detail; Aventus is a grey slab with a grey cylinder cap; Black Opium has no sequins, no pink. There is no refraction, no edge highlight, no meniscus, no cap material (lacquer vs metal vs plastic all render as the same matte), and the liquid is a flat tinted rectangle behind a flat tinted pane. At 260px in the grid they are interchangeable grey boxes; at 520px on the hero they are obviously generated. This single asset class is the loudest "AI made this" signal on the site and it directly fails "treat the bottle like an object in a digital museum" and "make fragrances feel like physical objects".
Brief: 5A Bottle Stage, 5B, 12 (let photography and fragrance objects breathe), 32 (seed experience), 35.
Direction: a reference-driven per-bottle pass, not a parametric builder. For each catalogue item: collect reference photos, write a spec (silhouette path, shoulder and heel profile, cap shape and material, collar, label position and size, juice colour and fill level), model it as a GLB, and render the poster from that same GLB so poster and 3D always match. Render with physically-based glass (transmission, IOR 1.5, real thickness), a separate liquid mesh with a meniscus, a studio HDRI for reflections, a cap with correct roughness/metalness, camera at ~35mm with a few degrees of per-bottle variation so the shelf is not a row of clones, baked contact shadow and a faint floor reflection, exported at 2x (1200px tall) with alpha. Labels: the house name and fragrance name in a neutral engraved sans or embossed with no text, never the site serif; the site font on the bottle is what makes every brand look like the same brand. Acceptance test: an enthusiast recognises the bottle at 200px without reading the name. Where a reference cannot be matched, keep the "illustration, not a product photo" credit; it is honest and should stay.
Effort: L.

### 2. [3] global / fragrance cards (home, discover, house, perfumer, note, similar, profile). Twenty-four identical 4:5 grey plates per screen.
What I see: `FragranceCard` plate variant: a 4:5 box filled with `--scent-wash`, bottle `object-fit: contain` at `center 62%`, name, Trail, "Sweet · Warm 7.6 7.8k". Discover shows 24 of them in a 4-column grid with 32px gutters; home shows 6 + 4 + 7; house 4; note 4; similar 8. Every plate is the same size regardless of whether the object is a tall flacon (Aventus) or a squat jar (Naxos), so bottles are rescaled to fit and lose their real proportions. This is the Shopify/PLP grid and it is what the brief means by "everything existing inside cards" and "overly symmetrical layouts". The brief invokes Discogs and a record collection: objects at their own scale, on a shared surface.
Brief: 15 (cards only where semantically appropriate; overly symmetrical layouts), 12, 11.
Direction: remove the box. `.ground { background: none; aspect-ratio: auto; height: 240px }`, `object-position: center bottom`, bottles standing on a shared 1px floor rule (`::after`, `--line`, left/right inset 10%) with their baked contact shadow, so a row reads as a shelf of different objects, not a sheet of stamps. Scale by real height: store `bottleHeightMm` in the seed and map it to 55–100% of the slot height so a 50ml flacon and a 200ml splash differ visibly. Keep `--scent-wash` only on the fragrance hero stage and the home feature. On discover, drop to 3 columns at 1440 (currently 4) with a 5/7 column rhythm every third row (one bottle shown at double width with its summary sentence), which gives the asymmetry the brief asks for and surfaces the 10-second read in the grid. Reuse the Shelf page ledge component for "Officially listed in" on note pages and "Fragrances" on perfumer pages.
Effort: M.

### 3. [3] fragrance / page body. Eight sections with the identical dress, stacked in one column, with the right third of the desktop viewport empty for 6,000px.
What I see: below the hero, every section is: 32px wide-Archivo title + grey Newsreader lede explaining the section + a meta row "1,828 people · ▮▮▮ Settled · ○ Demo figures" + content + an outlined quiet button ("How does it read to you?", "What do you smell?", "How did it perform on you?", "When would you wear it?", "Rate it"). `sections.module.css` gives every section the same `padding-top: 48px`. The content column is 916px of a 1360px page; beside it, after the "Worn it?" box, nothing. On a 7,356px page that is the "every section having identical vertical padding" and "giant unused whitespace" tells at the same time, and it is the opposite of progressive disclosure: the enthusiast layer is a wall, not a drill-down.
Brief: 5 (highest polish), product philosophy (10 seconds / 20 minutes, progressive disclosure), 15, 18 (desktop: sticky information rail, split layouts).
Direction: at ≥1100px, make the body a 7/4 grid. Main column holds the sections; the 4-col rail is sticky and contextual: it shows, for whichever section is in view (reuse the SectionNav intersection logic), that section's sample size, its confidence bars, the one demo-data note, and the one vote CTA for that section. The five identical outlined buttons collapse into one that changes label with scroll. Then vary the sections themselves so they are not five copies of one template: "Listed vs smelled" as a two-column table under a single 2px rule, no lede; "How long, how loud" full-bleed on linen (the only tinted band on the page); "When to wear it" as a compact three-up with the seasons glyph at the top; "Ratings" and "Reviews" share one heading row. Padding: 64 / 40 / 56 / 40 / 72 rather than 48 everywhere. Collapse "Details and sources" and the sources table into a `<details>` opened by the sticky nav's "Sources" link; the facts table stays visible.
Effort: L.

### 4. [2] global / typography balance and wordmark. The wide bold grotesque carries every title; the editorial face is only allowed on names.
What I see: "What do you want to smell like?" at ~84px / 700 / 112% width / -0.04em; "Find something" at 96px; "Compare", "Your shelf", "Wear diary", "Sign in", "Lists", "Notes", "Learn the words", "Demo Account" all at 52–96px in the same stretched Archivo; every H2 (Trending, Made for autumn, How it moves, Ratings…) in the same face at 32px; the wordmark "wake" lowercase, 720 weight, 118% width, -0.035em. Newsreader appears only on fragrance names, ledes and prose. That inversion is why the pages read "product launch" rather than "fragrance journal": lowercase stretched grotesque wordmark + huge grotesque H1 + grey lede is the 2023 startup landing page, which the brief names as "huge modern SaaS headings".
Brief: 14 (editorial display face paired with a readable UI sans; avoid untouched defaults), 15, 12 (a design magazine, a fragrance journal).
Direction: invert the balance. Page titles and section H2s move to Newsreader roman (not italic, reserve italic for names), tracking 0, at t-title-l for page titles (max 52px) and t-title-m for sections; Archivo keeps labels, data, buttons, nav and the ten-second facts. Utility pages (discover, compare, shelf, diary, sign-in) do not get a display-size H1: the title sits on the same line as the page's controls at 28px (shelf title next to the view switch; compare title next to the picker), the way a database page would. Home keeps one large statement, but set it in Newsreader at ~64px so the brand's one display face is on the first screen. Wordmark: Title case, Newsreader roman at nav x-height, with the Trail mark; or make the Trail mark alone the logo and let the name be plain text. Keep `APP_NAME` tokenised.
Effort: M.

### 5. [2] global / Trail thumbnails. The signature mark repeated 30 times per screen at a size where it is a smear.
What I see: `TrailThumb` at 160x30 under every card name and 120x22 in every row; 13 muted hues in bands 1–3px tall with a 0.6px porcelain gap. On home, Le Male and Coco Mademoiselle thumbnails are indistinguishable; on the trending list, nine near-identical feathers in a column. At this size the mark reads as a multicoloured stripe, which is exactly the "coloured bars" the brief wanted to replace, and the repetition devalues the one visualisation that is supposed to be recognisable.
Brief: 5E (recognisable, not decorative), 30 (one original visual feature; useful rather than decorative), 15 (component repetition).
Direction: two sizes with two fidelities. Card size: top 3 dimensions only (`topDims(…, 3, 0.15)`), `minShare: 0.12`, gap stroke 1px ink at 20% so the silhouette has an edge, the dominant band filled with the fragrance accent so each thumb has one colour identity. Place it on the plate (bottom-left, 96x18) rather than as its own row in the card body, so the body is brand / name / "Sweet · Warm · 7.6". Row variant: drop the Trail entirely; show the two-word character instead. Full 13-band Trail only in the fragrance hero, the compare table and the house/perfumer signature (see 6). The glyph becomes rarer and therefore recognisable.
Effort: S.

### 6. [2] global / charts. One chart type (coloured dot, label, grey track, dark fill) on six page types.
What I see: `CharacterBars` on house ("House signature"), perfumer ("Their work, in character"), profile ("Scent identity"), shelf sidebar; and the same dot-label-bar row inside "What people smell", "Weather", "Occasions", the four rating sub-scores and compare "Character". It is the admin-dashboard bar list. The seasons chart uses four grey columns with icons where spring and autumn share the same leaf (`SEASON_ICON` maps both to 'leaf'); on compare the seasons are 24px blocks labelled "spr 86" in 9px; on shelf they are solid black columns with no values.
Brief: 5E (do not use a generic chart), 30, 29 (chart style), 19 (no information solely through colour).
Direction: house, perfumer and profile character becomes a Trail (average the fragrances' trails; the builder already takes a character map), captioned "Average of 4 fragrances". Bars stay only for percent-of-votes data and get one distinctive treatment: no dot; label and value on one 13px line above a 6px ink track with the note's hue as a 3px end cap; 24px row height instead of 34. Seasons: one four-track glyph used everywhere (fragrance, compare, shelf): four 12px-wide columns on a 2px baseline, labels "Sp Su Au Wi" in tabular caps underneath, value on hover/below, no icons. Ratings sub-scores: a 1–10 dot-plot on a shared axis instead of four bars, so the four numbers are read against each other.
Effort: M.

### 7. [2] home / Explore by feeling. A 3x4 feature matrix.
What I see: twelve rows in three equal columns, each "italic word + grey sentence", hairline under each, 2px ink rule on top, identical weight everywhere. Symmetric, evenly paced, nothing is primary. It is a pricing-table rhythm applied to discovery copy.
Brief: 11 (Explore by feeling as an editorial module), 15 (overly symmetrical layouts, generic grid for everything).
Direction: make it a contents page with a lead. Two unequal columns (5/7). Left: the three feelings that fit today's season and weather, set at t-title-m with their sentence and the match count ("Cold weather · 14"); right: the other nine as a running line of links separated by middle dots, sentence revealed on hover/focus and on tap on phones. The counts come from the same `FEELINGS` filters already wired to discover, which also makes the module database-honest. Vary row heights: the lead items get 24px rows, the run-in list is one paragraph.
Effort: S.

### 8. [2] fragrance, diary, shelf, sign-in / paper sidebar boxes. The upsell card.
What I see: "Worn it? Sign in to log wears…" in a paper box with a full-width black button (fragrance rail); "This month" paper box (diary); "Your shelf, read back" paper box (shelf); "Just looking around? Use the demo account" paper box (sign-in); "No reviews yet." paper box (reviews). Same `background: var(--paper)`, same 24px padding, same place (right rail or under the form). In a layout that otherwise uses rules instead of boxes, these read as the SaaS sidebar CTA card. There are 41 `background: var(--paper)` declarations in the modules.
Brief: 15 (everything inside cards; cards only where semantically appropriate).
Direction: delete the box backgrounds on all five. Treat each as a typographic aside: 2px ink top rule (the same device the hero quick read uses), heading in Newsreader at 20px, body at t-small, one text link or one quiet button, left-aligned, max-width 34ch. Reserve `--paper` for raised surfaces that actually float (popover, sheet, inputs) and for empty states that need a visible region on a long page (reviews empty state keeps a dashed 1px `--line-strong` border instead of a fill).
Effort: S.

### 9. [2] home / Note of the week. The content does not match the heading.
What I see: "Note of the week: Amber" with Cool Water (Clean · Fresh), 1 Million, Le Male and Bleu de Chanel beneath. The module picks the four most popular fragrances that list the note, so a citrus aquatic appears under Amber. A reader who knows fragrance sees a generated page; a beginner is taught something wrong. This is the content-shaped version of an AI tell.
Brief: 4 (official vs perceived), 6 (note pages as educational destinations), 16 (specific), 32 (believable seed content).
Direction: rank by perceived share (`perceived_note_votes` ≥ 40% notice it) and print the share on each card ("63% smell it"), falling back to listed-as-base-note. Cap at three bottles and use the fourth slot for the note's blotter swatch and "where it comes from" sentence. The module then demonstrates the product's thesis on the front page.
Effort: S.

### 10. [2] discover / natural-language query. "vanilla without tobacco, under $100" returns the whole catalogue without comment.
What I see: in the second discover capture the typed query is "vanilla without tobacco, under $100"; the result is "50 fragrances", no "We read that as" row, no filters set. `interpret()` returned nothing understood, so the page silently showed everything. A skeptic reads this as a demo search box.
Brief: 7 (search should be a major advantage; example queries include "under $100"), 33 (states), 16.
Direction: never fall through silently. If `interpret()` understands part of a sentence, apply the part and show "We read: No tobacco · Vanilla. Couldn't read: under $100 → set a price" with the unparsed fragment as a link to the matching filter group. If it understands none of it and FTS has no hits, show the no-results state, not the catalogue. Teach `interpret()` the brief's own examples: price ("under $100", "cheap"), longevity ("lasts 8+ hours"), similarity ("like Bleu de Chanel but less common"), season/weather, "not citrus-heavy".
Effort: M.

### 11. [2] global / copy. The triplet cadence and the explanatory lede on every section.
What I see: "Your shelf, your diary, your votes." / "Shortlists, starter kits and rotations, made by people who actually wear the things on them." / "Ranges, not promises. Skin, climate and how many sprays you use all move these numbers." / "Bright, loud and very easy to like." / "Fresh shirt, warm skin, a little soap." / "Salt, citrus, sun on skin." / "Smoke, resin, leather, late hours." The rule-of-three is in nearly every lede, which is the fingerprint the project's own research note names. Every section also opens by explaining itself ("Every fragrance changes on skin. The Trail shows its character over time…", "Share of people who say it fits each moment…", "Enjoyment only. How long it lasts lives in its own section so a quiet beauty isn't punished twice."), which is "over-explaining obvious UI elements". Five home links end in "→" ("Read it in ten seconds →", "All autumn picks →", "The whole glossary →"…), the template "more" link.
Brief: 16 (human, specific, confident; do not over-explain), 15.
Direction: cut section ledes to one clause or delete them; keep the explanation in the Term popover for the word that needs it ("Trail" gets a Term). Break the triplets: rewrite a third of the feeling lines as a single image ("Clean: a shirt straight off the line"), a third as a question ("Rainy day: what do you wear when the light goes grey?"), leave a third. One link style sitewide: underlined text, no arrow glyph; the arrow appears only on the search submit. Keep the sentences that already carry a point of view ("it smells good and it smells everywhere").
Effort: S.

### 12. [2] fragrance / note pennants. The one decorative shape, used ~60 times on a page, and every note shown twice.
What I see: `NoteTag` is a clip-path pennant with a 22px colour-stained tip. The Journey shows listed + noticed notes per phase (three columns, up to 7 pennants in a wrap for Heart), then "Listed vs smelled" shows the same listed notes again as pennants in Top/Heart/Base, then the perceived list shows them a third time as pennants beside bars. Dense rows of pennants read as a chevron breadcrumb, and the duplicated content makes the page longer without adding information.
Brief: 5D (scent journey), 4 (official vs perceived should be extremely easy to understand), 15 (component repetition).
Direction: the pennant lives only in the Journey, where phase and time give it meaning. In "Listed vs smelled", listed notes become a compact inline list in Newsreader with a 2px underline in the note's hue (the "Reads clean and fresh" treatment, already the best-looking note styling on the page); the perceived list drops the pennant and keeps label + bar + value. Remove "Listed" from the Journey phases (keep "People notice most") so each note appears exactly once as listed and once as perceived.
Effort: S.

### 13. [1] global / footer. The dark four-column SaaS footer.
What I see: ink background, brand + blurb left, "Explore / Yours / How this works" columns, hairline, disclaimer; ~420px of black on every page, including sign-in where it is taller than the form.
Brief: 11 (not the AI-template layout: … footer), 12.
Direction: a colophon, not a footer. Porcelain background, 2px ink top rule, the blurb in Newsreader on the left, every link in one running line on the right separated by middle dots, the disclaimer in t-micro underneath; ~160px tall. If a dark band is wanted somewhere, use it once on the home page as the "note of the week" band instead.
Effort: S.

### 14. [1] fragrance / hero actions. Two black primaries and a hint for a mode that is not on.
What I see: "Explore the scent" (ink) under the bottle, "Add to shelf ▾" (ink), "Wearing it today" (outline), "♡" (outline square) on the right; "Drag the bottle to turn it" beside the button. Two filled primaries on one screen, four button shapes in one view.
Brief: 5A (keep this tasteful), 17 (motion should be mostly quiet), 35 (buttons).
Direction: one primary per screen. "Explore the scent" becomes a quiet text button under the bottle (and the atomizer nozzle itself is clickable with a 44px hit area, cursor pointer, a tooltip "Press to spray"); "Add to shelf" is the only ink button; "Wearing it today" and the heart become one outlined group with a shared border. Show "Drag the bottle to turn it" only in `mode === '3d'` (already gated) but render it under the stage, not inline with the button, at t-micro.
Effort: S.

### 15. [1] global / motion. Charts grow on mount; plates zoom on hover.
What I see: `grow`, `rise`, `fill` keyframes on bars in sections, WhenToWear, Ratings and Performance run at mount, most of them below the fold where nobody sees them; `.plate:hover .img { transform: scale(1.025) }` is the ecommerce hover zoom. The motion budget is supposed to be the atomizer, the mist and the shelf placement.
Brief: 17 (quiet motion system), 15 (unnecessary hover movement).
Direction: remove the data-entrance animations; keep settle (bottle, shelf), press, puff/mist, popover drift and sheet up. Replace the hover zoom with nothing on the image and a 1.5px underline on the name (already there); if a hover signal is wanted on the object, slide the sheen already built for the hero stage across the thumbnail at 40% strength.
Effort: S.

### 16. [1] discover / filter rail. Three pill styles and dotted swatches on one screen.
What I see: outlined pills with a 9px coloured dot (Character), outlined pills without (Season, Time, Weather), ink-filled pills with × (active), pastel bergamot and oxblood pills ("We read that as"), plus a three-way segmented control and two text inputs, all in a 272px rail. The coloured dot pill is the tag cloud.
Brief: 15 (excessive pill-shaped controls; pills for filters are fine but one style), 7.
Direction: two pill styles only: outlined and ink-filled. "We read that as" becomes plain text with the understood terms underlined in bergamot/oxblood, not pills. Character filters: a single 13-swatch strip (the Trail legend) with the label under each swatch, toggles on click, which teaches the fingerprint vocabulary while filtering. Keep the segmented control.
Effort: S.

### 17. [1] compare / seasons and projection rows. Illegible micro-glyphs and a redundant arrow.
What I see: seasons as four 24px blocks with "spr 86 / sum 71" in 9px; projection "Conversational → conversational" for Bleu de Chanel.
Brief: 5J (compare should be a core feature, excellent on mobile), 5F.
Direction: use the shared seasons glyph from finding 6 at 40px tall with values on a second line; suppress the arrow when opening and later projection are equal and print one word. On mobile the A/B/C rows already work; keep them.
Effort: S.

### 18. [1] global (mobile) / chrome stack. 180px of chrome and the raised round "Wear" tab.
What I see at 390px: a two-line prototype banner (60px), the header (60px), the tab bar (60px) with a raised black circle for "Wear" in the middle, the Instagram-era primary tab. Sign in appears twice (header and tab bar).
Brief: 18 (mobile designed intentionally), 15, 26 (trust).
Direction: banner to one line, "Prototype · demo data · How this works", dismiss persists in localStorage; drop "Sign in" from the header on phones when the tab bar shows it; the Wear tab is the same shape as the others, distinguished by a filled atomizer glyph and an ink label, not a floating circle. Keep the tab bar.
Effort: S.

### 19. [1] diary / calendar. Three months of grey cells with unlabelled coloured dots.
What I see: Aug / Sep / Oct as three grids of 40px linen cells; wears are coloured dots keyed to the fragrance accent with no legend; empty cells are the same grey as filled ones. It reads as a contribution graph, and the colour carries the only information.
Brief: 9 (wear diary as a retention loop), 19 (no information solely through colour), 15.
Direction: one month at a time with prev/next, cells 56px on desktop with the bottle thumbnail (row variant image, 24px) in the cell instead of a dot, a one-line legend under the grid, empty cells with no fill and a hairline. The "This month" aside (finding 8) carries the counts. On phones, a horizontal week strip with the bottle thumbnails.
Effort: M.

### 20. [1] note / hero decoration. A floating yellow pennant in empty space.
What I see: at 1440 the note hero is a linen band with the title at the left and a 60x220 yellow blotter strip floating at the far right, 900px away, with nothing between. Isolated, it is the "meaningless abstract blob".
Brief: 15 (meaningless abstract blobs; giant unused whitespace), 6 (note pages as destinations).
Direction: make the strip the note's swatch and put it beside the title: a 28px-wide blotter with the note name set vertically on it, tip dipped in the hue, directly left of "Bergamot" at the same height as the cap height. Fill the right of the band with the "What it smells like" sentence (currently below the band) so the hero does the ten-second job.
Effort: S.

### 21. [1] fragrance / meta noise. Dotted-underline terms on half the labels; "○ Demo figures" six times.
What I see: Term popovers (dotted underline) on "Eau de Toilette", "Lasts", "Projection", "note list", "Longevity", "Projection", "Concentration", "Designer house", "Opening", "Heart", "Drydown"; "○ Demo figures" in bergamot ink in every section's meta row although the page banner already states it.
Brief: 6 (subtle explanations), 16 (do not over-explain), 32.
Direction: Term underline on first occurrence per page only (track in a page-level Set); the demo flag once, in the hero rating row, and once in the sources table; section meta rows show sample size and confidence only.
Effort: S.

### 22. [1] home / trending list. Starts at 2, and the same metric has two names.
What I see: the ranked list reads 2, 3, 4 … 9. The feature box above is "Most worn this week"; the list is "Most logged in wear diaries over the last 30 days". Same data, two labels, and the missing №1 looks like a bug.
Brief: 11, 16.
Direction: label the feature "№1 · most worn this week" in the kicker and caption the list "2–9"; or feature a different signal (new release, editorial pick) and run the list 1–8. One name for the metric.
Effort: S.
