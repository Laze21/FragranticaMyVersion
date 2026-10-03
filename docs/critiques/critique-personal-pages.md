# Critique: personal pages (shelf, diary, profile, lists, compare, review composer)

Lens: `personal-pages`. Judged against brief §5H (reviews), §5J (compare), §8 (shelf), §9 (diary), §10 (social), plus §15 (AI tells), §18 (mobile), §19 (touch targets), §24 (ratings). Screenshots: `shots/{shelf,diary,profile,lists,compare,review}-{d,m}.png`. Code: `src/components/{shelf,diary,compare,reviews}`, `src/app/{compare,lists,u,shelf,diary}`, `src/app/fragrance/[slug]/review`.

## Keep (must survive the redesign)

- The neutral system: porcelain page / paper raised surfaces, ink as the only action colour, square plates and tables, 2px inputs, pills reserved for statuses and filters. It is already not the shadcn/Tailwind look.
- Newsreader italic for fragrance names (titles of works), Archivo for UI, tabular numerals on every stat (`.tnum`, `font-variant-numeric`).
- The shelf metaphor itself: bottles standing on a plank, `settle` ease on placement, status tabs that match the brief's vocabulary (On the shelf / Testing / To sample / Sampled / Wishlist / Owned before / Favourites), per-bottle format, size, fill, batch, price in the edit sheet, CSV export.
- Compare: A/B/C letter badges, serif "Smells like" summaries as the first row, Trail glyphs drawn at one time scale, shared notes bolded on a bergamot wash, sticky column header, shelf-overlap as a community signal.
- Diary: "Log a wear" with the atomizer icon and the 300ms press keyframe, "What are you wearing? Pick up to four if you're layering", the Layered tag, calendar with per-fragrance accent dots, the native `<dialog>` bottom sheet on phones, the Wear tab in the thumb-reach bar.
- Insights voice: "Your shelf, read back", "You own 2 fragrances featuring ambroxan", thresholds on the sentences so they never over-claim (brief §8 "avoid creepy or overconfident personalization").
- Composer: Quick take vs Full review as the first decision, ownership + "Your diary shows 44 wears; that's shown next to your review", free-bottle disclosure, "Reviews are public. Be specific, be fair, and never paste text from another site."
- Lists copy and titles ("Vanilla without the tobacco", "Fresh, but not the usual blue bottle", "made by people who actually wear the things on them").
- Demo-data flags on everything that is seeded.

## Findings (severity-ranked)

### 1. Shelf (desktop) – the shelf view is three bottles on a stick in a 900px void  — severity 3
**Area:** shelf ledge, `ShelfView.module.css .ledge/.bottle::after`. **Brief:** §8 "visually enjoyable, not a spreadsheet", §15 "giant unused whitespace".
Three 132px bottles sit on a 10px gradient bar that is only as long as the bottles (`::after` per bottle, left/right -8px), occupying ~430px of a ~930px column; from y≈560 to y≈1180 the left column is empty porcelain while the 320px insights panel runs down the right. The plank reads as a short brown stick, not furniture.
**Direction:** make the ledge a real surface. The plank is a `border-bottom: 14px` on the `ul` (full column width, 1px darker lip on top, 24px soft shadow falling onto the "wall" below), bottles 168px tall on desktop with `object-position: bottom` and a per-bottle contact ellipse in `--scent-wash` behind the base. For editable shelves the last slot on the ledge is a dashed bottle silhouette labelled "Add a bottle" that opens the same suggest-search used in the diary sheet. When fewer than 6 bottles are owned, cap `.main` at 720px and let the insights column sit beside it instead of 400px away. Under each bottle add a third 11px line: `worn 44× · last Tue` and a 36px×2px fill bar from `fill`. **Effort:** M.

### 2. Compare (phone) – one column, 4,448px tall, no side-by-side anywhere — severity 3
**Area:** `compare/page.module.css @media (max-width: 839px)`. **Brief:** §5J "Make comparisons excellent on mobile. This should be a core feature rather than an afterthought", §18 "excellent comparison UI".
Every one of the 15 rows stacks A, B, C vertically with a letter badge, so a user scrolls 2,000px past "Character" (12 rows of bars) before reaching "Lasts". Nothing is ever beside anything; it is the desktop table linearised.
**Direction:** at ≤839px keep the sticky name row and switch short-value rows (Lasts, Projection, Rating, Price, Released, Concentration, Perfumer, Best for, Seasons, Shelf overlap) to `grid-template-columns: repeat(var(--cols), 1fr)` with the label as a full-width row header; letters move to a 20px column caption, not a badge in every cell. Keep stacking only for prose rows (Smells like, Listed notes, People smell). With 4 items on a 390px screen render two at a time and put a segmented "A·B | C·D" control in the sticky header. Collapse the sticky row to 56px (letter + italic name, horizontally scrollable) so header 60 + sticky 56 + tab bar 60 leaves room to read. **Effort:** L.

### 3. Diary – a 40-row log with a trash can on every line, summary buried at the bottom on phone — severity 3
**Area:** `DiaryView.tsx` entries list, mobile order. **Brief:** §9 "wear history, most worn this month, seasonal patterns, personal performance observations", §18 thumb reach.
Desktop: `entries.slice(0, 40)` renders 40 × ~95px rows (3,800px) with a destructive icon on every row 850px to the right of the content. Phone: three stacked month grids (~1,000px) precede the first entry, and the "This month" aside lands after all 40 entries at ~y=5,900.
**Direction:** group entries by week with a running header (`Week of 22 Sept · 5 wears · 3 bottles`), compact rows to 56px (date numeral, 30×40 thumb, name, `Lattafa · 3 sprays · Cold · Office` on one meta line), page at 14 with "Show earlier wears". Delete goes into a per-row overflow: hover-reveal on `pointer: fine`, long-press/swipe sheet on touch. Phone order: Log a wear → This month strip → current month only (prev/next chevrons) → entries. Desktop: two months not three, `.day` cells 44px, calendar left, summary right, list under both. **Effort:** M.

### 4. Compare – Character rows do not line up across columns and use a different colour language from the rest of the site — severity 3
**Area:** `compare/page.tsx` Character row, `.dims`. **Brief:** §5J "compare accords", §30 recognisable visual system.
Column A lists Clean/Fresh/Woody/Warm, B lists Woody/Warm/Fresh/Clean, C lists Woody/Sweet/Fresh/Warm, each sorted by its own top-4, so the "Woody" bar is row 3 in A and row 1 in B. Bars are solid ink here but hue-coded by dimension in `CharacterBars` on shelf and profile.
**Direction:** compute the union of each item's `topDims(…, 4, 0.1)`, order once (by max value across items), and render one row per dimension with N bars side by side, filled with `DIMENSION_META[d].hue`, "—" where a fragrance is below 0.1. Reuse the `CharacterBars` track height (10px) so the glyph matches the profile. **Effort:** S.

### 5. Compare – nothing points at the differences; no sample sizes — severity 2
**Area:** compare rows Lasts/Price/Rating/Released. **Brief:** §5J, §24 "Always show sample size", §5F "communicate sample size".
Lasts reads `7–10 hours / 7–10 hours / 7–11 hours`; Price `Premium ~$135 / Premium ~$175 / Premium ~$165`; Rating `7.5 / 8.1 / 7.9`. The reader does the comparing. Rating shows no vote count, Lasts no vote count.
**Direction:** per row compute a leader and mark it with a 2px bergamot underline plus an 11px caption (`longest`, `cheapest per ml`, `highest rated`); when all cells are identical (Concentration, price band) collapse to a single line `All three: Eau de Parfum` in `--fg-3` and drop the per-column cells. Append `n=1,2k` in meta to Rating and Lasts from `ratingCount`/`perfVotes`. **Effort:** S.

### 6. Compare – the Seasons cells are 36px ink stubs with 10px "spr 86" labels — severity 2
**Area:** `.seasons` in compare. **Brief:** §5G "understandable distributions", §19 no information by colour/size alone.
Four `opacity: .75` ink blocks per column, 52px tall, with abbreviated 10px labels; on phone three sets of them stack. They cannot be read at a glance and the abbreviations are not the site's vocabulary.
**Direction:** one header in the label column reading `Spring · Summer · Autumn · Winter`; per fragrance a 4-cell strip of 28px squares whose fill is juniper at opacity 0.15–1.0 by share, the percentage set under each at 11px tabular, the leading season in full ink. Same strip reused in the shelf insights (finding 8). **Effort:** S.

### 7. Shelf insights – lists of "(1)" counts read like a database dump — severity 2
**Area:** `Insights` in `ShelfView.tsx`, `shelfInsights` in `lib/data/shelf.ts`. **Brief:** §8 collection intelligence, "avoid creepy or overconfident personalization".
"Notes you keep coming back to: Ambroxan (2), Bergamot (2), Akigalawood (1), Amberwood (1), Benzoin (1), Black pepper (1)"; "Houses: Dior (1), Juliette Has a Gun (1), Lattafa (1)"; "Perfumers: François Demachy (1), Romano Ricci (1)". A count of one is not a note you keep coming back to. The sentences are thresholded; the lists are not.
**Direction:** only list notes/houses/perfumers with count ≥2 (or ≥10% of owned when owned >20); when nothing qualifies print one sentence: "Three houses, three perfumers, no repeats yet." Add cost-per-wear to the stats block since the table already computes it (`$268 recorded · about $5 a wear`). Keep "Due a wear" and promote it above "Spent". **Effort:** S.

### 8. Shelf insights – "Seasons it suits" is four black blocks with no numbers — severity 2
**Area:** `.seasons` in `ShelfView.module.css`. **Brief:** §5G, §19 accessible charts.
Four solid `--ink` bars at 80px max height with near-identical heights (spring/summer slightly lower), no values, no baseline, and the heaviest ink on the page sits inside a secondary panel.
**Direction:** use the juniper strip from finding 6 with percentages, and a one-line reading above it reused from the existing warm/bright logic ("Leans autumn and winter"). If max–min spread < 0.15, show the sentence only. **Effort:** S.

### 9. Profile – "0 followers · following 0" sits in the header; identity comes second — severity 2
**Area:** profile header `u/[handle]/page.tsx .follow`. **Brief:** §10 "Profiles should emphasize fragrance identity rather than follower counts".
The header is avatar, name, handle line, bio, then the follower counts as the last line of the header; the scent identity sentence lives below the rule.
**Direction:** hide counts when both are zero; otherwise move them to the end of the meta line as `· followed by 12` in `--fg-3`. Promote the identity sentence ("3 on the shelf, with a soft spot for ambroxan. Lately it's mostly Sauvage.") to the header as the serif subtitle, with the bio under it. **Effort:** S.

### 10. Profile – the Shelf strip is an empty 1,280px plank with three bottles at the far left — severity 2
**Area:** `.shelf` in `u/[handle]/page.module.css`. **Brief:** §12 "do not waste half the viewport", §10 shared shelves.
`border-bottom: 8px solid #b2a48c` on a full-width flex container; three 80×110 bottles hug the left and ~1,000px of plank is bare. "See all 7 →" while three are shown (the other four are wanted/testing).
**Direction:** make the plank `width: max-content; min-width: 40%` (plank ends after the last bottle plus one slot), thumbs 96×128, and reword the link `3 on the shelf · 2 wanted · see the shelf →`. Reuse the ledge component from finding 1 so the profile and the shelf page share one piece of furniture. **Effort:** S.

### 11. Profile and shelf – the product's signature glyph (Trail) never appears on the person — severity 2
**Area:** profile "Scent identity", shelf insights header. **Brief:** §30 recognisable visual metaphor, §8 "collection scent profile".
Every card and the compare page carry the Trail, but a person's identity is a sentence and five bars.
**Direction:** compute a shelf Trail (mean `character.opening/drydown` across owned items, median `longevityHrs`, mean projection) and draw it with `TrailThumb` at 320×64 beside the "Scent identity" heading, captioned "Your shelf's trail"; use the same glyph as the header of "Your shelf, read back" and in the OpenGraph card for `/u/[handle]`. **Effort:** M.

### 12. Lists – the "fan" is a sparse row of bottles — severity 2
**Area:** `lists.module.css .fan`. **Brief:** §10 lists, §12 "let fragrance objects breathe" but with composition.
Bottles are placed at `left: 14px + i × 17%` with 70px width, so in a 437px tile they sit evenly spaced with ~130px of empty paper on the right; nothing overlaps, nothing is composed.
**Direction:** shingle: `left: calc(10px + var(--i) * 14%)`, `z-index: calc(5 - var(--i))`, alternate `rotate(-1.5deg)/rotate(1.5deg)` from the base, bottom-aligned on a 6px plank inside the tile; cap at 4 bottles on phone. Add a 20px author avatar before the name and the list's two leading dimensions ("Sweet · Warm") from its items as the meta line. **Effort:** S.

### 13. Lists – no way to make, save or follow a list — severity 2
**Area:** `/lists`, list detail, `ShelfActions`. **Brief:** §10 "user-created lists", "follow collections", §27 lists shareable.
The lists page has no create entry point and the codebase has no create-list action (`grep createList` returns nothing); a list page has no save/follow and no share control.
**Direction:** add "Start a list" (ink button) in the lists header for signed-in users, "Add to a list" in the fragrance shelf menu, a "Save" follow button on the list page next to the author, and a "Your lists" section at the top of `/lists` when signed in. **Effort:** L.

### 14. Review composer – one number carries the review — severity 2
**Area:** `ReviewComposer.tsx` "Your score". **Brief:** §24 "Avoid making a single 1–5 score carry everything", §5H.
The composer collects only an overall 1–10; the fragrance page already collects scent/performance/value/originality in a separate sheet, so a review and a rating diverge.
**Direction:** under the ScoreRow add a disclosure "Break it down (optional)" revealing the four sub-score rows, prefilled from `getMyFragranceState`; post them with the review so `ReviewItem` can show `8/10 · scent 9 · performance 6`. **Effort:** M.

### 15. Review composer – native checkboxes in a product that uses chips everywhere else — severity 2
**Area:** `.chips/.check` in `ReviewComposer.module.css`. **Brief:** §15 component consistency, §19 44px targets.
"What's it mostly about?" is seven 18px native checkboxes in two wrapped rows; the diary, vote sheets and discover filters all use `.chip[aria-pressed]`. The 10 score boxes are ~31px wide on a 390px phone.
**Direction:** multi-select chips (same `.chip`, `aria-pressed`, hidden inputs for the form post), limit 3 with a count hint; on phone render the score row as two rows of five at 44px, or a 44px-tall segmented strip. **Effort:** S.

### 16. Review composer – a bare form: no scaffold, no preview, no draft safety, muddy disabled state — severity 2
**Area:** `ReviewComposer.tsx`, review page layout. **Brief:** §5H "pleasant", §33 states, §16 copy.
The page is a centred 700px form with the bottle thumb and nothing else; Publish is stone-on-porcelain while disabled with the reason only inferable from the counter; a long-form review lost on navigation is gone.
**Direction:** (a) above the Quick take textarea, three prompt chips that insert a lead-in ("On me it opens…", "A few hours in…", "Would I wear it again?"); (b) ≥1100px, a second column with a live "How it will read" preview rendered by `ReviewItem`; (c) localStorage draft keyed by slug saved every 2s, restored with a "Restored your draft" toast; (d) disabled Publish as ink at 35% with the inline reason "Pick a score and write 20 more characters". **Effort:** M.

### 17. Compare – the add-input and the 32px remove targets in the sticky header — severity 2
**Area:** `.corner`, `.remove` in compare. **Brief:** §19 44px targets, §18 sticky contextual actions.
On desktop a full text input with placeholder "+ Add a fragrance" occupies the label column of the sticky header; on phone it becomes a full-width input under the names, adding 60px to the sticky block. "×" is 32×32.
**Direction:** a 32px "+ Add" chip that expands into the suggest input on click (desktop in the corner, phone at the end of the name row); hide it at four items. Remove targets to 44×44 with the glyph at 16px. **Effort:** S.

### 18. Diary calendar – dots have no legend and the stone accent disappears — severity 2
**Area:** `Calendar` in `DiaryView.tsx`, `.dots i`. **Brief:** §19 "no information communicated solely through color", §9.
Blue, brown and stone dots mean Sauvage, Khamrah and Not a Perfume only if you remember; the stone dot on the 8%-ink worn cell is near-invisible; hover titles are the only decode.
**Direction:** a legend row under the months (dot + italic name for the distinct fragrances in the window, max 6, "+2 more"), dots with a `0 0 0 1px color-mix(ink 25%)` ring, and legend hover/tap that dims other fragrances' days. **Effort:** S.

### 19. Diary "This month" – one bar and one sentence on a 300px card — severity 2
**Area:** `.side` in `DiaryView`. **Brief:** §9 "most worn this month, seasonal patterns, personal performance observations", "retention loop".
"Khamrah ——— 2" and "On rainy days you reach for Sauvage most." is the whole panel; streak is in the page subtitle only.
**Direction:** a stat strip (`Wears 2 · Bottles 1 · Streak 2 days` in `--t-figure-l`), top three this month as the existing bars, then up to three thresholded observations ("Sauvage on 16 of the last 45 days", "Khamrah is your cold-weather pick, 5 of 6 cold wears", "Due a wear: Not a Perfume, 20 days"). On phone this strip renders directly under the Log button. **Effort:** M.

### 20. Shelf – eleven controls before the first bottle — severity 1
**Area:** `.tools`, `.tabs` in ShelfView. **Brief:** §15 "excessive pill-shaped controls", §18 short paths.
View toggle (3) + Export CSV + seven status pills including `Testing 0` and `Sampled 0` sit above a three-bottle shelf; on phone the pill row clips at "Sam" with no overflow cue.
**Direction:** zero-count tabs at 55% opacity without the count badge, or behind a trailing "+3" chip; Export CSV into a "···" menu next to the view toggle; phone tab row gets `mask-image: linear-gradient(to right, #000 85%, transparent)`. **Effort:** S.

### 21. Shelf – the favourite heart is a text glyph floating by the cap — severity 1
**Area:** `.fav`, `.format` in ShelfView. **Brief:** §15 icon choices, §29 icon system.
`♥` (U+2665) in oxblood at `top: 4px; right: 6px` hovers beside Sauvage's cap; the format badge is a 10px pill at the top-left. Neither is drawn in the product's icon set.
**Direction:** add a `heart` path to `Icon.tsx` (24-grid, 1.6px stroke), render at 14px in oxblood on the ledge under the bottle's right edge; format as a third text line ("Decant · 10 ml") instead of a pill. **Effort:** S.

### 22. Shelf list view – a 720px-min table that scrolls sideways on phones — severity 1
**Area:** `.table` in ShelfView. **Brief:** §18 "avoid sideways scrolling", §8 "compact data view".
`min-width: 720px` inside `overflow-x: auto` is the one horizontal scroll on the personal pages; the grid view's "Edit details" is an underlined text button under each plate.
**Direction:** ≤719px, render rows as stacked items: name/house, then a 2×2 label-value grid (Format · Size / Left · Worn) with Last worn and Paid on a meta line; keep the table ≥720. In grid view, edit becomes a 36px icon button in the plate's top-right. **Effort:** S.

### 23. Shelf – edit sheet reloads the page; placement motion fires on every tab switch — severity 1
**Area:** `ShelfView.tsx:329 location.reload()`, `.bottle { animation: settle }`. **Brief:** §17 "mostly quiet so meaningful animations feel special", §20 layout shift.
Saving an edit reloads the whole document (white flash, scroll reset); the `settle` drop-in plays for every bottle every time a tab changes, so the shelf-placement motion the brief asks for is no longer special.
**Direction:** `router.refresh()` with optimistic state; run `settle` only for items whose `addedAt` is within the last 10s (or via a `data-new` flag passed from the add action). **Effort:** S.

### 24. Compare – "Shelf overlap: Reference / 10% / 20%" is read from the wrong column — severity 1
**Area:** shelf overlap row. **Brief:** §5J "community overlap", §16 plain copy.
The note explains the semantics but the cells show a bare percentage under B and C and "Reference" under A.
**Direction:** cell copy `1 in 10 Sauvage owners also own this`; A shows "—"; move the row up under Rating with the other community signals. **Effort:** S.

### 25. Profile – "Current rotation" is three product tiles; orphan on phone — severity 1
**Area:** `.rotation` in profile. **Brief:** §12 record-collection feel, §18 mobile.
3:4 paper boxes with the bottle centred and "Dior · 16× lately" in meta; on 390px the 2-column grid leaves the third tile alone.
**Direction:** reuse the ledge (finding 1) ordered by wear count, with the count set in the figure face (`16×`) at the slot's bottom-left; on phone a horizontal snap-scroll ledge instead of a grid. **Effort:** S.
