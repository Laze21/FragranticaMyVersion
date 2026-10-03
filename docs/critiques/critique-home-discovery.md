# Critique: home page and discovery (lens: home-discovery)

Reviewed against `docs/00-brief.md`, screenshots `home-d/-m`, `home-in-d/-m`, `discover-d/-m`, `discover-empty-d/-m`, `notes-d/-m`, and the code in `src/app/page.tsx`, `src/app/page.module.css`, `src/app/discover/*`, `src/components/search/*`, `src/components/cards/FragranceCard.*`, `src/components/home/*`, `src/components/scent/NotesBrowser.*`, `src/styles/tokens.css`.

## Verdict in one paragraph

The structure is not the SaaS template: a dateline, a question, one featured object, a typographic contents page of feelings, a ranked list, seasonal plates, a note band, a shelf, lists and a glossary. That skeleton is right and should survive. What makes it "look bad" is the execution layer: every module sits on the same warm grey, every section is separated by the same 88px, every heading is the same 32px widened Archivo, every bottle sits on an identical #E6E3DD ground, and the signature Trail glyph is repeated 40+ times at a size where it reads as a brown smudge. There is no human voice (zero review text on the home page), no colour that means anything, and the discover page shows two search boxes, three sets of example queries, two copies of the same active filters, and hides half of its filter groups inside a sticky inner scroll. It reads like a good wireframe with the identity not yet applied.

## Keep

- The question-led hero ("What do you want to smell like?"), the dateline ("Saturday 3 October · Autumn"), and the underline-only serif "Describe it, or type a name" input. Human, not SaaS.
- "Explore by feeling" as a typographic contents list (serif word + one plain line), not cards. The copy lines ("Pleasant at a desk, gone by the elevator.") are exactly the brief's voice.
- Natural-language query -> "We read that as" transparent filters, with the "Search the exact words instead" escape hatch. Must-have / must-not-have notes, and the "Listed or smelled / Officially listed / People smell it" distinction.
- The Trail as the signature visualisation, its 13-hue character vocabulary, and the wordmark as a miniature Trail. The concept is right; only its small-size rendering fails.
- Bottom-sheet filters on phones with the "Show N results" footer; "/" focuses search; grouped combobox suggestions in the header.
- The no-results state that offers to relax one constraint at a time.
- Honesty marks: "Demo activity" flags and the prototype banner concept.
- Tokens: porcelain/ink, ink-only buttons, 0/2/4px radii with pills only for chips, Archivo widened heads + Newsreader italic names, warm low shadows. No AI-palette tells anywhere.
- The note-of-the-week full-bleed band as the one tinted section, and the "Newest" row as the one intentional horizontal scroller.
- Mobile tab bar with "Wear" in the thumb position.

## Findings (severity-ranked)

### 1. [3] discover / filter rail: half the filters are invisible
`DiscoverControls.module.css` makes `.rail` `position: sticky; max-height: calc(100vh - header - 32px); overflow: auto`. At a 900px viewport the rail is clipped mid-chip after "Weather: Hot Mild Cold Rain"; Occasion, Lasts at least, Projection, Price, House, Released, Concentration and Community are inside a nested scroller with no scrollbar and no fade. Longevity, price and projection are the brief's headline filters (brief 7) and they are the ones hidden.
**Direction:** Drop the inner scroll: make the rail `position: static` (or sticky with `max-height: none`) so it scrolls with the page. Reorder groups by use: Notes, Lasts at least, Price, Character, Season/Weather, Projection, House, Concentration, Released, Community. Collapse the last four under a plain-text "More filters" disclosure (`<details>`), open when any of them is active. Effort: S.

### 2. [3] global / Trail thumbnail: the signature mark is a smudge at the size it is seen most
`TrailThumb` draws up to 13 bands (minShare 0.05) at 160x30 on plates and 120x22 on rows with a 0.6px porcelain stroke; at 2-4px per band the hues (#B97D45, #BF8A35, #8B6B4B, #D9A06B, #C6928F) merge into one brown streak. Discover shows 21 of these in a column; the home shows ~40. They add noise but no information the "Sweet · Warm" text under them does not already say, and the length (longevity) is not readable because there is no scale.
**Direction:** At card size, cap bands at 3 (merge the rest into the dominant band), raise plate thumbnails to 180x40 and rows to 120x28, drop the inner strokes, and add two hairline ticks under the glyph at 4h and 8h (`stroke: var(--stone-2)`) so the taper means something. On rows (Trending) use a single-hue silhouette of the dominant dimension with the same ticks, which stays recognisable at 22px. Effort: M.

### 3. [3] global / fragrance grounds: the per-fragrance accent is invisible
`--scent-wash` mixes the accent at 14% into porcelain. On every plate, row thumb, the hero feature and the note band, the result is the same #E5E2DC grey: Portrait of a Lady, Naxos, Black Opium and Cool Water all sit on an identical ground. The brief's "each fragrance introduces a controlled scent accent" (brief 13) is not happening, and the grid becomes a wall of identical grey rectangles.
**Direction:** For plates and the feature stage use `--scent-wash-2` (26%) as the ground, and add a counter: a vertical gradient from `color-mix(in oklab, var(--scent) 34%, var(--porcelain))` at the bottom 30% to the wash at the top, so the bottle stands on a tinted surface rather than floating in fog. Keep text on porcelain, not on the wash. Verify the darkest accent still gives 4.5:1 for the status pill. Effort: S.

### 4. [3] home / note of the week: the examples contradict the note
The "Amber" band leads with Cool Water (Clean · Fresh) and Bleu de Chanel (Woody · Warm) because `noteFrags` sorts by `s.popularity` among fragrances that merely list the note. To anyone who knows fragrance, Cool Water as the first example of amber destroys credibility, and it undercuts the brief's own "listed vs. what people actually smell" idea (brief 4).
**Direction:** Order by perceived strength (`perceived[note]` share from `fragrance_stats`), then popularity; show "71% smell it" as the plate's meta line in this module; only fall back to listed-only when fewer than 4 have votes. Tint the band with the note hue itself (amber = #C9A24A at 20%, not the fragrance accent), and set the note name in Newsreader italic at `--t-title-xl` with a raw-material line (where it comes from) under the smells-like sentence. Effort: S.

### 5. [3] discover / results: a generic product grid that explains nothing
For "vanilla without tobacco" each card shows brand, name, trail, "Sweet · Warm", "7.6 7.8k". Nothing says how vanilla figures (listed? 70% smell it?), nothing shows longevity or price band though `FragranceCard` already carries `longevityHrs` and `priceBand`, and there is no way to put two results into Compare (brief 5J, 7). The brief calls search "a major advantage"; this is a shop grid.
**Direction:** When any filter is active, add a one-line match reason under the name in `--t-micro` sans: "Vanilla listed · 71% smell it" or "No tobacco in 1,418 votes". Add a data line "8h · $$ · EDP" (longevity median, price band glyph, concentration) to the plate `foot`. Add a "Compare" checkbox that appears on hover/focus (and always on touch) in the ground's top-right; selecting 2-4 shows a bottom bar "Compare 3 ->". Add a plate/row density toggle next to Sort (the row variant already exists). Effort: M.

### 6. [3] discover / search area: two search boxes, three example sets, two copies of the filters
In one 440px-tall viewport: the header search (sans 15px, "Search, or try “vanilla without tobacco”"), then an h1 "Find something" at 56px, a lede with three more examples ("warm but not sweet for the office", "fig without coconut", "lasts 10 hours"), then a second search box (serif 19px with placeholder "vanilla without tobacco, under $100") with a black Search button, then "We read that as: No tobacco / Vanilla" chips, then a second row "With Vanilla × / No Tobacco × / Clear all" saying the same thing in a different chip style. Five competing systems for one job.
**Direction:** On /discover, hide the header search (`SiteHeader` can read the pathname and render the wordmark + nav only) and make the page input the single search, sticky under the header at 52px. Delete the lede; put one rotating example as the placeholder. Merge "We read that as" into the active-filter row: the understood chips ARE the active filters (removable), with "exact words" as a trailing 14px link. Reduce h1 to `--t-title-m` or drop it: the page is the search. Effort: M.

### 7. [2] home / trending: the list starts at 2 and ranks are not explained
`trending[0]` becomes the feature, so the ranked list begins "2 Good Girl". Nothing on the feature says it is number 1; the list looks like a bug. The subtitle promises "Most logged in wear diaries over the last 30 days" but no row shows a wear count, and the only number is a bare "7.4" with no scale.
**Direction:** Put "No. 1 this week · 412 wears" as the feature kicker (`wears_30d` exists in `fragrance_stats`). In rows, show the metric that ranks them: "412 wears" as the right-hand figure, and move the rating into the meta line as "7.4/10 · 7.8k". Add a small up/down delta against the previous 30 days when stats carry it. Effort: S.

### 8. [2] home / hero feature: flat panel, dead space, no ten-second read
The feature is a 665x480 flat grey rectangle; the bottle sits left, the text block is bottom-aligned on the right leaving ~210px of empty wash above "Yves Saint Laurent"; the kicker is 12px in a corner. The brief's most important beginner device, the plain-language "smells like" sentence (brief 5C), is absent: only "Sweet · Warm · Floral".
**Direction:** Let the bottle break the panel: stage 3:4 with the image overflowing the top edge by ~40px (`overflow: visible`, poster translated -8%). Top-align the text column: kicker "No. 1 this week", house, name, then `summary` from `FragranceDetail` in Newsreader 20px ("Coffee and vanilla up front, loud for the first hour, lasts all night."), then the dims and "Read it in ten seconds ->". Ground per finding 3. Effort: S.

### 9. [2] home / explore by feeling: ragged grid, no hierarchy, 950px on phones
Desktop: 3 columns, word column `minmax(8ch, auto)`, so "Fresh but not aquatic" pushes its line to 3 wrapped lines while neighbours take one; row heights are 60-90px and baselines do not align across columns. All 12 entries have equal weight although it is autumn and "Cold weather" / "Rainy day" are the live ones. Mobile: 12 stacked rows of ~79px = ~950px before Trending.
**Direction:** Desktop: fixed word column `14ch`, description set on its own line under the word (two-line item, consistent 72px rows), 3 columns. Lead with two seasonal picks set larger (word at `--t-title-l`) spanning the first row, the other ten below at the current size: intentional asymmetry. Mobile: 2 columns of word-only items at 20px italic with the line hidden, 6 rows, plus "All twelve ->". Effort: S.

### 10. [2] home / rhythm and headings: every section identical
`.feelings`, `.split`, `.note`, `.newest` all use `margin-top: var(--s-11)` (88px) and every section head is `.h2` at `--t-title-m` 650 widened. The brief's tells list names "every section having identical vertical padding" and "overly symmetrical layouts" (brief 15).
**Direction:** Use the spacing scale on purpose: 56px after the hero, 88px before the ranked/seasonal split, 120px before the note band (which is full-bleed and carries its own 48px padding), 48px between Newest and Lists. Give the two editorial moments (feature, note of the week) serif display heads and the utility modules (Trending, Newest, Lists) a smaller 20px sans head with the subtitle on the same baseline. Effort: S.

### 11. [2] home / no community voice
The brief's home modules include "recently discussed fragrances" and "community review excerpts" (brief 11) and reviews are "a major reason people use fragrance communities" (brief 5H). The home page contains no review text at all. `recentReviews(limit, { minLength })` already exists in `src/lib/data/reviews.ts`.
**Direction:** Add "What people are saying" between Trending/Seasonal and the note band: three excerpts (first 180 chars of reviews >= 300 chars) set in Newsreader 20px as pull quotes, each with a 44px bottle thumb, fragrance name in italic, reviewer handle and "Quick take / Full review". Asymmetric: one wide quote (7fr) and two stacked narrow ones (5fr). Effort: M.

### 12. [2] home-in / signed-in home is the same page with a form bolted on
Signed in, the only changes are a paper box "Worn something today, Demo?" with three bordered buttons and "Something else...", and tiny "Own" pills on plates. The box reads as a form inserted into the hero; no personalised module exists (brief 11: "personalized modules when signed in").
**Direction:** Make the wear prompt one line with the atomizer microinteraction: "Worn something today?  [Sauvage] [Khamrah] [Not a Perfume]  Something else" as text-styled buttons on the hero's baseline, no box; pressing one depresses the atomizer icon (brief 17). Replace "Made for autumn" with "From your shelf, for today" when signed in and the shelf has >= 3 items matching the season; add "Not worn in 30 days" as a row in Trending's column. Effort: M.

### 13. [2] discover-m / 610px of chrome before the first result
On the 390px phone: banner (3 lines, 60px), header, h1, three-line lede, input + black Search button (the value truncates to "vanilla without tobacco, un"), "We read that as" chips, "Search the exact words instead", Filters (2) + Sort, active chips, "21 matches". The first bottle starts at y=610 of an 844px viewport.
**Direction:** Mobile: drop the lede; h1 at 28px; search button becomes the arrow inside the field; understood chips merged into the active row (finding 6); Filters and Sort in one 44px row with active chips scrolling horizontally beside them; count inline with Filters ("21 · Filters (2)"). Target: first result at <= 360px. Effort: S.

### 14. [2] home-m / above the fold is a stack of underlined links
Phone: banner (3 lines), dateline, 3-line headline, input, then five underlined example links stacked over 150px, then the feature panel whose bottle is at y=590. The first object on a fragrance site appears below the fold.
**Direction:** On phones show two example links max, inline after "Try:"; rotate the rest as the input placeholder every 4s (respect reduced motion: static). Move the feature above the examples on phones (`order`), with the stage at 4:3 and the text beside it in a 2-column 96px-thumb layout. Shorten the banner copy on phones to one line: "Prototype: community figures are demo data. How it works". Effort: S.

### 15. [2] discover / "Listed or smelled" segmented control is cramped
The three-way match control is 264px wide; at 12px/600 "Listed or smelled" and "People smell it" wrap to two lines inside 88px cells. This is the product's differentiator (brief 4) and it looks like an afterthought.
**Direction:** Replace with a labelled radio stack: legend "Count a note when" and three 40px rows "It's listed or people smell it (default)", "The house lists it", "People say they smell it", with a one-line `--t-micro` hint under the third ("from perceived-note votes"). Widen the rail to 296px. Effort: S.

### 16. [2] home / "Newest in the catalogue" shows 2016 releases with no year
Sorted by `release_year desc` but the plate variant omits the year, so Good Girl (2016), Y (2017) and Layton (2016) sit under "Newest" with nothing to justify it. With a 50-fragrance seed the newest items are a decade old.
**Direction:** Rename "New releases" and show the year in the plate's brand line ("Prada · 2024"). If the newest release is older than two years, swap the module for "Recently added" ordered by `created_at` with "Added 3 Oct" in the meta. Effort: S.

### 17. [2] notes index: 157 two-line entries, no hierarchy, 8k px desktop / 18k px phone
Every note gets the same row: 12px blotter strip, bold name, two-line description. Bergamot (listed in dozens of fragrances) and "Fizzy descriptor" (one) look identical; `listed` counts are in the data but not shown. The family jump nav is a row of 16 default underlined links.
**Direction:** Two densities: compact index by default (name + "in 31 fragrances", one row of 40px, 4 columns desktop / 2 phone), with each family led by its three most-listed notes set larger with their description; "Show descriptions" toggle expands all. Jump nav becomes a sticky family strip with the blotter swatch beside each name and the active family underlined in ink. On phones, descriptions collapsed by default. Effort: M.

### 18. [2] discover-empty / the no-criteria state dumps the catalogue under an empty toolbar
With no query, the toolbar still renders as a 60px bordered row containing only "Sort" floating right, then "50 fragrances" and the full grid. There is no invitation to start (brief 7: discovery should be a major advantage).
**Direction:** When `activeFilterCount === 0 && !q`, hide the toolbar border, and above the grid render "Start somewhere" as a single row of the six seasonal feelings as text links (reuse `FEELINGS`) plus "by house" and "by note" links; count line becomes "All 50 fragrances, most popular first". Effort: S.

### 19. [1] home / lists and glossary are the weakest split
Lists render a 110px fan of four 44px thumbs (reads as a smear) and title + "5 fragrances · by Kat"; `l.description` is fetched but never rendered. "Words worth knowing" picks four random terms by week number, unrelated to anything on the page.
**Direction:** Lists: show the description line in Newsreader 16px under the title and replace the fan with the first bottle at 64px plus "+4". Glossary: pick terms that appear on this page (the featured fragrance's notes/concentration, the note of the week's family), so "Amber" week shows "resin", "ambroxan", "oriental (the old word)". Effort: S.

### 20. [1] global / ratings never show their scale
"7.4", "8.6 1.9k" appear ~50 times on home and discover with no "/10" anywhere.
**Direction:** First rating on each page (and the Trending column head) shows "/10" once: "Rating /10" as the column's micro head; plate ratings keep "8.6" with the count. Effort: S.

### 21. [1] home / hero headline outweighs the search
The headline is 70px over three lines (clamp to 4.4rem, 13ch); the input is 56px with a 2px underline. The brief wants search prominent (brief 11) and warns against huge headings (brief 15).
**Direction:** Headline to `--t-title-l` (52px) in two lines (max-width 16ch); input to 64px with a 3px underline and the arrow as a 44px ink square at the right end. Effort: S.

### 22. [1] notes index / blotter strip swatch is too small to read
The 12x44 strip carries the hue only in its bottom 40%, so most of it is white; at 12px wide the hue is a 12x17 speck.
**Direction:** 16x48 strip with the hue filling the bottom 60%, a 1px `--line` edge, and the same strip reused on the note page header so the metaphor (a dipped blotter) becomes recognisable. Effort: S.
