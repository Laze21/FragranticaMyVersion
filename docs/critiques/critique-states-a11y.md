# Critique: states, accessibility and data honesty

Lens: `states-a11y`. Judged against brief sections 3 (data/legal), 4 (official vs perceived), 19 (accessibility), 23 (provenance), 24 (rating system / sample size), 32 (seed data labelling), 33 (states most AI builds forget).

Sources: screenshots in `scratchpad/shots` (desktop 1440, phone 390), plus `src/app/**/loading.tsx|error.tsx|not-found.tsx`, `src/components/ui`, `src/components/scent`, `src/components/fragrance`, `src/components/reviews`, `src/components/shelf`, `src/components/diary`, `src/styles/tokens.css`, `src/seed/real/*`. Contrast ratios were computed from the token hex values.

Note: the screenshots were taken from a build slightly older than the working tree (they still show "Drag the bottle to turn it", which is no longer in `BottleStage.tsx`). Where code and screenshot differ, findings cite both.

## Keep

- The sample-size discipline: every community aggregate is headed by "N people · confidence meter" (`SectionHead`), averages are withheld under 5 votes ("too few for an average"), longevity is a rounded range rather than a decimal, divisiveness is only labelled at the edges.
- The provenance model: `SourceClaim` with type / verified date / confidence / URL, the `SourceBadge` popover beside the official note list, and the "Where this page's facts come from" list in Details. JSON-LD omits aggregate ratings whenever the baseline is demo.
- Global honesty surfaces: `DemoBanner`, footer disclosure line, `/about/data` with live counts of unsourced claims, "Illustration, not a product photo" credit, `DemoFlag` on every aggregate, "Demo account" on the profile.
- Trail accessibility scaffold: `role="img"` description, the visually-hidden phase table, and the keyboard scrubber with `aria-valuetext`.
- Platform-native modals (`<dialog>` Sheet, bottom sheet under 720px with a drag handle), the ARIA 1.2 combobox search with "/" shortcut, ARIA tabs with arrow keys in Similar, the skip link and focusable `<main>`.
- Global 2px oxblood `:focus-visible` ring, 16px inputs (no iOS zoom), 44px `.btn` and `.input`, reduced-motion zeroing of duration tokens, `BottleStage` capability gating (reduced motion, save-data, slow network, low memory, no WebGL) with poster-first rendering.
- Review states that already exist: deleted-review placeholder that keeps replies, gifted disclosure line, filter-no-match line, load error with retry, "Owners only" filter.
- Discover "Nothing matches all of that" with one-tap "loosen one thing" chips; the "We read that as" interpretation strip with "Search the exact words instead".
- Optimistic shelf updates with rollback on failure, Undo on "wearing it today", offline notice, "Marketed to men. That's the house's positioning. Anyone can wear anything."

## Findings (severity-ranked)

### 1. Provenance notes ship the build process to readers (sev 3)
Page: fragrance · Area: Details and sources · Brief 3, 23 · Effort S

What is wrong: The Details list on Sauvage reads "Dior (dior.com product page, to verify)" followed by "House and retailer pages were blocked by the research network policy; launch year, perfumer and EDT concentration are widely published by Dior; not re-checked on the page." That text is in the seeded database and on screen. In the working tree `src/seed/real/fragrances-c.ts` still prefixes every claim note with `No web access in research session (search budget exhausted, house and retailer hosts blocked by egress proxy).` This is an agent's log, not a product's provenance. It undermines the exact differentiator the brief names ("users can understand where information came from").

Direction: Claim notes must be written for the reader and say only two things: what the source asserts and what we have not checked. Example: source name "Dior", status chip "Unverified", note "Launch year, perfumer and EDT concentration as Dior publishes them; not yet checked against dior.com." Strip the `OFFLINE` prefix and the "(…, to verify)" suffixes; move editorial reasoning to an `internal_notes` column that is never rendered; reseed. Render the status as a chip (Unverified / Checked Oct 2026) instead of the trailing "· not yet verified" text so the state is scannable.

### 2. "Settled" confidence on demo figures, at production scale (sev 3)
Page: fragrance (also compare, note) · Area: section heads, hero rating · Brief 3, 24, 32 · Effort M

What is wrong: Every section head reads "2,948 people reporting · ▮▮▮ Settled · ○ Demo figures". The hero stacks "7,615 ratings / Divisive / Demo figures". The confidence meter awards its top label to generated distributions, and the counter formats them like real traffic; the only counterweight is a 12px bergamot flag with a 6px hollow dot. The brief forbids "fake review counts pretending to be genuine production data". Demo data that is labelled but shaped like a mature community still reads as one.

Direction: When `includesBaseline` is true: (a) do not render the confidence meter or its label; (b) render the count as "demo: 2,948 votes" in the same 12px line as the flag, not as the first item; (c) make `DemoFlag` a `Popover` button ("Demo figures" → "These distributions are generated so the charts can be explored. No real votes are counted here yet. How the data works →"). In the hero, replace the "7,615 ratings" line with "Demo rating" set at the same weight as "Divisive". Separately, reduce the baseline sizes to early-community numbers (40–300) so "Early read" and "Taking shape" actually appear and the product's own honesty mechanics get exercised in screenshots.

### 3. Reviews zero state contradicts the page and hides its CTA (sev 3)
Page: fragrance · Area: Reviews · Brief 33, 32, 16 · Effort S

What is wrong: After "7,615 ratings" and "1,828 people describing it", the Reviews section is a flat paper box: "No reviews yet. Worn it? A two-sentence quick take helps…". Nothing explains why thousands of voters wrote nothing; the "Write a review" button lives in the section header, 600px to the right on desktop and above the box on mobile, so the empty state has no action of its own. One-review and thousands-of-reviews states cannot be judged because none exist in seed.

Direction: Make the empty state the first row of the review column, no box: hairline top, serif line "Nobody has written about Sauvage yet.", then a sans line that is honest about the gap when `includesBaseline` ("The votes above are demo figures. Reviews are only ever real, so this stays empty until someone writes one."), then the primary action inside the state ("Write the first quick take" → `/review`, or "Sign in to write the first one"). Seed 1 review on one fragrance and 40+ on another so the one/many states are designed, not assumed.

### 4. Loading and error states exist for one route and are generic (sev 3)
Page: global · Area: route states · Brief 33, 20, 29 · Effort M

What is wrong: Only `src/app/fragrance/[slug]/loading.tsx` exists; it uses an `auto-fit` grid, no `--scent-wash` tint, no section nav, no rail, so it does not share the hero's proportions and content jumps when it arrives. `/discover`, `/shelf`, `/diary`, `/u/[handle]`, `/compare`, `/notes/*`, `/house/*` have no loading state at all, and there is no `error.tsx` below the root, so a failing `getSimilar` or review query takes out the entire fragrance page with "Something went wrong."

Direction: Add `loading.tsx` per route that reuses the route's real layout classes: discover = title + search bar + 3-col plate grid skeletons (4:5 boxes, two text bars); shelf = title + 7 chip tabs + ledge with three bottle silhouettes; diary = three month grids + 5 entry rows; profile = 72px avatar circle + name bar + two column blocks. Fragrance skeleton: hero in `var(--linen)` with a 3:4 stage box, a `--t-title-xl` bar, 2-col quick-read dl bars, three 44px button slots, then the sticky nav bar. Add `error.tsx` for `/fragrance/[slug]`, `/discover`, `/shelf`, `/diary` with context copy ("The page for this fragrance didn't load. Try again, or search for it.") and wrap `Similar` and `ReviewList` in error boundaries that render a section-level line ("Similar fragrances didn't load. Retry") rather than failing the page.

### 5. Blank plates while images load (sev 2)
Page: fragrance (Similar), discover, shelf · Area: FragranceCard · Brief 20, 34 · Effort S

What is wrong: In `frag-sauvage-d` the eight Similar plates are empty tinted rectangles 216×270 with no silhouette, no name inside, nothing until the image arrives. `.ground` has no placeholder; `.noImgPlate` only handles the null case. On a slow network the "If you like this" grid is eight grey blocks.

Direction: Give every poster a `placeholder="blur"` using a 16px-wide base64 generated in `scripts/images` at build time (store on `fragrance_assets.blur_data`), and draw a 28px `bottle` icon in `stone-2` centred in `.ground` beneath the image so even the first paint shows an object. Apply the same to `.rowThumb`, diary `.thumb`, compare `.thumb`.

### 6. Explanations trapped in `title` tooltips (sev 2)
Page: fragrance, compare · Area: DemoFlag, confidence meter, stacked bars, seasons · Brief 19 · Effort S

What is wrong: `DemoFlag` explains itself only via `title=`; `SectionHead` confidence uses `title="How settled this number is…"`; the Performance "First hour" stacked bar carries its percentages only as `title` per segment; compare Seasons use `title="spring: 86%"`. `title` never fires on touch, is not keyboard-reachable, and is announced inconsistently.

Direction: Reuse `Popover`: "Demo figures" (button) → meaning + link; "Settled" (button) → "Settled: 250+ votes. Taking shape: 30–249. Early read: 5–29." Put the numbers in the DOM for the stacked bar (see 7). Drop `title` attributes site-wide except on truncated text.

### 7. Projection "First hour" bar encodes five levels by opacity only (sev 2)
Page: fragrance · Area: Performance · Brief 19, 5F · Effort S

What is wrong: Five segments of `--scent-ink` at opacity 0.25 → 0.97, legend only "Skin … Room-filling" at the ends. A sighted user cannot tell which segment is "Conversational" or its share; information is carried by shade alone, which the brief rules out.

Direction: Replace with five labelled rows in the shared `.barRow` pattern ("Skin 4%, Close 18%, Conversational 41%, Arm's length 30%, Room-filling 7%"), or keep the stacked bar and print the label inside any segment ≥ 14% with a key beneath for the rest. Keep the `role="img"` aria-label.

### 8. Touch targets under 44px on phones (sev 2)
Page: global · Area: chips, tags, steppers, remove controls · Brief 18, 19 · Effort S

What is wrong: On coarse pointers `.chip` is 40px (filters, review-kind radios, every vote sheet), `NoteTag .tag` 40px, `SourceBadge .badge` 40px, `DiscoverControls .seg/.match button` 40px, `ShelfView .views button` 40px, diary `.del` and `.stepper button` 40×40, compare `.remove` 32×32, `ReviewItem .more` 36px, `.editBtn` 36px, `MobileTabBar .label` 11px.

Direction: Set the coarse-pointer minimum to 44px for `.chip`, `.tag`, `.badge`, `.seg button`, `.match button`, `.views button`, `.del`, `.stepper button`, `.more`, `.editBtn`; compare `.remove` → 44×44 with the × centred. Where visual density matters, keep the drawn height and extend the hit area with `padding-block` plus negative margin. Tab-bar labels 12px.

### 9. Every empty state is the same flat paper rectangle (sev 2)
Page: global · Area: section/shelf/diary/discover empties · Brief 33, 15 · Effort M

What is wrong: `s.empty`, `ReviewList .empty`, discover `.empty`, shelf `.empty`, diary `.empty` are all `background: var(--paper); padding 24–40px; max-width 60ch`, serif line + sans line, no object, usually no action. The shelf empty says "Open any fragrance and use Add to shelf" with no button; the diary empty refers to a button outside itself; section empties put the vote CTA outside the box. They read as placeholders.

Direction: One `EmptyState` component, three variants. (a) In-section "no data yet": no box; hairline top; a 24px mark from the icon set (blotter strip for notes, atomizer for performance, sun/moon for wear); serif line; sans line stating the rule ("Ranges appear once five people report"); the vote button inline. (b) "Nothing matches" (discover): keep relax chips and always show "Nearest we have" with the three closest cards so the page never ends on nothing. (c) "Yours is empty" (shelf/diary): draw the ledge empty with one dotted bottle outline and the primary CTA inside ("Find something to put on it"); diary shows the calendar with today ringed and "Log today's wear" as the in-state button.

### 10. Private profile and 404 are unfinished (sev 2)
Page: profile, global · Area: PrivateProfile, not-found · Brief 33 · Effort S

What is wrong: `PrivateProfile` is inline-styled: 28px lock, h1, one sentence, nothing else; no follow, no way back, no bottom padding so the footer sits under it; `/u/[handle]/shelf` returns the same stub. The 404 has three equal buttons and no search field; a bad `/fragrance/*` slug gets the generic "Nothing here."

Direction: PrivateProfile reuses the profile header (monogram avatar, name, @handle, lock as a 16px inline mark), line "Keeps their shelf, diary and lists private.", then Follow (when signed in) and "Browse public lists"; `padding-bottom: var(--s-11)`. 404: inline `SearchBox` focused on load, "Home" demoted to a text link; when `pathname` starts with `/fragrance/`, title "No fragrance at this address" and "Suggest it" as the secondary action.

### 11. Bar charts are silent for screen readers (sev 2)
Page: fragrance, profile, house, note, compare · Area: CharacterBars and dim bars · Brief 19 · Effort S

What is wrong: `CharacterBars` hides the track (`aria-hidden`) and prints no value, so a screen reader hears "Warm, Clean, Woody" with no magnitude; compare `.dims` and note `.dimBar` likewise. (Seasons, occasions, ratings sub-scores and diary bars do print numbers.)

Direction: In each bar row add `<span class="visually-hidden">{pct}%</span>` (or "{n} of {max}"), or write the values into the list's `aria-label`. Make the rule explicit in `docs/04-design-system.md`: no bar without a number in the DOM.

### 12. Trail band labels and 11px text fail contrast (sev 2)
Page: fragrance, global · Area: TrailChart labels, micro text · Brief 13, 19 · Effort S

What is wrong: Computed from the hues: "Green" (porcelain 0.92 on `#7E9473`) is 2.9:1, "Sweet" 3.7:1, "Warm" 4.0:1, "Powdery" 4.5:1 at 11px bold. Axis and phase labels are 11–11.5px `fg-3`. `.credit`, `.hint`, `.colPct`, `.bottleHouse`, `.tHouse`, tab-bar labels sit at 11px.

Direction: Draw every band label in ink at 11.5px with `paint-order: stroke; stroke: var(--porcelain); stroke-width: 3px` (drop the `data-dark` branch), or move labels into a legend column to the right of the chart. Set 12px (`--t-micro`) as the floor for any text and remove the 10–11.5px literals.

### 13. Illustrated bottles are not marked where they are seen (sev 2)
Page: fragrance, discover, shelf, home · Area: BottleStage credit, FragranceCard · Brief 3, 32 · Effort S

What is wrong: The only on-stage marker is the 12px `fg-3` credit "Illustration, not a product photo." under the controls (≈4.4:1 on the Sauvage wash). Discover, shelf, home and compare show the same illustrations with no marker. The banner that carries the disclosure can be hidden for the session.

Direction: A small outlined "Illustration" tag (12px, `stone-2` outline, ink text, pill, top-left of the stage frame) that opens the credit popover; cards show a tiny "ill." mark in the plate corner on hover/focus and always in the row variant's meta line. Mobile banner collapses to one line "Prototype · demo votes · illustrated bottles" with "?" → `/about/data`, and re-shows once per session on the first fragrance page.

### 14. Focus visuals change shape or collide (sev 2)
Page: global · Area: NoteTag, ScoreRow, chips · Brief 19 · Effort S

What is wrong: `NoteTag .tag:focus-visible { clip-path: none }` turns the blotter strip into a square block with a raw colour bar on focus. `ScoreRow` buttons rely on the global 2px outline with 2px offset inside a 4px-gap grid, so rings overlap neighbours. Popover content opened by keyboard keeps focus on the trigger with no hint the content is next in Tab order.

Direction: NoteTag: keep `clip-path`, draw focus as `box-shadow: inset 0 0 0 2px var(--focus)` plus an underline on the name. ScoreRow and `.seg`: `outline-offset: -2px`. Popover: when opened via keyboard, move focus to the first link inside and return it on Escape.

### 15. 3D states are text afterthoughts (sev 2)
Page: fragrance · Area: BottleStage controls · Brief 5A/B, 19, 20 · Effort S

What is wrong: "Loading 3D view…", "3D view unavailable. The picture has everything." and the "View in 3D" offer are 12px `fg-3` strings beside the Explore button; nothing in the stage changes. Capability reasons (reduced motion, save-data, slow network, low memory) collapse into one sentence; there is no way to turn 3D off once loaded, and the current source has no "Drag to turn" affordance at all.

Direction: Reserve one 20px status line under the frame with three designed states: loading = a 1px progress hairline along the frame's bottom edge in `--scent-ink` + "Loading the turning bottle"; ready = `rotate` glyph + "Drag to turn", fading after the first drag; off = "Turning bottle off: you asked for reduced motion" / "…saving data" with a "Turn on" button. Never more than one message, never below 12px.

### 16. Null values are an em dash (sev 2)
Page: fragrance, compare, shelf · Area: quick read, details, tables · Brief 16, 33 · Effort S

What is wrong: Hero quick read prints "Best for —" and "Compare with —"; Details "Unknown"; compare "—" for price/released/longevity; shelf table "—" for size, fill, paid. Hero says "Perfumer not disclosed", Details says "Not disclosed by the house". A reader cannot tell unknown, not applicable, or no votes apart.

Direction: Three phrases used consistently: "Not known yet" (fact not sourced), "Not enough votes" (community), "Not published" (house did not disclose). In the hero, drop the row rather than print a null. In compare and tables, keep the row and set the cell in `fg-3` italic. Unify the perfumer phrase to "Not disclosed".

### 17. Vote sheets use custom radio buttons without the radio pattern (sev 2)
Page: fragrance, review, discover · Area: VoteProvider sheets, ScoreRow, review-kind radios, DiscoverControls seg · Brief 19, 4 · Effort M

What is wrong: `role="radio"` buttons inside `role="radiogroup"` have no roving tabindex or arrow keys, so every option is a Tab stop and the group semantics mislead. `WearSheet` is a tri-state cycle ("Tap once for yes, twice for no, three times to skip") with "✓ " / "✕ " text glyphs that get read aloud.

Direction: One `useRadioGroup` hook (roving tabindex, Left/Right/Up/Down, Home/End) applied to ScoreRow, PerformanceSheet, CharacterSheet `.seg`, ReviewList kinds, ReviewComposer kinds, DiscoverControls `.seg/.match`. WearSheet: a three-segment control per context (Fits / Doesn't / Skip), icons from the icon set with `aria-hidden`.

### 18. Error toasts time out like confirmations (sev 1)
Page: global · Area: Toaster · Brief 33, 17 · Effort S

What is wrong: Error toasts use the same 3.6s timeout as "Saved."; a failed vote can vanish before it is read; no close control; Undo exists for wear logs but not for shelf status changes or removal.

Direction: Error toasts persist until dismissed (44px × button, `role="alert"`); pause timers on hover/focus; add Undo to "removed from your shelf" and to status changes.

### 19. Primary action renders disabled on first paint (sev 1)
Page: fragrance · Area: ShelfActions, YourTake · Brief 20, 33 · Effort S

What is wrong: `ShelfActions` sets `disabled={!loaded}`, so every fragrance page shows a 45%-opacity "Add to shelf" until `/api/me` returns; on slow connections that is a visible flash of a greyed primary action. `YourTake` shows a 280px skeleton that does not match the panel's real height.

Direction: Render the button enabled with a neutral label and queue the intent until `loaded` resolves (then open the menu or redirect to sign-in); mark `aria-busy` without changing opacity. Size the rail skeleton to the real panel (title + 4 rows at 46px + button ≈ 330px).

### 20. Discover zero state inside the mobile filter sheet (sev 1)
Page: discover · Area: filter sheet footer, interpretation strip · Brief 33, 7 · Effort S

What is wrong: The sheet footer reads "Show 0 results" with no guidance; relax chips live only on the page behind the sheet. When `interpret()` finds nothing, the sentence is searched literally with no message.

Direction: When `total === 0`, the footer becomes "No matches: loosen a filter" (disabled) and the relax chips render inside the sheet above the footer. When interpretation finds nothing: "Searched the exact words" with a link to the feelings grid.

### 21. Compare on phones: small controls and 10px season labels (sev 1)
Page: compare · Area: sticky header, seasons row · Brief 5J, 18 · Effort S

What is wrong: Remove × is 32×32; names truncate to "Y" at 0.98rem; Seasons mini-bars carry 10px labels "spr 86"; the demo flag sits only beside the title.

Direction: Remove link 44×44; seasons → the four-tube layout at 56px with 12px labels; render `DemoFlag` as a full-width 12px line beneath the sticky header on phones.

### 22. Sheet focus lands on Close (sev 1)
Page: fragrance, shelf, diary, discover · Area: Sheet · Brief 19 · Effort S

What is wrong: `showModal()` focuses the first focusable element, which is the Close button, so screen readers hear "Close" before the sheet's question; no `aria-describedby` for the description.

Direction: Focus the body container (`tabIndex={-1}`) or the first field on open; add `aria-describedby="sheet-desc"`.

### 23. Chart instructions as body copy; partial reduced-motion coverage (sev 1)
Page: fragrance · Area: TrailChart, animations with literal ms · Brief 16, 17, 19 · Effort S

What is wrong: "Hover or drag across the trail, or focus here and use arrow keys." is permanently visible under the chart (brief 16: do not over-explain UI). Animations with literal durations (`press 420ms`, `puff 720ms`, `.frame canvas 600ms`, `.band` opacity) are covered piecemeal while token-based ones are zeroed.

Direction: Make the instruction visually hidden and add a visible scrub handle (2px ink line with a 10px knob at the current time) so the affordance is seen. Add one scoped reduced-motion rule for decorative classes (`animation-duration: 0.01ms !important; transition-duration: 0.01ms !important`).
