# Mobile critique (390px) — against brief section 18 ("Mobile is not a shrunk desktop")

Reviewed every `-m` screenshot (sliced into 1600px crops) plus the media queries in `src/styles/tokens.css`, `src/styles/globals.css` and the component CSS modules. Measurements are from the 390px captures (viewport 390x844: header 60px, tab bar 60px, banner 62px as rendered).

Caveat on the captures: the `frag-*-m` and `notes-m` full-page PNGs repeat the page once (the bottom third of `frag-sauvage-m.png` is the top of the page again), and the Next.js dev badge ("N" in a black circle) sits over the Home tab in every phone capture. Both are capture artefacts, not product defects, but the client judged from these images, so the capture process is one of the findings below.

## Keep (must survive the redesign)

1. The bottom tab bar: 5 tabs, 60px + `env(safe-area-inset-bottom)`, solid porcelain (not glass), with **Wear** (atomizer) as the raised centre action deep-linking to `/diary?log=1`. This is the right daily-habit affordance.
2. `Sheet` on phones is a real bottom sheet: full width, 12px top corners only, drag handle, 90vh, sticky footer with "Show 21 results". Reused for Filters, every vote ("What do you smell?", "How did it perform on you?", "When would you wear it?"), rating and Log a wear.
3. `(pointer: coarse)` upgrades: chips 40px, NoteTag 40px, `.btn--small` 44px, Trail scrubber 44px; inputs at 16px (no iOS zoom), `enterKeyHint="search"`; 3D canvas `touch-action: pan-y` so the stage never traps vertical scroll.
4. The fragrance page's mobile order (bottle, identity, quick read, actions, sticky section nav, journey, listed vs smelled, performance, when to wear, ratings, reviews, similar, details) matches the brief's suggested structure; `MobileActionBar` (Rate / I smell… / Review) appears only after the hero actions scroll away; toasts are offset above the tab bar.
5. Compare's attribute-major mobile layout with A/B/C letter keys and three stacked Trails on one time scale is the right idea for 2–4-way comparison on a phone.
6. Card plates at 46vw in a 2-up grid with the Trail mark under the name; ranked row lists (Trending, "On the most shelves"); the 3-up ledge shelf.
7. Type: Newsreader italic for names, Archivo UI, 18px serif prose on note/learn/about pages, 1.5 line height. All readable at 390 without zoom.
8. Explore-by-feeling as a contents list (not cards); "Note of the week" as a tinted editorial band; the list rows with bottle fans.
9. Hero action row `Add to shelf ▾ | Worn today | ♥` as `1fr 1fr 44px` with the shelf-placement and atomizer micro-animations.

## Findings (severity ranked: 3 = a skeptical designer dismisses the site, 2 = clearly weak, 1 = polish)

### 1. [3] Fragrance · "What people smell" bars break note names mid-word
`sections.module.css .barRow` is `minmax(96px, 30%) 1fr 3.4em`; at 358px content width the label column is 107px, the chevron `NoteTag` eats 36px of padding, and `overflow-wrap: anywhere` then splits **"Cedarwoo / d"**, **"Fizz / y"**, and "Sea salt + not listed" into three fragments (Sauvage crop at y≈4000). Brief 5 section D/4: this is the flagship differentiator and it reads broken.
Direction: on ≤719px make each row two lines: `grid-template-columns: 1fr auto` with the label row holding the NoteTag (or plain dot + name, `white-space: nowrap`) and the "not listed" flag as a 10.5px oxblood word after the name; the track + % on the second line. From 720px keep the three-column row but set the label column to `minmax(128px, 32%)`. Effort S.

### 2. [3] Fragrance · the 10-second read is below the fold
Banner 62 + header 60 + stage `min(42vh, 360px)` = 354 + controls 44 → the name lands at y≈560, "What it smells like" at y≈720, and the summary sentence, accord trio and Lasts/Projection grid start at y≈760+. The first phone screen is a bottle, a black "Explore the scent" button and a name. Brief 5C ("immediately communicate…").
Direction: on phones cap `.frame` at `min(30vh, 260px)`; turn "Explore the scent" into a 36px quiet text button in the stage's bottom-right corner (keep the hint only when a model exists); drop the 2px rule between facts and kicker; put the summary directly under the facts line (kicker "Smells like", 20px Newsreader), then the accord trio and a 2×2 Lasts / Projection / Best for / When grid with 13px values. Target: summary visible by y≈620 with the banner showing, 560 without. Effort M.

### 3. [3] Global · 214px of fixed chrome on fragrance pages
Scrolled, a fragrance page pins: sticky header 60 + sticky `SectionNav` 46 + `MobileActionBar` 48 + tab bar 60 = **214px of 844 (25%)**; add the 62px banner on the first screen. The reading window is ~630px, and the two bottom bars stack as two different surfaces (paper over porcelain) with two 1px lines.
Direction: hide the header on scroll-down and reveal on scroll-up (`transform: translateY(-100%)`, 240ms `--ease-evaporate`, via a small scroll-direction hook); let `SectionNav` take `top: 0` while the header is hidden. Merge the action bar into the tab bar on fragrance pages: when `#hero-actions` leaves the viewport, the tab bar's labels crossfade to **Rate · I smell… · Wear (centre, unchanged) · Review · Jump to** so there is one 60px bar, not two. "Jump to" opens a sheet with the section list, replacing the sideways section nav on ≤719px. Effort M.

### 4. [2] Global · demo banner costs 62px on every page, every session
`DemoBanner` wraps to three lines at 12px ("…illustrations. How the / data works"), 62px tall, sits above the header on every page, and "Hide" only lasts a session. Brief 32 wants demo data labelled, but the inline `DemoFlag` ("◦ Demo figures") already does that next to every number.
Direction: on ≤719px a single 36px line: "Prototype · community figures are demo data · **How it works**" with `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`; remember "Hide" in `localStorage` for 30 days; or move it to a 28px strip above the footer's legal line. Effort S.

### 5. [2] Home · "Explore by feeling" is a 900px single column and Trending starts at "2"
`.feelingList` is one column under 720px: 12 rows × ~75px ≈ 900px between the search and Trending. The feature ("Most worn this week", `trending[0]`) and the ranked list (`rest.slice(1)` rendered 2…9) are separated by that list, so "2 Good Girl" reads as a bug rather than "the feature was #1".
Direction: on phones render feelings as two columns of 44px rows (serif italic 20px word only; the one-line description shows for the first four only, 13px `--fg-2`), total ≈ 330px; move Trending directly under the feature and print a small rank "1" in the feature kicker ("1 · Most worn this week") or start the list at 1. Effort S.

### 6. [2] Compare · 125px sticky head, 32px remove targets, 10px season labels
On ≤839px `.sticky` holds the A/B/C name row (44px) **and** the full-width "+ Add a fragrance" input (`.corner`, 52px) plus padding = ~125px pinned under the 60px header (185px frozen). `.remove` is 32×32; the row wraps ("Bleu de Chanel" on two lines) so the × for "Y" floats at x≈358, far from its name. `.seasons small` is 10px ("spr 86 sum 71 aut 66 win 45"). Brief 5J: "Make comparisons excellent on mobile."
Direction: one 48px sticky row of three 40px pills "A Sauvage · B Bleu de Chanel · C Y" (ellipsis at 10ch); tapping a pill opens a sheet with Open / Replace / Remove (44px rows); "+ Add" becomes a 44px "+" pill at the row end, hidden at 4. Seasons: a 4-cell text row "Spr 86 · Sum 71 · Aut 66 · Win 45" at 13px tabular, or reuse `WhenToWear`'s tubes at 48px tall with values. Effort M.

### 7. [2] Fragrance · ~8,000px page with duplicated content and no collapse
At 390 the page is roughly ten screens. "Listed by the house" (Top/Heart/Base chips) repeats exactly the chips the Journey phases showed ~600px above. "When to wear" = 4 season tubes + split bar + 5 weather bars + 8 occasion bars ≈ 1,100px; Ratings = histogram + 4 full-width sub-bars ≈ 600px. Brief 1 wants the 10-second and 20-minute readings to coexist through progressive disclosure, not a scroll of equal-weight sections.
Direction: on phones (a) "Listed by the house" becomes a `<details>` with summary "Listed by the house · 12 notes", closed by default; (b) When to wear shows seasons + day/night, then the top 3 weather and top 3 occasions with a 44px "All 8 occasions" disclosure; (c) Ratings shows the big number, divisiveness and histogram, then the four sub-scores as a 2×2 figure grid (28px tabular number + one-word label) instead of four bars. Target ≤5,500px. Effort M.

### 8. [2] Global · every horizontal scroller clips at the viewport edge with no affordance
`SectionNav` ("…Performance | Whe"), Similar tabs ("Rated higher 6 | S"), shelf status tabs ("Sam"), the home "Newest" row ("Sol d… Che…") and Similar cards all cut hard at x=390, no fade, no end padding, and the active section-nav item can be off-screen.
Direction: for every `overflow-x: auto` row: `margin-inline: calc(var(--gutter) * -1); padding-inline: var(--gutter); scroll-padding-inline: var(--gutter)` so items scroll under the gutter; `mask-image: linear-gradient(90deg, #000 calc(100% - 28px), transparent)`; `scrollIntoView({ inline: 'center' })` on the active nav item; Similar cards `minmax(150px, 40%)` so 2.3 are visible. Effort S.

### 9. [2] Diary · three stacked month grids, unlabeled dots, one-tap delete
`.months` is one column under 720px: August + September + October ≈ 1,000px before "Recent wears". Dots are 11px in three colours with no legend (which colour is Khamrah?); day numerals are 10px. `.del` (trash) is 40×40 on every row, on the thumb edge, with no confirm or undo.
Direction: one month at a time with ‹ › 44px buttons and a "This month" link; worn days show a 20px bottle thumb (or initials chip) instead of dots, or add a legend row (thumb + name, 13px) under the grid; numerals 12px; make `.del` 44×44, move it into an entry sheet (tap row → Edit / Delete) and show an "Undo" toast after delete. Effort M.

### 10. [2] Review composer · score buttons are 32px wide
`.score` is `repeat(10, minmax(0, 1fr))` with 4px gaps: measured button edges at 16→48, 52→84 … = **32px wide** for the most important input on the form. "Publish" is a 90px grey button that scrolls away.
Direction: two rows of five (≈68×48px) or a full-width 10-cell segmented scale with 44px cells and a 28px tabular readout above ("7 /10"); keep `radiogroup` semantics. Make Publish full-width 48px at the end of the form and pin it above the tab bar once the textarea passes 20 characters. Effort S.

### 11. [2] Shelf · seasons with no values, Export CSV in the first row
"Seasons it suits" is four solid `#1C1A17` blocks with no numbers (information only by height — brief 19), 11px labels. "Export CSV" takes a 44px slot beside the view switcher on a 390px screen; the status tab row clips ("Sam…").
Direction: print the percentage above each bar (12px tabular), fill with `--scent-ink`/stone and the strongest season in ink; move Export CSV under a "⋯" in the view switcher on ≤719px; fade-mask the tab row (finding 8). Effort S.

### 12. [2] Global · header duplicates the tab bar, and Notes/Learn/Compare/Lists have no phone entry point
The header's "Sign in"/avatar duplicates the 5th tab ("Sign in"/"You"). Notes, Learn the words, Compare, Lists and Houses are reachable only from the footer (800px down) or incidental links.
Direction: on ≤719px replace the header account control with a 44px "Browse" (book icon) opening a sheet: Discover, Notes, Learn the words, Compare, Lists, Houses, Perfumers, Where our data comes from. Alternatively a 44px underlined link row at the top of Discover. Effort S.

### 13. [2] Discover · toolbar mixes a quiet button with a native select, and the select overruns the gutter
The sort `select` spans x 255–383, past the 374px content edge; "Sort" label + native select sit beside the quiet "Filters (2)" button in two different control styles; result count "21 matches" is a lone line.
Direction: one 44px row of two equal quiet buttons "Filters · 2" and "Sort · Best match ▾", both opening sheets (the sort sheet is 7 radio rows at 48px); active-filter chips in a fade-masked scroll row under it; "21 matches" right-aligned in the chips row. Effort S.

### 14. [1] Fragrance · Trail caption says "Hover", and "Spray" is clipped
`TrailChart.tsx:198` renders "Hover or drag across the trail, or focus here and use arrow keys." on touch devices; the first axis label renders as "Sorav" (descenders cut by the 26px axis box).
Direction: swap copy on `(pointer: coarse)` to "Drag across the trail to see what's strongest at each hour."; set `axisH` to 32 or axis text `y` to 14 with `dominant-baseline: hanging`; on phones move the Opening/Heart/Drydown labels out of the plot into a 12px 3-cell row above it. Effort S.

### 15. [1] Fragrance · day/night drawn as one split bar
"☼ Day 85% | ☾ Night 58%" is a single bar split 55/45, which reads as shares summing to 100 even though the lede says the votes don't add up.
Direction: two 10px bars on the same track width (Day 85%, Night 58%) with the icons as row labels, or two figures side by side. Effort S.

### 16. [1] Notes index · 157 rows × ~95px ≈ 15,000px in one column
Each row shows a 2-line clamped description; families are not collapsible; the jump row scrolls sideways.
Direction: on phones rows show name + 1-line clamp (≈72px); families as `<details>` with the first two open; jump row becomes a 44px `select` on ≤480px; add an "A–Z | By family" toggle. Effort M.

### 17. [1] Learn · the italic letter column wastes 56px of a 390px screen
`.letter` is `56px minmax(0, 1fr)` at all widths: a 35px italic "A" sits in a left margin and the entries get ~290px.
Direction: on ≤719px `grid-template-columns: 1fr` with the letter as a 22px running head above its group; keep the side column from 720px. Effort S.

### 18. [1] Footer · 800px tall on every phone page
Three single-column link lists at 36px rows + blurb + legal; on sign-in and perfumer pages the footer is taller than the content.
Direction: 2-column link grid on phones (Explore | Yours; "How this works" spanning below), 32px rows, blurb trimmed to one sentence; or groups as `<details>` with the label as summary. Effort S.

### 19. [1] Fragrance · Similar cards misalign and show blank image boxes
In the horizontal variant, two-line names ("Wood Sage & Sea Salt") push the trail and rating down so neighbours misalign; images below the fold were blank in the capture (lazy).
Direction: reserve `min-height: 2lh` for the name in the horizontal variant; `sizes="40vw"`; `loading="eager"` for the first two cards (the section is a nav target); `scroll-snap-align: start` with `scroll-padding`. Effort S.

### 20. [1] Tab bar · 11px labels and a colour-only active state
Labels are 11px/560 in `--fg-3`; the active tab only changes colour to ink.
Direction: 12px labels; a 2px ink bar at the top of the active tab (or filled icon); keep the Wear pill. Effort S.

### 21. [1] Capture process · dev badge and duplicated pages in the screenshots
Every phone capture shows the Next.js dev indicator over the Home tab, and the fragrance/notes full-page PNGs repeat the page once.
Direction: capture from `next build && next start` (or `devIndicators: false`), and take full-page shots with the fixed bars hidden or via `page.screenshot({ fullPage: true })` after waiting for images. Effort S.

### 22. [1] Note page · blotter strip squeezes the title at 390
The 46×220 rotated blotter sits beside the name (`minmax(0,1fr) auto`), leaving ~290px for the title; "Bergamot" fits, "Blackcurrant bud" will wrap awkwardly.
Direction: on ≤719px cap the blotter at 36×160 and let it overhang the hero's right edge by 12px (`margin-right: -12px`). Effort S.

### 23. [1] Profile · lone third card in "Current rotation"
2-up grid with three items leaves an orphan plate.
Direction: a 3-up row of 30vw plates on phones for rotation (always ≤3), keeping the 2-up grid for the shelf. Effort S.
