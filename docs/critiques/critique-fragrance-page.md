# Critique: fragrance detail page

Lens: fragrance-page. Reviewed `/fragrance/dior-sauvage`, `/fragrance/chanel-no-5`, `/fragrance/aventus` at 1440 and 390, against `docs/00-brief.md` section 5 (bottle stage, 10-second read, journey, performance, wearability, reviews, similar), 12 to 18 (visual direction, mobile) and 35 (AI-tell audit). Code read: `src/app/fragrance/[slug]/page.tsx`, `page.module.css`, everything in `src/components/fragrance/`, `src/components/scent/TrailChart.tsx`, `src/styles/tokens.css`, `src/lib/bottle/stage.ts`, `supabase/seed.sql`.

## Keep (must survive the redesign)

- The Trail chart as the signature visual: stacked character bands over a time axis with phase regions, a scrubber, a hidden data table and a prose `describeTrail` fallback. It is the one thing on the page that could become "ours". Fix its edges (below); do not replace it with a radar.
- "Listed vs. smelled" as a first-class section with the two callouts ("Not on the list, but people smell it", "Listed, but rarely noticed"). This is the brief's differentiator and the copy is exactly right.
- The copy voice everywhere: summaries ("Bright, loud and very easy to like."), "Our take", section ledes ("Ranges, not promises."), the Ratings lede. No AI copy tells.
- Vote counts + the three-bar confidence meter ("1,828 people describing it · Settled") on every community section. Sample size is always visible.
- Newsreader italic for fragrance names, Archivo widened for section heads, ink-only buttons, square surfaces, 2px radii. The palette discipline (porcelain/ink/oxblood/bergamot/juniper) is correct even if the per-fragrance accent is currently too timid.
- The five-step projection vocabulary (Skin / Close / Conversational / Arm's length / Room-filling) and the longevity bucket histogram instead of x/5 scores.
- "Reads clean and warm" highlighter phrasing per phase.
- The provenance architecture: `SourceBadge`, claim types, confidence, verified date, "Suggest a correction with a source".
- Poster-first, 3D-second with `autoLoad3d()` gating on reduced motion, save-data, memory and WebGL; on-demand rendering; the atomizer press, mist and shelf-placement microinteractions in `ShelfActions` and `MistOverlay`.
- The bottom sheets for voting (`VoteProvider`) and the idea of a contextual mobile action bar.

## Findings (severity-ranked)

### 1. [S3] Bottle stage — the renders do not look like the real bottles, or like glass
Page: fragrance. Area: bottle stage. Brief: 5A "object in a digital museum", 32 seed quality, user's own words ("look up how the fragrances look like, then create real accurate 3D renders").
Seen: Sauvage is a grey-blue translucent cube with a flat black lid; the real bottle is a tall slab with a navy-to-clear vertical gradient, a magnetic black cap with a thin silver band and "Sauvage" in silver script. N°5 is an opaque butter-yellow block with a frosted white stopper; the real parfum is clear glass, golden-amber liquid you can see through, a faceted "emerald-cut" stopper and a black-keyed label. Aventus is a brown opaque brick with a silver puck; the real one is black/near-opaque glass with a tall silver cap and a silver crest plate. All three share the same failures: no refraction (liquid reads as paint), no caustic or specular edge, no thickness at the shoulders, a contact shadow that is a faint ellipse, and the same lighting rig regardless of material (`stage.ts` one key + one rim + hemisphere).
Direction: per-fragrance specs from reference photos (profile silhouette, cap proportions, label geometry, glass tint, fill level, liquid colour); glass as `MeshPhysicalMaterial` with `transmission: 1`, `ior: 1.5`, `thickness` 0.3 to 0.6 of body depth, `attenuationColor` = glass tint, `attenuationDistance` tuned per bottle; liquid as a separate inner mesh with its own absorption colour (N°5 amber `#C8923A` not `#F1E2B2`); dark bottles via attenuation, not opaque diffuse. Render posters at 2x, 3/4 view, one long vertical softbox reflection, soft contact shadow + 12 percent ground reflection; export an 8-frame turnaround sprite for reduced motion. Effort: L.

### 2. [S3] Bottle stage — no presence: the bottle floats in a grey field that is the page
Page: fragrance. Area: bottle stage. Brief: 5A, 12 ("let photography and fragrance objects breathe", "do not waste half the viewport").
Seen: at 1440 the stage column is `5fr` of a `page` grid, the frame is 520x693 and the bottle occupies about 300x540 inside it, centred, on `--scent-wash` (14 percent accent) which is indistinguishable from porcelain. No ground, no horizon, no plinth; the "Explore the scent" black button sits under it at left with "Drag the bottle to turn it" permanently beside it. Two black primary buttons on one screen (Explore, Add to shelf).
Direction: let the stage bleed to the left viewport edge (grid `minmax(0,6fr) minmax(0,5fr)` with the stage column starting at x=0, identity column keeps the gutter); a two-tone ground inside the stage: `--scent-wash-2` below a horizon at 72 percent height, `--scent-wash` above, hero-only accent strength 24 to 30 percent; bottle scaled to 82 percent of stage height with a soft contact shadow baked in the poster; "Explore the scent" becomes a quiet 36px `btn--quiet` in the stage's bottom-right corner with the atomizer icon; the drag hint shows once for 3 s after 3D mounts, then goes. Effort: M.

### 3. [S3] Reviews — the section is empty on every fragrance
Page: fragrance. Area: reviews. Brief: 5H ("reviews are a major reason people use fragrance communities"), 32 ("enough high-quality seed content"), 33 (one review, thousands).
Seen: `supabase/seed.sql` contains zero `insert into public.reviews`. A fragrance showing 7,615 ratings renders "No reviews yet." in a 550px paper box. `ReviewList` has sort, kind, focus and owner filters, but a visitor never sees them.
Direction: seed 6 to 12 reviews per flagged flagship (4 quick takes, 2 to 4 full reviews, mixed focus tags, wear counts, experience level, one gifted-disclosure), marked `is_demo`. Layout: a "Quick takes" rail of 3 cards (2 to 4 sentences, author, wear count, helpful count) above the filter row, then full reviews in the 62ch prose measure with a sticky left meta column (score, longevity reported, focus tags). Sort/filter row = chips: Most helpful · Recent · Highest · Lowest | Quick takes · Full | Focus. Effort: L.

### 4. [S3] Global — the per-fragrance accent is invisible, so every page is the same grey
Page: fragrance. Area: global/colour. Brief: 13 ("each fragrance can introduce a controlled scent accent"), 12 ("not sterile luxury").
Seen: Sauvage's `accent_hex` is `#3D5573`, a real navy, yet the hero wash (14 percent) reads as grey; chart fills use `--scent-ink` (55 percent accent into ink), which collapses to near-black for any hue; the longevity histogram uses 35 percent of that in linen = flat grey. Sauvage, N°5 and Aventus are visually identical below the fold; only the Trail carries colour.
Direction: `--scent-wash: color-mix(in oklab, var(--scent) 26%, var(--porcelain))` in the hero only (keep 14 percent elsewhere); chart primary = `color-mix(in oklab, var(--scent) 72%, var(--ink))`, peak/typical bucket in pure `--scent`, non-peak in `color-mix(var(--scent) 35%, var(--linen))`; the 2px hero rule and section `colHead` borders tinted `--scent-ink`. Check contrast of `--scent-ink` on porcelain per fragrance (floor 4.5:1, fall back to ink). Effort: S.

### 5. [S2] Desktop rail — 300px of empty column for 6,500px
Page: fragrance. Area: right rail. Brief: 18 ("desktop can take advantage of a sticky information rail").
Seen: `styles.rail` holds only `YourTake`, a 200px "Worn it?" sign-in card; it is sticky, so the rest of the 7,300px page has a blank right column.
Direction: make it the information rail. Once `#hero-actions` leaves the viewport: 56px bottle thumb, name (serif italic 20px), score + count, `ShelfActions compact`, then the section list vertically (replace the horizontal `SectionNav` at >=1100px; keep it below). "Worn it?" / "Your take" folds in below. Effort: M.

### 6. [S2] Identity — the 10-second read is a spreadsheet
Page: fragrance. Area: identity block / quick read. Brief: 5C.
Seen: six `dt/dd` pairs in three equal columns, labels 12px grey with dotted underlines on "Lasts" and "Projection" (the `Term` affordance looks like a spell-check mark), values all 14px/560; "Compare with" switches to italic serif links; the hero rule is 2px ink but the quick read under it is the lightest text on the screen. The content answers all six questions; the form does not let a beginner read it in ten seconds.
Direction: two stanzas. Stanza 1, figures: "7–10 h" in `--t-figure-l` serif + a projection glyph (five 8px discs, 4 filled -> arrow -> 2 filled, labelled "Arm's length, then conversational") + price as a 3-step glyph with "$135 / 100 ml". Stanza 2, one sentence in `--t-sub`: "Everyday wear and casual nights out · spring to autumn, day or night." "Compare with" becomes two 32px bottle thumbs with names, right-aligned. Term affordance: a 12px circled-i after the word with dotted underline on hover/focus only. Effort: M.

### 7. [S2] Identity — rating and collection controls are the 4th and 5th things in the column
Page: fragrance. Area: identity block. Brief: 5A lists rating and collection controls as part of the bottle stage identity; 18 "fast collection controls".
Seen: score at y~735 and buttons at y~830 at 1440; on the phone they are ~1,100px down.
Direction: set the score on the title line: name left, "7.5" (`--t-figure-xl`, serif) with "/10 · 7,615" beneath it right-aligned to the identity column edge, baseline-aligned with the name. `ShelfActions` directly under the facts line, above the rule. The quick read follows. On phones, `ShelfActions` is the row directly under the name. Effort: S.

### 8. [S2] Ratings — every fragrance is "Divisive"
Page: fragrance. Area: ratings / hero meta. Brief: 24 ("do not imply precision"), 16 ("specific").
Seen: Sauvage, N°5 and Aventus all show "Divisive". `divisiveness()` labels spread >= 1.75 as Divisive, which is below the natural standard deviation of any 1 to 10 rating distribution, so the label never discriminates.
Direction: calibrate against the catalogue: compute spread percentiles across fragrances with >= 100 ratings; top quartile = "Divisive", bottom quartile = "Broad agreement", middle = no label. Show "Divisive" only when the histogram is bimodal (two local maxima >= 3 apart). Effort: S.

### 9. [S2] Trail chart — clipped axis, hard left edge, empty right fifth, visible instructions
Page: fragrance. Area: trail chart. Brief: 30 (signature visual), 16 ("do not over-explain UI").
Seen: "Spray" renders as "Sprav" because axis text sits at y=18 of a group translated to `topPad + plotH + 8` = 202 in a 220px SVG; the stream starts at x=0 with a vertical cut; bands end at ~8.5h while the axis runs to 12h+, leaving the right 20 percent blank; "Hover or drag across the trail, or focus here and use arrow keys." is printed under the chart; band labels are 11px.
Direction: SVG height = `height + 14`, plot inset 10px left; x-domain end = `max(10, longevity * 1.25)` with the final tick labelled "end"; keyboard hint moves to `aria-description`, visible caption becomes the scrub readout only; band labels 12px/600 with `paint-order: stroke` 2px porcelain halo. Effort: S.

### 10. [S2] Journey phases — the same notes are printed twice 60px apart
Page: fragrance. Area: journey phases. Brief: 5D, 15 (component repetition).
Seen: Opening lists "Bergamot, Black pepper" under Listed and "Bergamot, Black pepper, Fizzy" under People notice most; the Heart column repeats Sichuan pepper and Lavender. "Our take" sits between the chart and its phase legend.
Direction: one row per phase: listed notes as blotter tags, each carrying a small percent badge when >= 20 percent notice it; un-listed-but-noticed notes appended with a dashed outline and a "not listed" micro-label. Drop the second row. Move "Our take" below the phases as a pull quote (serif 22px, 44ch, 2px `--scent-ink` left rule). Effort: S.

### 11. [S2] NoteTag — the "blotter strip" reads as a breadcrumb arrow
Page: fragrance. Area: note tags (journey, listed vs smelled). Brief: 15 (icon choices), 30 (recognisable language).
Seen: a white rectangle with a pastel chevron tail on the right, 14px/600 text, 32px tall; in rows of six they look like a wizard-step breadcrumb; inside the "What people smell" bars the chevrons fight the bars. On the phone, "Cedarwood" breaks to "Cedarwoo / d".
Direction: make the blotter literal: 28px strip, paper background, 1px `--line`, 2px radius, the colour as a dipped tip on the LEFT (6px solid stain fading to transparent over 14px), text 13px/540, `overflow-wrap: normal` with `hyphens: manual`. In bar charts use plain labels with an 8px dot. Effort: S.

### 12. [S2] Listed vs smelled — the header contradicts its own badge
Page: fragrance. Area: listed vs smelled. Brief: 3, 23 (provenance).
Seen: "Listed by the house" next to a badge reading "Editorial · checked not yet".
Direction: title follows the claim's `sourceType`: "Listed by Dior" for `official_brand`; "Listed (per Dior, unverified)" for `editorial`; "No official list yet" otherwise. Badge shows the date only. Effort: S.

### 13. [S2] Details and sources — internal research notes leak into the UI
Page: fragrance. Area: details and sources. Brief: 16, 35 (AI tells), 3 (provenance for users).
Seen: four claims print "House and retailer pages were blocked by the research network policy; ... not re-checked on the page." A reader does not know what a research network policy is; it reads as an agent's log.
Direction: `claims[].notes` is internal; show source name, type pill, confidence, verified date only; render one user-facing line for unverified claims: "Not yet checked against dior.com". Keep the notes in admin. Effort: S.

### 14. [S2] Mobile — 212px of fixed chrome, and the sticky bar lacks the two actions people use most
Page: fragrance. Area: mobile chrome / action bar. Brief: 18 (thumb reach, fast collection controls, sticky contextual actions).
Seen at 390: header 60 + section nav 44 at top, action bar 48 + tab bar 60 at bottom = 25 percent of an 844px viewport. The action bar offers Rate · I smell… · Review; "Add to shelf" and "Wearing it today" are only in the hero.
Direction: collapse the section nav into the header on scroll (page title + "Sections" button opening a sheet); hide the global tab bar on fragrance pages while the action bar shows; action bar = Shelf · Wear today · Rate · More (I smell / Review / Compare in a sheet). The atomizer press plays from the bar. Effort: M.

### 15. [S2] Mobile hero order — the CTA precedes the name, controls arrive at 1,100px
Page: fragrance. Area: mobile hero. Brief: 18 ("Bottle / identity, quick summary, primary accords...").
Seen: bottle (42vh) -> "Explore the scent" black button -> house -> name -> facts -> rule -> summary -> character -> quick read -> rating -> buttons -> nav.
Direction: bottle (36vh) with Explore as a corner control -> house / name / facts -> `ShelfActions` row -> rating line -> summary -> character -> quick read. Effort: S.

### 16. [S1] Facts line — a separator leads the wrapped line
Page: fragrance. Area: identity facts. Brief: 34 (long names).
Seen (Aventus, 390): "Eau de Parfum · 2010" then "· by Erwin Creed and Olivier Creed" starting with the dot.
Direction: attach the separator to the previous item (`.facts > span:not(:last-child)::after` with `white-space: nowrap`), so a line never starts with "·". Effort: S.

### 17. [S1] When to wear — the day/night bar implies a 100 percent split; two seasons share an icon
Page: fragrance. Area: when to wear. Brief: 5G, 19 (accessible charts).
Seen: Day 85 percent and Night 58 percent drawn as one bar split 85:58; Spring and Autumn both use `leaf`.
Direction: two independent bars on the same 0 to 100 scale (same `barRow` as weather); Spring = sprout, Autumn = falling leaf glyphs (`Icon` additions). Effort: S.

### 18. [S1] Performance — the first-hour stacked bar encodes levels by opacity only
Page: fragrance. Area: performance. Brief: 19 ("no information communicated solely through colour"), 5F.
Seen: five segments at 0.25 to 0.97 opacity with only "Skin" and "Room-filling" at the ends; the histogram bars are grey.
Direction: label segments >= 12 percent inline ("Arm's length 41%"), outline-only for the two lowest levels; typical-range buckets in `--scent`, others in `color-mix(var(--scent) 35%, var(--linen))`. Effort: S.

### 19. [S2] Similar — eight identical grey plates
Page: fragrance. Area: similar. Brief: 5I, 15 (grid symmetry, component repetition).
Seen: 2 rows x 4 plates, every ground the same `--scent-wash` of the page (posters did not paint in capture; cards are below the fold and lazy). The "why" lines ("Shares bergamot, patchouli, cedarwood") are good.
Direction: `priority` on the first four posters; each plate's ground uses its own accent at 28 percent; "Smells similar" shows 2 large plates + 4 rows; the direction tabs sit as a left list at >= 900px ("Cheaper 4 / Rated higher 6 / Fresher ..."), chips only on phones. Effort: M.

### 20. [S2] Section rhythm — eight sections with the same cadence
Page: fragrance. Area: page composition. Brief: 15 ("every section having identical vertical padding", "overly symmetrical layouts"), 12 (asymmetry).
Seen: every section = 48px top pad, 32px expanded title, lede, meta right-aligned, content, outline button. 7,300px of one beat.
Direction: Listed vs smelled on a full-bleed `--linen` band with the two columns offset (5/7); Performance as a tight pair with the "7–10 hours" figure flush left at `--t-figure-xl`; Ratings as a single 88px row (score · divisiveness · four sub-score sparks); Details as a compact 2-col table with the sources list collapsed under a "Where this comes from" disclosure. Effort: M.

### 21. [S1] "Demo figures" repeated seven times per page
Page: fragrance. Area: section heads. Brief: 32 (label demo data, but not noise).
Direction: one flag in the hero rating meta linking to "How the data works"; section heads keep count + confidence only. Effort: S.

### 22. [S1] Section nav labels do not match section titles
Page: fragrance. Area: section navigation. Brief: 16 (confident, concise).
Seen: nav "Performance" vs title "How long, how loud"; "Similar" vs "If you like this"; "Sources" vs "Details and sources".
Direction: one vocabulary: Journey · Notes · Performance · Wear · Ratings · Reviews · Similar · Details; keep the editorial phrases as ledes. Effort: S.

### 23. [S1] Score typography — condensed Archivo figure next to an italic serif name
Page: fragrance. Area: identity / ratings. Brief: 14 (numeric style, tabular figures).
Seen: "7.5" in `t-figure-xl` at 82 percent stretch, "/10" at 14px; it looks squeezed beside the wide 650 title and the Newsreader name.
Direction: large scores in Newsreader roman, lining tabular figures, 56px, "/10" as 16px small caps; keep condensed Archivo for in-chart figures only. Effort: S.

### 24. [S1] "Explore the scent" — the mist has to fly 900px to reach its targets
Page: fragrance. Area: bottle stage / mist transition. Brief: 5B ("premium and intentional rather than a WebGL demo").
Seen: targets are the opening tags in a 3-column grid 1,000px below; the overlay scrolls, waits 650ms, then flies particles.
Direction: play cap-lift + spray inside the stage, then crossfade the stage itself into a scent view: three vertical columns (opening / heart / drydown) with notes drifting upward; the page scrolls to the journey only when the user scrolls or taps "See the full trail". Effort: L.
