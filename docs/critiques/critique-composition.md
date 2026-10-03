# Critique: layout, composition and rhythm

Lens: composition. Judged at 1440px desktop against brief sections 5 (fragrance page), 11 (home), 12 (visual direction), 15 (AI tells) and 18 (desktop split layouts, sticky information rail). Pixel values are read from the full-page captures in `scratchpad/shots` and from the CSS in `src/`. Content width at 1440 is 1280px (x 80 to 1360).

## Keep

- Fragrance hero identity column, in this order: house line, italic name, facts line, ruled "What it smells like" block, 3x2 quick-facts grid, big score, shelf actions. It is the ten-second read done properly.
- Per-fragrance scent-wash band behind the hero, and the sticky section nav under it.
- Sections separated by type and space, not boxes. No card chrome anywhere; square plates; hairline rules as structure.
- Home: the asymmetric 5/6 top split with a dateline; the ruled three-column "Explore by feeling" index; the Trending ranked list beside the Made-for-autumn plates; the full-bleed Note-of-the-week band; one intentional horizontal shelf (Newest).
- Compare: sticky header row with A/B/C badges, 170px label column, Trail row on a shared time scale, bold shared notes.
- Learn glossary with the italic letter column; Notes index in three columns with blotter swatches.
- Details and sources as a two-column provenance table.
- The bottle-on-wash-plate idiom and the shelf plank idiom (both need scale fixes, not replacement).
- The Trail as a recurring mark in cards and rows.
- Footer.

## Findings (severity 3 = a skeptical designer would dismiss the site for it; 2 = clearly weak; 1 = polish)

### 1. fragrance / bottle stage (hero) / severity 3
**Finding.** The hero is a 1440x850 wash band split 5fr/6fr (stage ~596px, identity ~716px). The stage frame is `min(100%, 520px)` at 3:4, and the renders fill only 60 to 77% of it: Sauvage reads ~305x535, No5 ~410x550, Aventus ~190x560 inside a 596px column, with ~120px of dead wash to the bottle's left and the "Explore the scent" button centred under it as an isolated black block. Both columns are `align-items: center`, so nothing shares a floor: the bottle's foot is at y~740, the actions row at 850, the Explore button at 896. It is a product thumbnail scaled up, not "an object in a digital museum" (brief 5A).
**Direction.** Make the stage the dominant mass. Grid `minmax(0,6fr) minmax(0,5fr)` (stage ~700px). Frame `width: min(100%, 640px); aspect-ratio: 4/5`. Frame the posters and the 3D camera so the bottle fills at least 88% of the frame height. Stage column `margin-left: calc(-0.5 * var(--gutter))` so the object sits nearer the viewport edge than the type. `align-items: end`, hero padding `40px 0 56px`, so the contact shadow sits on the same line as the Add-to-shelf row. Move "Explore the scent" to the bottom-left of the stage, flush with the bottle's left silhouette, as a 36px quiet control with "Drag to turn" as its second line. Never centre it.
**Effort.** M

### 2. fragrance / body layout and right rail / severity 3
**Finding.** `.layout` is `minmax(0,1fr) 300px` with a 64px gap: main column 916px, rail 300px. The rail holds one 300x200 paper panel ("Worn it?" sign-in; "Your take" when signed in) sticky at `top: header + 64px`, and nothing else for the remaining ~6,300px. On screen that reserves 28% of the content width for a sign-in nag; in the capture it is a 364px empty gutter down the whole page. Meanwhile most sections stop short of 916 (summary 34ch, "Our take" 70ch ~700px, bar charts ~500px, review empty box 550px), so the right edge is ragged and the page reads as a narrow column plus void. Brief 18 asks for a sticky *information* rail and side-by-side data, not an empty gutter.
**Direction.** Preferred: make the rail earn its position as the object's spine: 56x70 bottle thumb, name, score, "Add to shelf" and "Wearing it today" (so the hero's actions stay reachable: brief 18 "sticky contextual actions"), a 300x60 mini-Trail that highlights the band of the section in view, then the five vote prompts as 44px rows. Alternative: drop the rail, give the main column the full 1280 and build every section as a 5/7 or 7/5 split so data sits beside its heading. In both cases use two measures only: 62ch for prose, 100% of the column for data.
**Effort.** L

### 3. fragrance / section rhythm / severity 3
**Finding.** `sections.module.css` gives every section `padding: 48px 0 0` plus `margin-top: 16px`, and all eight (How it moves, Listed vs smelled, How long how loud, When to wear it, Ratings, Reviews, If you like this, Details and sources) follow one template: 32px wide-Archivo title, 17px lede at 62ch, a meta line (count, "Settled", "Demo figures") at the right, content, then a 36px outlined button bottom-left ("How does it read to you?", "What do you smell?", "How did it perform on you?", "When would you wear it?", "Rate it"). Eight identical stanzas over 6,300px is brief 15's "every section having identical vertical padding", verbatim.
**Direction.** Give each section its own shape and interval. How it moves: full-bleed, Trail spanning 1280, 96px above. Listed vs smelled: 5/7 split, heading reduced to a 13px kicker, 64px above. How long how loud + When to wear it: merge into one dense data band on `--linen`, full-bleed, four columns (longevity histogram, projection timeline, seasons, occasions), 96px above. Ratings: 48px above, score left, four sub-scores right. Reviews: the one reading column, 62ch serif, 64px above. If you like this: horizontal shelf (finding 9), 48px above. Details and sources: `--paper` background, 96px above. Remove the five bottom-left buttons; fold each vote prompt into the section's meta line as an arrow link ("1,828 people describing it · Settled · Add yours ->").
**Effort.** L

### 4. fragrance / trail chart / severity 3
**Finding.** `TrailChart` defaults to `height = 220`; after the 22px top pad and the axis, the plot is ~170px tall across the 916px column (x 80 to 996, y ~1190 to 1360). Phase labels are 11.5px, axis labels 11px. The product's signature mark (brief 5E and 30, "as recognisable as Letterboxd's ratings") is physically smaller than one Similar-card plate (217x271), and it is the first thing after the hero.
**Direction.** At >= 1100px render the Trail at 1280x320 spanning both columns (it is the one element that should cross the rail); plot ~260px; phase labels 13px set as a ruler above the plot ("Opening 0-20 min | Heart 20 min-2.5 h | Drydown 2.5 h on") with the alternating phase wash extended up to that ruler; axis ticks 12px. Keep 220 for tablet and the thumbnail variant for cards.
**Effort.** M

### 5. discover / page header / severity 2
**Finding.** With a query active the page stacks a 52px "Find something", a two-line lede, a 52px-tall 720px-wide search field, the "We read that as" chips, the toolbar (active chips, Sort) and a rule, so the first plate starts at y~505 and the result count ("21 matches", 14px grey) sits at y=478. The sticky header already holds a 520px search box 230px above the page's field: two search inputs with the same placeholder voice on screen at once. Sort lives in the toolbar at y=420 and the count below the rule at y=478, so the two halves of a results header are on different rows.
**Direction.** When `q` or any filter is set, collapse the head: H1 becomes the interpreted query in Newsreader italic 40px ("Vanilla, without tobacco"), "We read that as" beneath at 14px; hide the page-level field and let the header's box carry the query (focus on "/"). One results-header row below the rule: count left, Sort right, baseline-aligned. Keep the title, lede and big field only for the empty `/discover`.
**Effort.** M

### 6. signin / page / severity 2
**Finding.** A 440px form (x 80 to 520) sits at the left of a 1280px content area; the remaining 840px and the ~300px below the form are empty porcelain, and the footer begins at y=835 of a 1,221px page. Brief 12 says not to waste half the viewport; this wastes two-thirds with nothing, not even negative space doing a job.
**Direction.** Two columns, 5/7. Form at 440px left. Right column: a scent-wash still life of three bottles from the demo shelf at >= 480px tall, with "Your shelf, your diary, your votes." in Newsreader italic 36px over it; move the demo-account box under the still life so the form is only email, password, sign in, create account.
**Effort.** S

### 7. note / hero band / severity 2
**Finding.** The note hero is a 1440x306 wash band holding "Bergamot" at 77px italic (x 80 to 370) and a single 46x220 blotter strip rotated 6 degrees at x~1310. Those are the only two objects; ~900px between them is empty wash. Below, the 36px "What it smells like" lede is capped at 46ch (~560px) with 700px of nothing to its right for 200px of height.
**Direction.** Make the blotter the object: a fan of three strips (120x420, 100x360, 80x300) overlapping in the right third (x >= 880), dipped to different depths in the note's hue, overhanging the band's bottom edge by 64px into the body. Move the "What it smells like" lede into the band to the right of the name (max-width 34ch, baseline-aligned with the name). Open the body with the "Where it comes from" / "What it does" split at 7/5 and let the "Adds fresh / Adds fruity" bars fill their column (now 120px tracks in a 640px column).
**Effort.** M

### 8. house / page composition / severity 2
**Finding.** The intro (52px "Dior", meta, five-line prose at 66ch) ends in a hairline rule that stops at x=740 while every module below runs to x=1360, so the rule ends in space. "House signature" bars (to x=688) and "On the most shelves" (x 752 to 1360) share a row; then "Every Dior fragrance here, newest first" shows the identical four bottles (Sauvage, J'adore, Eau Sauvage, Dior Homme Intense) as plates 400px below the ranked list that just showed them. With a four-fragrance house, each bottle is on screen twice and the page is four stacked modules for one screen of information.
**Direction.** Two bands. Band 1 (5/7): prose left; "House signature" bars right, top-aligned with the house name, no rule. Band 2: one plate grid carrying the rank badge from the list ("1 · 7.5"), with "newest first" / "most shelved" as two text-link toggles; show the ranked list only when the catalogue holds more than eight. Rules span the full 1280 or do not exist.
**Effort.** M

### 9. fragrance / similar section / severity 2
**Finding.** "If you like this" lays eight plates in `repeat(auto-fill, minmax(180px, 1fr))` inside the 916px column: 4 x 217x271 plates in two rows plus captions, ~950px tall including tabs, the tallest section on the page (taller than the hero). The plates were empty wash in the capture (lazy images), so until images land the section's composition is grey rectangles.
**Direction.** Use the shelf idiom the home page owns: one intentional horizontal row (`grid-auto-flow: column; grid-auto-columns: 164px; scroll-snap-type: x proximity`), plates 164x205, captions beneath, the "Shares bergamot, patchouli" line kept, with the direction tabs (Cheaper, Rated higher, ...) as the row's header. Section height ~380px. Reserve the row height explicitly so a late image never shifts the rhythm.
**Effort.** S

### 10. fragrance / scent-journey phase columns / severity 2
**Finding.** Opening / Heart / Drydown are three equal `1fr` tracks under rules, each with "Listed" and "People notice most" tag groups. Heart has 5+3 tags, the others 2+3, so the columns end at three heights (~200/330/260px) and the "People notice most" labels sit at y=611, 687 and 649: nothing aligns across the row, and the lone "How does it read to you?" button floats 40px under the shortest column.
**Direction.** Make the three columns a subgrid with named rows (when, reads, listed, noticed) so the four labels share baselines. Give the tracks widths that echo the Trail's time axis instead of thirds, e.g. `2fr 3fr 4fr` (opening is 20 minutes, drydown eight hours), so the layout itself says which phase you will live with. Cap each tag group at six with a "+2" overflow so column height is bounded.
**Effort.** M

### 11. perfumer / page composition / severity 2
**Finding.** A single left column: bio at 66ch, rule to x=740, "Their work, in character" bars 430px wide, two 308x385 plates. Everything right of x=740 is empty for the full 1,822px apart from the second plate; the page is 1,800px tall for one screen of content.
**Direction.** 7/5 two-column page. Left: bio, then fragrances as 180px plates in a three-column row. Right, sticky: character bars at full column width (~440px), "Worked with" as house rows, years active. Page height ~1,100px with no dead right half.
**Effort.** M

### 12. shelf / shelf view / severity 2
**Finding.** The plank spans only its three bottles (x 80 to 508, 428px) while the rest of the 896px main column is empty; below the plank (y~540) the main column is empty to y~1180 while the 320px "read back" rail runs to 1070. A shelf that shrinks to its contents is not a shelf; the page is two small objects in opposite corners.
**Direction.** The plank spans the whole main column (x 80 to 976) with 112px slots; bottles fill from the left; empty slots are 1px ticks on the plank with a dashed "+ add" slot at the end. Stack a second plank for Wishlist (3) and a third for Sampled when non-empty, each with a 13px label on the plank's left edge, so the page composes as a cabinet and the rail has something to sit beside. Keep the rail.
**Effort.** M

### 13. profile / page composition / severity 2
**Finding.** The same object appears at three sizes on one screen: "Current rotation" plates 140x185, shelf bottles ~90px tall on a 1280px plank (the bottles occupy 240px of it), 56px thumbs elsewhere. "Scent identity" bars stop at x=688 in a 640px column; "Reviews: No reviews yet." is followed by ~150px of nothing before the footer. The plank here is too long for its contents; on /shelf it is too short.
**Direction.** Two scales only: plate (140x185) and thumb (56x70). Plank bottles at 140px tall, plank width = content width, slots as in finding 12. Layout: left 5 columns "Scent identity" (prose plus bars at full column width); right 7 columns "Current rotation" plates with the shelf plank directly beneath; reviews below at full width, the empty state as a 62ch sentence plus a "Write your first" link rather than a bare line.
**Effort.** M

### 14. diary / layout / severity 2
**Finding.** Three month calendars (3 x 296px, 40px cells) span x 80 to 1020; the "This month" paper panel occupies 300px at the right from y=240 to 410; that rail is then empty for ~4,600px while "Recent wears" (95px rows) runs down the left 940px. It is the fragrance page's empty-rail pattern again. "Log a wear" floats at x 1222 to 1360 at the heading's mid-height with no relation to the calendars beneath.
**Direction.** Drop the rail. Make the calendars a four-column grid (Aug, Sep, Oct, and "This month" as the fourth cell at the same 296px width and top edge). Put "Log a wear" on the calendars' header line, baseline-aligned with the month names. "Recent wears" then spans 1280 as a four-column row grid (date 80px | bottle + name 1fr | weather · occasion 240px | delete 44px) with rows at 72px.
**Effort.** M

### 15. global / page widths / severity 2
**Finding.** Five content measures that share no grid lines: 1280 (home, discover, fragrance hero, compare, notes); 900 centred at x=270 (lists, learn, about); 700 centred at x=370 (review composer); 916 + 300 (fragrance body); 440 left-aligned (sign-in). Moving between pages, the left edge of the type jumps 80 -> 270 -> 370 -> 80, which is what people feel as "not one product".
**Direction.** Define a 12-column grid on the 1280 content width (24px gutters, ~85px columns) in tokens and derive every measure from it: reading pages = columns 3 to 10 (x~297, 764px wide); forms = columns 4 to 9; fragrance body = columns 1 to 9 plus rail 10 to 12; discover = rail 1 to 3 plus results 4 to 12. Narrow pages then start on a line shared with the fragrance body or the discover results, not on their own centre.
**Effort.** M

### 16. home / featured fragrance and headline / severity 2
**Finding.** The featured fragrance is a 663x485 wash box in the right 6fr: bottle image at 3:4 cropped by `object-position: center 70%`, text (house, 52px name, 230x40 Trail thumb, "Read it in ten seconds ->") stacked in the box's right half, and a "Most worn this week" kicker pinned to the top-left corner. It reads as a large product card, not "one beautifully featured fragrance" (brief 11). The 70px headline is forced to three lines by `max-width: 13ch`, leaving "like?" alone on line three, which pushes the search field and example queries down so the ask column ends at y~590 against the box's 627.
**Direction.** Let the feature bleed to the viewport's right edge (wash from x=697 to 1440) and grow to 560px tall; bottle rendered >= 480px tall, standing on the band's bottom padding; name at 64px italic; Trail at 420x64 beneath it; the kicker becomes a 13px dateline under the Trail ("Most worn this week · 312 wears"). Headline `max-width: 16ch` so it breaks "What do you want / to smell like?" in two lines; put the saved 90px above the search field.
**Effort.** M

### 17. fragrance / hero to first section gap / severity 2
**Finding.** From the actions row (y~850) to the hero's bottom edge is 105px, the sticky nav adds 55px, and "How it moves" begins at y~1055: ~205px of nothing at the exact point the page should pull the reader down. Above, the house line sits 93px below the hero's top edge.
**Direction.** Hero padding `40px 0 48px`; let the bottle's foot overhang the hero's bottom edge by 24px so the object breaks the band and the nav rule runs behind its shadow; first section padding-top 48px after the nav. Total gap from actions to first heading ~120px.
**Effort.** S

### 18. fragrance / "Our take" pull / severity 1
**Finding.** `.take` has `padding-left: 20px`, so the editorial paragraph starts at x=100 while every other left edge on the page is x=80, with no rule or mark to justify the indent; at 1.125rem serif and 70ch it also reads as a lede for the Trail rather than a voice of its own.
**Direction.** Either remove the indent, or commit to a pull: 2px ink rule at x=80, text at x=104, Newsreader 1.3rem/1.45, max-width 60ch, "Our take" as a 13px kicker on the rule's line. Not both.
**Effort.** S

### 19. home / explore-by-feeling index / severity 1
**Finding.** Each row is `grid-template-columns: minmax(8ch, auto) 1fr`, so the description column's width depends on the word's length: "Sweet but not sugary" leaves ~100px for "Warmth without the candy shop."; "Fresh but not aquatic" wraps its line to three. Rows share height within a grid row, but the uneven wraps make the rules read as a ragged list rather than the contents page it is meant to be.
**Direction.** Fixed word column of 11em across all three columns; descriptions at 13px with `text-wrap: pretty`, capped at two lines; the two long words span both lines of their row (word on line one, description on line two) via `grid-template-areas` when the word exceeds 11em.
**Effort.** S

### 20. fragrance / section nav / severity 1
**Finding.** The nav's `ul` carries `class="page"`, but the reset `ul[role='list'] { padding: 0 }` (specificity 0,1,1) beats `.page` (0,1,0), so the list loses its 40px gutter and the first label starts at x=52 (40 + the link's 12px padding) while all content starts at x=80. The bar is also a flat porcelain strip whose only structure is a hairline, so after the tinted hero it reads as browser chrome.
**Direction.** Wrap the list in a `div.page` (or restore `padding-inline: var(--gutter)` on the ul with a more specific selector) and add `margin-left: -12px` on the ul so the first label lands on x=80. Give the bar the hero's `--scent-wash` at 50% so it belongs to the fragrance, active underline in ink.
**Effort.** S

### 21. discover / results header and end / severity 1
**Finding.** With 21 results the four-column grid ends on a single plate (Paradigme) with 741px of empty grid to its right and ~100px to the footer. The Sort control is a native `<select>` with the browser's own chevron, the one foreign object on the page.
**Direction.** Close every result set with a full-width end line ("21 of 21 · loosen a filter ->") at 14px under a hairline so the last row never dangles. Restyle the select with `appearance: none`, the `.btn--quiet` box and an inline chevron, or use the Popover in `components/ui`.
**Effort.** S

### 22. lists / page / severity 1
**Finding.** Lists uses the editorial 900px centred measure (x 270 to 1170) although it is a browse page: two 437px columns of entries, each with a 437x120 paper strip of five 60px thumbnails ~30px apart. The home page's overlapping fan of the same bottles is more object-like and half the height.
**Direction.** Put Lists on the 1280 grid at three columns (~405px each); reuse the home `listFan` (overlapping 44x60 thumbs) at 1.5x for the strip so each entry is a shelf of bottles, not a row of stamps; title 1.4rem serif.
**Effort.** S

### 23. home / module rhythm / severity 1
**Finding.** "Explore by feeling", "Trending / Made for autumn", "Note of the week", "Newest in the catalogue" and "Lists / Words worth knowing" all begin `margin-top: 88px`, and four of the five open with a 32px Archivo heading at x=80. The full-bleed note band and the top split are the only shapes that vary; the second half of the page settles into one beat.
**Direction.** Three distinct intervals (56 / 88 / 120) and two heading treatments: data modules (Trending, Newest) keep the 32px sans; editorial modules (Note of the week, Lists) use a 13px kicker plus a 48px italic title. Let "Lists" sit on a `--paper` panel that bleeds left to x=0 so the bottom two-column module is asymmetric in surface as well as width.
**Effort.** S

### 24. compare / heading and add control / severity 1
**Finding.** The 52px "Compare" heading has the 11px "Demo figures" flag hung at its mid-height (y=175) and 900px of empty page to its right; "+ Add a fragrance" is a 170x45 outlined box squeezed into the 170px label column at the top-left of the table, where it competes with the A/B/C column heads.
**Direction.** Put "Demo figures" on the table's meta line (right of the label-column header) and move "+ Add a fragrance" to the heading's right edge as a quiet button (x~1240 to 1360) with "Share this comparison" beside it; the label column's top cell stays empty, as a table corner should.
**Effort.** S
