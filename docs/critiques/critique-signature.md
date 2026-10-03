# Critique: the signature visual (the Trail) and the scent visual language

Lens: signature. Judged against docs/00-brief.md §5E, §30 ("recognisable enough that someone seeing it elsewhere knows which platform produced it"), §13, §17, §19.

Evidence: src/lib/scent/trail.ts, vocab.ts, read.ts; components/scent/*; cards/FragranceCard; fragrance/Hero, Journey, ListedVsSmelled, Performance; shell/TrailMark; app/fragrance/[slug]/opengraph-image.tsx; screenshots home, frag-sauvage, frag-no5, frag-aventus, compare, house, perfumer, shelf, profile, note, notes, discover (desktop and 390px), cropped at native resolution.

Numbers quoted below (OKLab ΔE between dimension hues, WCAG contrast) were computed from the hex values in vocab.ts and tokens.css.

## Verdict in one paragraph

The Trail is the right idea: one geometry (time × projection × character) that renders as chart, compare strip, card thumbnail, share card and logo mark. That is exactly the Letterboxd move and must survive. What stops it being recognisable today is execution: eight of the thirteen hues sit in the same ochre quadrant, so every thumbnail is a beige feather; the nose is a blunt notch rather than the spindle the logo promises; the chart hides its drydown bands, floats its "typical end" inside the tail and never appears above the fold on the fragrance page; and the note tags read as breadcrumb chevrons instead of blotters. None of this requires a new concept. It requires one geometry, one ruler, one palette rule, and the Trail placed where the eye lands first.

## Keep

- The Trail concept itself: x = time on skin (sqrt-scaled so the opening gets room), thickness = projection, bands = character mix, length = longevity. One pure function (`buildTrail`) rendered at every size.
- Fixed band order (fresh at top → smoky at bottom): volatile rises, base sinks. Recognition depends on this never changing.
- 1px paper separators between bands at chart size: the cut-paper look is tactile and ours.
- Keyboard slider, hidden data table, and `describeTrail` plain-language alt text. Accessibility is already better than competitors.
- Plain-language projection levels (Skin → Room-filling), "typical end", confidence words ("Early read / Taking shape / Settled").
- The "Reads fresh and spicy" highlighter words in the Journey phases.
- The dipped-blotter strip on /notes (12×44, stain at the bottom). It is the better of the two blotter forms in the codebase.
- The dashed-hairline no-data state for thumbnails.
- Per-fragrance accent kept to a wash; the Trail's colours are never the fragrance's brand colour.
- OG share card carries the Trail.

## Findings (severity-ranked)

### 1. [3] global · Trail thumbnails: every fragrance looks the same
Trending list on home (eight rows), "Made for autumn", "Newest in the catalogue", discover grid: every thumb is a beige-brown feather with blue on top. Cause is in vocab.ts: 8 of 13 hues sit between hue 36° and 105° in OKLCH; stack-neighbour separations are Sweet–Warm ΔE 0.043, Woody–Earthy 0.053, Fruity–Floral 0.075, Fresh–Green 0.088. On top of that, thumbs draw 5–7 bands at 22–30px tall (3–5px each) with a 0.6px antialiased porcelain stroke that reads as a fuzzy outline.
Brief: §30 (recognisable), §13 (controlled palette), §19 (no information by colour alone).
Direction: (a) Re-cut the palette with a rule: any two stack-neighbours ΔE(OKLab) ≥ 0.09 and lightness alternates light/dark down the stack. A verified starting cut that stays warm and muted: fresh #7FA8B4, green #6A8E58, clean #D4DBD7, fruity #E69A6E, floral #CD8390, spicy #A33E2A, powdery #C3B2C8, creamy #ECDDB6, sweet #C97740, warm #D6A832, woody #8E5E3A, earthy #5E6E33, smoky #574F49 (neighbour ΔE now 0.09–0.31). (b) Cap bands by height in TrailThumb: ≤ 24px → 3 bands (minShare 0.14), ≤ 40px → 4 bands (minShare 0.10); the chart keeps all. (c) Below 40px drop the band strokes entirely; lightness alternation does the separating. Effort: M.

### 2. [3] fragrance · hero: the signature is below the fold on the most important page
On frag-sauvage-d the Trail first appears at y≈1200 (viewport is 900). The hero shows the summary, three 14px dots (Clean · Fresh · Woody) and six facts. A visitor can leave the page without seeing the one thing that is ours.
Brief: §5A/C, §30.
Direction: Place a TrailThumb (260×40 desktop, full-width×36 mobile) directly under the summary sentence in the "What it smells like" block, with the three character words as its caption line and a 11px "Trail · lasts 7–10h" micro-caption; wrap it in a link to #journey-section. Remove the dots (finding 13). This puts the mark under the "poster" on every surface, like stars under a film. Effort: S.

### 3. [3] global · logo mark and chart are not the same object
TrailMark is a 34×14 black leaf: rounded nose on the left, sharp tail on the right. The charts start with a blunt, slightly wobbly left edge (trail.ts: `samples[0].half = 0`, then `projectionAt` returns 0.82·p0 from the first sample, so the trail goes from a point to 82% thickness in ~10px at chart size and 4px at thumb size) and end in a point. Side by side in the header and on cards they do not rhyme; the mark reads as a leaf or fish.
Brief: §30, §29 (icon/illustration treatment).
Direction: One geometry. In `projectionAt`, replace the 0.82 step with a true nose: p = p0 · smoothstep(0, 0.17h, hours) for the first ten minutes (≈ 11% of width on the sqrt scale at chart size, ≈ 17px on a 160px thumb), so every Trail is a spindle: pointed at spray, widest around 15 min–1h, tapering to the end. Then generate TrailMark from `buildTrail` with a canonical input (longevity 8h, projection 4→2.5, three bands) and fill the bands ink 100% / 62% / 38%. Use that same mark as favicon, as the loading indicator (draw-on, finding 14), and as the 12px glyph before the word "Trail" wherever the chart is captioned. Effort: M.

### 4. [3] fragrance · chart: drydown bands are unlabelled and there is no legend
On frag-no5-d the drydown is four thin ochre stripes (creamy, sweet, warm, woody) with no label anywhere; only bands with labelRoom ≥ 15px get an in-band label. On Sauvage "Warm" and "Woody" are labelled but the thin green/earthy bands that appear mid-trail are not. The right 20–40% of the plot (after the trail ends, up to 14h) is empty on every fragrance.
Brief: §5E (understandable), §19 (no colour-only information).
Direction: End-labels in the empty tail zone. For each band draw a 1px hairline (ink 25%) from the band's last visible sample to a right-aligned label stack at endX + 14px, stacked in band order, 11px Archivo 600, each with its overall share ("Woody 31%"). Keep in-band labels only for the two widest bands. This doubles as the legend, uses the dead space, and makes the 14h canvas purposeful. Effort: M.

### 5. [2] fragrance · chart: "typical end ~8h" sits inside the tail
The dotted median line is drawn at 8h but the solid trail continues to L·1.12+0.3 ≈ 9.3h, so the trail visibly overshoots its own "end". The label floats in the top band.
Brief: §5F (ranges, not promises; don't imply precision).
Direction: End the solid trail at the median longevity. Draw the stretch from the median to the 72nd-percentile (`longevityPercentile(hist, 0.72)`) at 45% opacity with the same bands, and label it on the axis as a tick: "~8h for most · some get 10h". Remove the floating label. Effort: S.

### 6. [2] fragrance · chart: the heart wash is a grey slab
The heart phase is a full-height rect filled with --scent-wash at 0.55 opacity, drawn under the bands; it dulls band colour in the middle third and reads like a selected table column.
Brief: §15 (no decorative boxes), §12 (tactile).
Direction: Remove the fill. Draw 1px dotted vertical rules (--line-strong) at the heart and drydown boundaries, from the axis up to the phase label. Phase labels carry their windows: "Opening · 0–20 min", "Heart · 20 min–2.5h", "Drydown · 2.5h on" (the Journey list already computes these; move them up). Effort: S.

### 7. [2] fragrance · chart: thickness has no scale
"Thicker where it projects" is the lede, but nothing on the chart says what the thickest point means. The Performance section repeats the information as bars, so the chart has to be read twice.
Brief: §5F (make performance understandable).
Direction: A 2px "skin line" through the vertical centre (ink 30%, under the bands) and three faint symmetric guides (dotted, ink 10%) at the Close / Conversational / Arm's-length thicknesses, labelled once at the left margin in 10px --fg-3 (labels above the centre only). Optionally annotate the thickest sample: "Arm's length at 15 min". Effort: S.

### 8. [2] global · thumbnails have no ruler
A 5h trail ends at 104px of 160 and a 10h trail at 148px; on the sqrt scale that difference is small and, with nothing marking where 14h is, length carries no information on cards, in the feature module, or on compare.
Brief: §5E (useful rather than decorative).
Direction: Every TrailThumb draws the full 14h baseline as a 1px --stone-2 hairline through the vertical centre, extending to the SVG's right edge, with 1px ticks at 4h and 8h. The trail sits on this line like a wake on water; the line is the same in every size, which is what makes it a recognisable frame. In compare, render one shared axis under the Trail row instead (finding 16). Effort: S.

### 9. [2] global · note tags read as breadcrumb chevrons
NoteTag is a 32px strip with a 10px clip-path point and a 22px gradient stain. In rows ("Sichuan pepper › Lavender › Pink pepper") the points read as a breadcrumb or step indicator. Meanwhile /notes uses a vertical 12×44 dipped blotter that actually looks like a mouillette. Two metaphors for one object.
Brief: §12 (tactile), §15 (pills only where they mean tag/filter), §29 (component consistency).
Direction: Unify on the dipped strip. NoteTag becomes a square-cornered paper strip (background --paper, 1px --line border, min-height 32/40) with a 6×18 vertical blotter glyph at the left edge: paper top, the note hue in the bottom 40%, 1px inset border, bottom tip clipped 2px. Remove the right-hand point and the gradient. Emphasis = 650 weight, unchanged. The same 6×18 glyph replaces every 10–14px colour dot in the product (finding 13). Effort: M.

### 10. [2] fragrance · "What people smell" bars are a rainbow
ListedVsSmelled overrides the bar fill with `note.hue`, so ten rows get ten colours (ambroxan grey, bergamot yellow, black pepper near-black, lavender mauve), and the blotter tip in the same row repeats the hue. sections.module.css already defaults `.barFill` to --scent-ink.
Brief: §13 (don't let dynamic colours destroy consistency), §19.
Direction: Remove the inline background; all bars in --scent-ink. Rows flagged "not listed" get a hollow bar (1px --scent-ink outline, no fill) so the distinction is carried by shape, and the "not listed" text flag stays. Hue lives only on the blotter glyph. Effort: S.

### 11. [2] fragrance · chart: "Spray" is clipped to "Sprav"
The axis text sits at y = topPad + plotH + 8 + 18 = 220, exactly the SVG height, so descenders are cut. Visible in every desktop and mobile chart crop.
Brief: §34 (no broken states).
Direction: axisH 26 → 32 (or `overflow: visible` on the svg and 6px bottom margin). While there: at widths < 480 show only Spray / 1h / 4h / 8h ticks; add minor 3px ticks at 30m, 3h, 6h, 10h at all widths so the sqrt compression is visible rather than looking arbitrary. Effort: S.

### 12. [2] fragrance · chart: band-label contrast fails on green, borderline on sweet
`data-dark` puts paper text on 'green' (#7E9473): 3.2:1 at 11px, below AA. Light-band labels use ink at 0.78 alpha, which drops 'sweet' (#B97D45) below 4.5:1 in practice.
Brief: §19, §13 (check WCAG contrast).
Direction: Choose label colour from the band's luminance (OKLab L ≥ 0.6 → solid ink, else solid paper), no alpha. With the re-cut palette (finding 1) that means spicy, woody, earthy, smoky take paper labels; everything else ink; green moves to ink (4.65:1). Effort: S.

### 13. [2] global · the 10–14px colour dots look like missing icons
Hero character dots ("Clean" #B7C2C4 is 1.6:1 on porcelain), CharacterBars' 10px dots on house/perfumer/profile/shelf, "Often paired with" dots on the note page (jasmine cream is invisible). They add nothing the label doesn't say, and the pale ones read as broken.
Brief: §15 (icons), §19.
Direction: Replace every dot with the 6×18 dipped-blotter glyph from finding 9 (for notes) or a 10×10 square with 1px inset ink-20% border (for dimensions). In the hero, delete the dots once the Trail is there (finding 2). Effort: S.

### 14. [2] global · the Trail never moves
Brief §17 asks for one quiet signature motion and specifically "accord visualization gently rebalances". The chart renders static; the only motion near it is the CSS `grow` on bars. The mist overlay flies particles to note tags but ignores the Trail.
Brief: §17, §19 (reduced motion).
Direction: One draw-on per visit. When TrailChart first enters the viewport (IntersectionObserver, once), reveal it with `clip-path: inset(0 100% 0 0)` → `inset(0 0 0 0)` over --d-signature (900ms) with --ease-evaporate, bands first, labels fading in after. Make the MistOverlay's last 30% of particles land on the opening of the Trail (its nose), so the spray literally becomes the trail. No motion on thumbnails. prefers-reduced-motion: render final state. Effort: M.

### 15. [2] fragrance · mobile chart is a shrunk desktop
At 390px: desktop copy ("Hover or drag across the trail, or focus here and use arrow keys"), a 180px floating tooltip that would cover half the plot, and the "typical end ~8h" label pinned to the right edge.
Brief: §18 (mobile is not a shrunk desktop; horizontal scent timelines when appropriate).
Direction: On `(pointer: coarse)`: caption "Drag across the trail"; replace the floating tip with a fixed 44px readout row under the axis (time · projection word · top three mix with tabular figures) that updates during the drag and shows the opening values at rest; end label becomes an axis tick (finding 5). Keep the chart height 200, full-bleed to the 16px gutters. Effort: M.

### 16. [2] compare · the Trail row has no shared axis
Three 280×56 thumbs centred in their cells; the note "Same time scale for all" is a sentence doing a ruler's job. The thumbs sit on different vertical centres than their column headers.
Brief: §5J (compare as a core feature, excellent on mobile).
Direction: Draw one axis under the row (ticks Spray · 2h · 4h · 8h · 12h, same xScale), each column with its own median tick ("~8h"), thumbs 300×64 aligned on the skin line, end-labels (finding 4) limited to the top three bands. On mobile stack A/B/C with the axis once at the bottom. Effort: M.

### 17. [2] house · perfumer · profile · shelf: the signature disappears
These pages show CharacterBars only: six ranked rectangles with dots. It is a bar chart any site could have; the thing that is ours is absent from the brand, perfumer and user identities.
Brief: §8 (collection scent profile), §30.
Direction: Build a "signature trail" from the averaged vector: use `overall` for all three phases, longevity = mean of the set, projection = mean opening/later. Render it at 320×56 above the bars with the caption "House signature · averaged over 4" (or "Your shelf, as a trail"). Keep CharacterBars beneath as the text-first detail, limited to five rows, with the share figure at the end of each row (numbers matter: §14). Effort: M.

### 18. [1] global · draw the outline
`buildTrail` computes `g.outline` and nothing renders it. On the discover grid thumbs sit on porcelain, so pale top bands (clean, creamy) dissolve into the page and the silhouette loses its top edge.
Direction: Stroke the outline path at every size: 1px, ink at 22%, `vector-effect: non-scaling-stroke`. Gives the chart its cut-paper edge and keeps the silhouette intact on any ground. Effort: S.

### 19. [1] home · feature module: the glyph is never taught
The 320×48 Trail under "Black Opium" is the first Trail a new visitor sees; it has no caption, so it is an ornament.
Direction: 11px --fg-3 micro-caption beneath: "Trail · lasts 7–10h · arm's length at first", with the TrailMark glyph before the word. Say it once, here, and never explain it on cards. Effort: S.

### 20. [1] global · share card will smear
opengraph-image.tsx draws all bands at 560×70 with 1px strokes; at social-preview sizes (~300px) that becomes a brown smear.
Direction: Reuse the thumbnail rules (max 4 bands, no strokes, outline, 14h baseline with "~8h" tick) and put the TrailMark glyph beside the wordmark so the card carries the mark. Effort: S.

### 21. [1] global · row thumbs are stripes
The 'row' card variant draws 120×22 with 5–7 bands (2–3px each) and 0.6px strokes: an illegible barcode on home Trending and house "On the most shelves".
Direction: 132×26, three bands, no strokes, baseline hairline. Effort: S.

### 22. [1] global · smoky is the ink
'smoky' #4B4743 is nearly --ink; on Aventus the bottom band is a black slab that dominates the trail. 'earthy' #6E6B3F is a dull khaki with no identity.
Direction: In the re-cut palette, smoky = warm graphite #574F49, earthy = moss #5E6E33, woody = bark #8E5E3A, spicy = brick #A33E2A: four distinct dark materials at the base of the stack. Effort: S (part of finding 1).

### 23. [1] fragrance · the chart has no name on it
The lede says "The Trail", but the figure carries no caption of its own; nothing names the object a user is meant to recognise elsewhere.
Direction: A caption row above the plot, left: TrailMark glyph + "Trail" in 11px Archivo 650 88% stretch; right: the existing votes/confidence. Same row on compare and on the signature trails of finding 17. Effort: S.
