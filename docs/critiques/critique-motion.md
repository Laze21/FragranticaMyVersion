# Motion and microinteractions critique

Lens: motion. Judged against brief §5B (bottle animation), §17 (custom microinteractions), §19 (reduced motion), §20 (poster first), §29 (motion timing as a system) and §15 (AI tells: hover movement, fade-up, chart grow-in).

Code read: `src/styles/tokens.css`, `globals.css`, `components/fragrance/{BottleStage,MistOverlay,bottle3d,ShelfActions,Journey,Hero,Performance,Ratings,WhenToWear,sections}`, `components/scent/{TrailChart,CharacterBars}`, `components/ui/{Sheet,Popover,Toaster,Term}`, `components/cards/*`, `components/shelf/ShelfView`, `components/diary/DiaryView`, `components/search/*`, `components/home/*`, `lib/scent/trail.ts`, `lib/bottle/stage.ts`. Screenshots: frag-sauvage (d/m), frag-no5, home, discover, shelf, diary, compare.

Context that shapes everything below: only one fragrance (`public/models/dior-sauvage.glb`) has a 3D model and `BOTTLE_PHOTOS` is empty, so for ~45 of 46 fragrances the "bottle stage" is the 2D cutout path (lean, sheen, puff). That path is what most people will judge.

## Keep

- The motion philosophy in `tokens.css`: quiet by default, two named easings with meaning (`--ease-evaporate` for things lifting off skin, `--ease-settle` with overshoot for objects placed on a shelf), a small duration ladder (90/160/240/420ms), and reduced-motion zeroing the ladder.
- No idle spin. The 3D viewer renders on demand only (drag, animation, drift), `powerPreference: 'low-power'`, drag inertia with 0.92 decay, drift back to the poster's rest yaw after 3.5s at lerp 0.06, environment rotation following the pointer (±0.25 rad, lerp 0.1). This is the right feel for "subtly rotate, keep it tasteful".
- Poster first, 3D second: the poster is the LCP image, the live model shares the poster's camera framing so the 600ms crossfade has no jump, and `autoLoad3d()` refuses on reduced motion, save-data, 2g/3g, low memory and no WebGL, offering a "View in 3D" button instead.
- The nozzle point stored with the asset (`posterNozzle`) and the Trail geometry that begins at a point ("the nib: the trail begins at a point (the nozzle)") give the explore transition a natural origin and landing. Build on these.
- Solid sticky header (no glass), no scroll-reveal on sections, no hover lift on text blocks, `.btn:active` 1px press, Popover hover delays (260ms open, 200ms close) with viewport flip and close-on-scroll, skeleton shimmer 1.8s linear (off under reduced motion), MobileActionBar sliding in only after the hero actions scroll away, the shelf-page bottles settling onto the ledge with a 30ms stagger and a small bounce.
- Explore the scent degrading to a plain scroll under reduced motion.

## Findings (severity-ranked)

### 1. [sev 3] fragrance / Explore the scent transition (BottleStage → MistOverlay → Journey)
**Finding.** The signature moment is three disconnected acts. Press: the bottle dips 3px and nine 5px dots drift 26–50px up over 720ms. Then the page smooth-scrolls 650ms to the phase list (`[data-mist-root]`, `block:'center'`), skipping the Trail chart. Then 26 particles per opening tag (Sauvage: 5 tags = 130 dots) fly on quadratic arcs from the nozzle's re-projected position into the tag rectangles over 900–1400ms with up to 620ms of delay; total ≈ 2.6–3.2s, then a 700ms hold under a `busy` lock. The arcs peak 80–200px above the lower of origin/target and come **down** into the tags, so the mist falls instead of rising; for the whole flight every opening tag sits at `opacity .08; filter: blur(2px); translateY(10px)`, so the content being revealed disappears for ~2s. On a 390px phone the 42vh stage has scrolled off-screen before the first particle, so the mist emerges from above the viewport. The Trail, which literally starts at a nozzle nib, does nothing.
**Brief.** §5B "mist becomes particles... the interface transitions into the scent breakdown"; §17 "note transitions drift upward like volatile scent"; §17 "do not overdo these".
**Direction.** One continuous ~1.4s gesture built around the Trail: (1) 0ms press, bottle dips 3px, puff leaves the nozzle (keep). (2) 120ms: scroll so the Trail figure (`#journey`, not the phases) sits with its nib ~120px below the stage on desktop, `block:'start'` on mobile; drive the scroll with rAF over 420ms `--ease-evaporate` so timing is known (not `scrollIntoView`). (3) 200–900ms: 40 particles total (not 130), r 1–2px, alpha 0.5, coloured by the opening bands' hues, leave the nozzle on a shallow **upward** arc (control point 40–70px above the straight line, never below) and land on the nib `(g.xForHours(0), cy)` with 0–260ms jitter. (4) 700–1600ms: as particles land the Trail draws on, `clip-path: inset(0 100% 0 0) → inset(0 0 0 0)` over 900ms `--ease-evaporate`; phase shading fades in at 1200ms (240ms), band labels at 1400ms. (5) 1300ms: the Opening column's tags rise 6px → 0 and opacity .35 → 1 over 420ms, 40ms stagger, max 5; Heart and Drydown untouched. Waiting state: opacity .35, translateY(6px), **no blur**. Mobile: same, but the flight is 280ms and stays inside the stage (fades at its bottom edge); the Trail draws when it enters view. Reduced motion: instant scroll to the Trail, draw nothing (current behaviour).
**Effort.** L.

### 2. [sev 3] fragrance / bottle stage entrance and press keyframes (`BottleStage.module.css`)
**Finding.** `.object` has `animation: settle 900ms var(--ease-settle) both` (opacity 0 → 1, translateY 6px, scale .985, overshoot) and `.object[data-pressing]` replaces it with `animation: press 420ms`. When `data-pressing` is removed 420ms later the animation-name changes back to `settle`, so the browser restarts it: after every Explore press the bottle drops to opacity 0 and fades back in with a bounce. The entrance also animates the LCP image from opacity 0 on every navigation, including back/forward.
**Brief.** §20 "Poster image FIRST", "fast first paint"; §15 "fade-up on everything".
**Direction.** Delete the `settle` entrance from `.object`; the poster is SSR'd with `priority` and should be there on first paint. Move `press` to a child wrapper around the Image + sheen + puff so `.object` carries only the lean transform; `press`: 0% none, 30% `translateY(3px) scaleY(.992)`, 100% none, 420ms `--ease-standard`. The only entrance left on the stage is the 3D canvas crossfade (600ms opacity, keep).
**Effort.** S.

### 3. [sev 3] fragrance / 2D stage lean, cap and puff
**Finding.** For every fragrance but Sauvage the stage tilts the whole flat cutout up to ±7° yaw / ±4° pitch under `perspective: 1400px`. The illustration's own perspective and its baked contact shadow rotate with it, so it reads as a tilted card (the 2018 "3D card hover" trope), not a bottle with weight. On press the puff leaves `nozzle` = (0.5, 0.04) of the frame: the top of the **closed** cap. The brief's sequence is rotate → cap lifts → atomizer sprays; in 2D the cap never moves and the bottle sprays through its lid.
**Brief.** §5B "cap lifts, atomizer sprays"; §15 "unnecessary hover movement"; §1 "make fragrances feel like physical objects".
**Direction.** The posters come from the parametric builder (`scripts/bottles/render.ts`; `parts.cap/body/nozzle` exist), so render three layers per fragrance in the same frame: `shadow.webp`, `body.webp`, `cap.webp`, and store the cap's rest box plus the nozzle point in `fragrance_assets`. Stage: body and cap lean together at only ±2.5° yaw / ±1.2° pitch; the shadow stays flat and shifts 1.5px opposite the lean (parallax) using the existing rAF lerp. Explore in 2D: cap lifts 14px and tilts 4° (transform-origin bottom-left) over 360ms `--ease-evaporate`; 60ms later the press dip; puff from the now-exposed nozzle; cap returns at +1400ms over 220ms `--ease-exit`, landing with a 1px body dip (the click). Reduced motion: no lean, cap stays, button scrolls (as now).
**Effort.** L.

### 4. [sev 2] fragrance / bottle sheen ("reflections follow the pointer")
**Finding.** The 2D "reflection" is a 60%×45% radial white blob (alpha .34 → .08) in soft-light, masked to the bottle, sliding ±35% with the pointer in both axes. On the matte-blue Sauvage illustration it reads as a torch beam. The product's own studio rig (`stage.ts`: two tall strip softboxes) produces long vertical highlights that slide sideways; only the 3D path (env rotation) behaves like that.
**Brief.** §17 "bottle reflections respond subtly to pointer movement".
**Direction.** Replace the radial with two vertical strips: `linear-gradient(90deg, transparent, rgba(255,255,255,.22) 50%, transparent)` at 9% width, and a second at 4% width / .12 alpha offset 14% to its right, positioned at `calc(38% + var(--px) * 16%)` with `--px` ∈ [-1, 1] from pointer x; blend `screen`, still masked to the bottle alpha; opacity 0 → 1 over 500ms on hover (keep). Vertical pointer movement does not move the strips; map it to ≤1.5% brightness. Cards and shelf thumbnails get no sheen.
**Effort.** S.

### 5. [sev 2] fragrance / 3D viewer handoff and feel (`bottle3d.ts`)
**Finding.** (a) In 3D mode `explore()` awaits the whole spray clip before returning the nozzle point; the DOM overlay then waits another 650ms for the scroll, so the in-canvas mist (0.9s) has fully dissipated before the page mist appears: two separate puffs. (b) `pivot.rotation.x += (0 - x) * 0.12` runs even while `dragging`, so the pitch fights the finger. (c) When the auto-loaded model is ready, the canvas crossfades in at rest yaw (-0.38 rad) while `.object` may still hold a pointer lean of up to 7°, so the bottle changes angle mid-crossfade. (d) The cap returns at timeScale -1.6 and simply stops: no click. (e) After explore the bottle holds face-on for 4s and then drifts back to rest while the user is reading the Trail: peripheral movement the brief warns against.
**Brief.** §5B "cap removal / spray", §17 "cap clicks into place", §5A "should NOT constantly spin".
**Direction.** (a) Resolve `origin` 120ms into the spray and start the DOM particles while the canvas mist is still at ~0.6 opacity; canvas mist lifetime 0.9 → 1.2s with `vel.y += 0.09·dt` so it visibly rises. (b) Gate the pitch spring on `!dragging`. (c) On `onReady`, set the lean target to 0, wait until |rx|+|ry| < 0.2° (~300ms), then switch mode to `3d`. (d) In the reverse `open` clip's last 80ms, dip the pivot y by 0.004 units for two frames and scale the cap mesh y .97 → 1 over 60ms: the click. (e) After explore, hold face-on; drift back only after the next pointer interaction, or after 12s over 1.6s.
**Effort.** M.

### 6. [sev 2] fragrance (also compare, shelf) / accord and Trail rebalancing
**Finding.** Brief §17: "accord visualization gently rebalances when community filters change". Every data change here snaps: after a vote the sheet closes, `router.refresh()` re-renders, and the Trail's band paths, the perceived-note bars, the longevity histogram and the season tubes jump to new values. The CharacterSheet toast even promises "The Trail will shift as votes come in", and nothing shifts. Compare columns and the shelf's "read back" bars behave the same.
**Brief.** §17; §30 "recognisable visual system... useful rather than decorative".
**Direction.** (1) `.barFill`, `.track span`, `.subTrack span`, `.colBar`, `.tube span`, `.fill`: `transition: width 420ms var(--ease-evaporate), height 420ms var(--ease-evaporate)`; keys are stable so the transition runs across refresh. (2) `TrailChart`: keep the previous geometry's `tops/bots` arrays in a ref; when `input` changes with the same dims set, lerp the arrays (same 72 samples) over 600ms `--ease-evaporate` in rAF and rebuild paths each frame (`smooth()` is cheap); dims that appear/disappear fade band opacity 0 ↔ 1 over 300ms; labels move with their band. Reuse for the compare page when a column is added. (3) After the viewer's own vote, draw a 1px `--bergamot` tick on the bar they moved for 1.2s (bergamot is already reserved as the "you" marker in tokens.css).
**Effort.** M.

### 7. [sev 2] fragrance / mount-time bar animations (grow / rise / fill)
**Finding.** `sections.module.css` (grow), `Performance` (rise), `Ratings` (rise) and `WhenToWear` (fill) each animate scaleX/scaleY from 0 for 420ms at page mount. Those sections sit 1,500–4,500px below the fold, so the animations are over before anyone scrolls to them; when they do fire they're the generic "chart grows in" pattern. Four near-identical keyframes also show there is no shared chart-motion primitive. Meanwhile the Trail, the signature, has no draw-on.
**Brief.** §15 "scroll animations on every element"; §17 "mostly quiet so meaningful animations feel special".
**Direction.** Delete the four keyframes. Give the Trail one draw-on (`clip-path` inset from the right, 900ms `--d-signature` `--ease-evaporate`) that runs once: triggered by the explore handoff (finding 1), or by an IntersectionObserver at 35% visibility if the user scrolls there without pressing; set `data-drawn` so it never repeats. Nothing else on the page animates on scroll.
**Effort.** S.

### 8. [sev 2] global / overlay vocabulary (Sheet, Popover, Toaster, menus, search dropdown)
**Finding.** Entrances differ by component and nothing has an exit. Sheet: `up` 420ms (16px rise + fade) on both desktop and the phone bottom sheet, so the bottom sheet fades instead of sliding; `::backdrop` pops to 42% ink; `dialog.close()` is instant; `html.style.overflow = 'hidden'` removes the desktop scrollbar so the page shifts ~15px on open and close. Popover: drift 4px/240ms, no exit. Toast: rise 6px/240ms, vanishes abruptly at 3.6s. Shelf status menu, account menu, SearchBox dropdown and mobile search panel, NotePicker list, ComparePicker list: appear instantly. The token set has no exit easing or duration, which is why nothing leaves gracefully.
**Brief.** §29 "motion timing, hover behavior, loading behavior"; §18 "bottom sheets for filters".
**Direction.** Add `--ease-exit: cubic-bezier(0.4, 0, 1, 1)` and `--d-exit: 160ms` (0 under reduced motion). One rule per layer type: menus/listboxes/popovers enter `drift` 4px over 160ms `--ease-evaporate`, exit opacity → 0 over `--d-exit`; toast exit translateY(4px) + fade 200ms; sheet desktop enter 16px/240ms, exit 8px/`--d-exit`; sheet mobile enter translateY(100%) → 0 over 360ms `--ease-evaporate`, exit translateY(100%) 200ms `--ease-exit`; backdrop opacity 0 → 1 over 240ms and back. Implement with `@starting-style` + `transition-behavior: allow-discrete` on `display`/`overlay` (Chrome 117+, Safari 17.5+; older browsers fall back to today's instant behaviour). Add `html { scrollbar-gutter: stable }` and stop toggling `overflow` (modal `<dialog>` already inerts the page; `overscroll-behavior: contain` on `.body` keeps scroll inside).
**Effort.** M.

### 9. [sev 2] global (home, discover, similar, shelf grid) / card hover zoom
**Finding.** `.plate:hover .img { transform: scale(1.025) }` over 420ms is the ecommerce/Unsplash image zoom the brief lists under "unnecessary hover movement", and Discover shows it on 20+ cards at once. Under `prefers-reduced-motion` the duration token becomes 0ms but the transform still applies, so the bottle *jumps* 2.5% on hover, which is worse than animating it.
**Brief.** §15 "unnecessary hover movement"; §19 reduced-motion behaviour.
**Direction.** Remove the transform. Hover: `.ground` background `--scent-wash` → `--scent-wash-2` over 160ms `--ease-standard` (the tinted ground deepens, like a spot coming up on the object) and the name underlines (already). No movement on any card variant (plate, row, mini).
**Effort.** S.

### 10. [sev 2] fragrance, diary, home / atomizer press ("Wearing it today", "Log it", TodayPanel picks, tab-bar Wear)
**Finding.** The brief's first §17 example is the atomizer depressing when marking something worn. Here it is an 18px icon dipping 1.5px with four 2px `box-shadow` dots moving 9px: at that size it is invisible in practice (in the hero screenshot the button reads as a plain quiet button). The gesture is reimplemented in `DiaryView` (`press` only, no mist, no reduced-motion override), and is absent from TodayPanel's one-tap picks and from the tab bar's primary "Wear" action. The one interaction meant to be a brand signature exists in one place at one size.
**Brief.** §17 "atomizer depresses when marking something worn today; extremely subtle spray mist".
**Direction.** One `<AtomizerButton>` primitive used by all four. At an 18px icon: press = icon translateY(1.5px) scaleY(.94) over 140ms `--ease-standard`, back over 120ms; mist = 7 dots (r 1.5/1.5/2/1.5/2/1/1.5px) at alpha .55 of `--scent` (fallback `--ink-3`) leaving the nozzle in a 32° cone, each travelling 10–14px with scale 1 → 2.2 and fading, 560ms `--ease-evaporate`, delays 0/30/60/90/120/150/180ms; the button background flashes `--scent-wash` for 300ms. The toast carries the confirmation; nothing else moves. Tab-bar Wear (the 44×30 ink pill): on tap the glyph dips 1px and one dot leaves, then navigate. Reduced motion: no dip, no mist, background flash only.
**Effort.** M.

### 11. [sev 1] fragrance, shelf / shelf placement
**Finding.** Adding to the shelf animates only the icon: the shelf glyph is swapped for a check and drops 9px with `--ease-settle` over 520ms. "Shelf placement" means an object landing on a shelf; swapping to a check throws the shelf away. Elsewhere the `ShelfMark` badge appears on cards instantly, the status menu pops, and the shelf page's ledge settle delay `--i * 30ms` is uncapped, so a 100-bottle shelf staggers for 3s.
**Brief.** §17 "collection addition gives a subtle shelf-placement motion"; §8 "the collection should look visually enjoyable".
**Direction.** Keep the `shelf` icon in both states and add a 4×7px filled bottle silhouette that drops from -9px onto the icon's middle ledge line with `--ease-settle` 520ms and stays: the icon itself records "on the shelf" (label still changes to the status verb). For `want`/`want_sample` draw the silhouette as an outline. `ShelfMark` on cards enters with the same 520ms settle. Status menu uses the finding-8 menu vocabulary. Shelf page: `animation-delay: calc(min(var(--i), 12) * 30ms)`, and no re-run on tab switch (key the list by tab, animate only on first paint).
**Effort.** S.

### 12. [sev 1] fragrance, compare / Trail scrubber
**Finding.** The scrub line and tooltip snap to the pointer with no easing and the tooltip appears and disappears instantly; `.plot:hover .band { opacity: .94 }` is a 6% dim nobody perceives. Keyboard scrubbing jumps between 14 fixed steps with the same snap. This is the most-used interaction on the signature chart.
**Brief.** §5D interactive scent timeline; §30 "beautiful, understandable".
**Direction.** Scrub line follows via `transform: translateX()` with `transition: transform 90ms linear` for the pointer and 160ms `--ease-standard` for keyboard; tooltip enters with the finding-8 `drift` 160ms and on pointer leave fades over 240ms instead of vanishing; replace the 6% dim with a 1px `--ink` top/bottom edge on the band under the pointer at the scrub x (from the sample mix), 90ms. Touch: tooltip above the finger (`top: -56px`) and persistent until a tap outside.
**Effort.** S.

### 13. [sev 1] discover / results pending state
**Finding.** Toggling a filter sets `aria-busy` and fades the whole result grid to 55% opacity (160ms) until the router settles, then the new grid pops in. That is the generic "dim everything while loading" pattern; it makes a fast search feel slow, and chips and the "We read that as" row change with no continuity.
**Brief.** §7 "search should feel instantaneous"; §29 loading behaviour.
**Direction.** Never dim the results. Show a 2px `--ink` hairline under the toolbar that slides in from the left over 600ms `--ease-evaporate`, only if pending exceeds 150ms; when results arrive, crossfade the grid over 160ms (old out at `--d-exit`, new in with no transform). Chip toggles stay instant. The "21 matches" count crossfades 160ms.
**Effort.** S.

### 14. [sev 1] global / motion tokens and reduced-motion coverage
**Finding.** `--d-signature: 900ms` is defined and never used; the signature moments hard-code their timings instead (BottleStage 900/420/720ms; MistOverlay 650/900/1400/3200ms in JS; Journey 520/620ms; canvas 600ms; sheen 500ms; DiaryView 300ms). Reduced motion is handled correctly in BottleStage, MistOverlay, ShelfActions and ShelfView but misses DiaryView's `press`, FragranceCard's hover scale (finding 9) and Journey's `.target` filter/transform transitions. The design system therefore cannot change the product's feel from one file, which is the point of §29.
**Brief.** §29 "motion timing"; §19 "reduced-motion behavior".
**Direction.** A small `motion.ts` that reads `--d-signature`, `--d-standard`, `--ease-*` from `getComputedStyle(document.documentElement)` and exposes `reducedMotion()`; MistOverlay and bottle3d take their durations from it. CSS: every `animation`/`transition` references a `--d-*` token (add `--d-exit`). Add in `tokens.css` a safety net under `prefers-reduced-motion: reduce`: `*, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important }`, keeping the targeted overrides for things that must not even jump (card scale, 3D auto-load).
**Effort.** S.

### 15. [sev 1] compare / adding and removing columns
**Finding.** Adding a fragrance is a `router.push` that re-renders the whole table; the new column appears fully formed, a removed column vanishes, and nothing marks what changed. The Trail row has no entry either.
**Brief.** §5J compare is "a core feature rather than an afterthought".
**Direction.** Key columns by slug; a new column's sticky header cell and row cells enter with opacity 0 → 1 and translateY(6px) → 0 over 240ms `--ease-evaporate` (no stagger); removal fades the column over `--d-exit` optimistically before navigation; the new column's Trail draws on with the finding-7 clip-path over 600ms. Existing columns keep their letters.
**Effort.** S.

### 16. [sev 1] fragrance / loading skeleton continuity
**Finding.** `loading.tsx` paints the hero skeleton on `--linen` while the real hero is `--scent-wash` (a per-fragrance tint), so the page flashes grey → tinted when content lands; the skeleton's text blocks are top-aligned while the real identity column is vertically centred against the 3:4 stage, so the type jumps.
**Brief.** §20 "minimal layout shift"; §33 loading state.
**Direction.** Skeleton background `var(--scent-wash)` with the default `--scent` (a neutral warm grey close to the average tint); mirror Hero's grid (5fr/6fr, `align-items: center`, same paddings) so blocks sit where the type will; keep the 1.8s shimmer.
**Effort.** S.

### 17. [sev 1] fragrance / favourite heart
**Finding.** `.fav[aria-pressed='true'] svg { fill: var(--oxblood) }` changes with no transition (the `.btn` transition list covers background/color/border only), so the heart snaps red, and there is no feedback under the finger on touch beyond the global 1px `:active` translate.
**Brief.** §17 restraint; §19 visible states.
**Direction.** `transition: fill 160ms var(--ease-standard), color 160ms` on the svg; the oxblood border fades in with the fill. Do not add a scale pop; the "like" bounce is a social-app tell. Reduced motion: instant, which is fine.
**Effort.** S.
