# Bottle images and the stage

Three sources feed one place on the page. In order of preference:

1. **A licensed photograph** of the real bottle (`fragrance_assets.kind = 'photo'`).
2. **Our own illustration**, rendered from a parametric description (`kind = 'poster'`), labelled as an illustration
   wherever it is seen.
3. Nothing: the stage shows a tidy "No bottle image yet" state with a link to contribute one.

`public.fragrance_primary_image` makes the choice; every page reads the view.

## Photographs

`src/seed/images.ts` is the manifest. An entry names the source file in `assets/photos/`, its licence (`CC0`,
`CC BY 4.0`, `CC BY-SA 4.0`, `permission`, `proprietary`…), the credit line, the source URL, the date the licence was
checked, whether the file is already transparent or sits on a plain white studio background, and the nozzle point.

`npm run images` (`scripts/images/ingest.ts`) keys out white backgrounds with a soft matte, trims, and places the bottle
on a shared floor line inside a 900×1200 transparent webp, then writes `public/bottles/<slug>.webp` and a sidecar with
the bottle's box and nozzle. The seed generator turns each entry into a `photo` asset row with its licence and credit,
plus a provenance record, and the fragrance page prints "Photo: Jane Doe · CC BY 4.0 · source".

Acceptable sources: our own shoots; Wikimedia Commons files under CC licences (credit the photographer, link the file
page); press or product images with written permission; retailer partner feeds whose terms cover image use. Never
images lifted from another fragrance database, and never hotlinked.

The research environment for this build could not reach any image host (network policy), which is why no photographs
are in the manifest yet.

## Illustrations

Every one of the 50 bottles has an original illustration built from a `BottleSpec` (`src/lib/bottle/spec.ts`):

- `body`: a `loft` (a plan swept along a vertical profile: round, rectangular, squircle, polygonal or custom plans;
  straight, bowed, tapered, apothecary, orb, amphora or custom profiles; square, sloped, round or domed shoulders;
  ribs, chamfers, pillow edges) or a `silhouette` (a front outline extruded through the depth, for figurative shapes).
- `glass`: clear, tinted, smoked, frosted, lacquered or mirrored, with an optional vertical colour and opacity gradient
  and surface textures (studs, grain, meander, hammered, fine flutes).
- `liquid`, `collar`, `cap` (cylinder, block, dome, sphere, disc, lid, faceted / fan / crystal / ball stoppers, crown,
  ring-pull, flower caps; metals, lacquers, glass, wood, resin, leather; plates, bands, flutes), `sprayer`.
- `decals`: text and shapes mapped onto a patch that hugs the body (print, paper, plate, chrome letterforms, painted
  inside the glass, etching), and `decor` (bows, neck rings, bands, emblems, treads, cords, flowers, pins).

`src/lib/bottle/build.ts` assembles the Three.js scene; `shapes.ts`, `materials.ts`, `caps.ts`, `decals.ts` and
`decor.ts` do the parts. Glass is deliberately "fake" (alpha + fresnel + a studio environment map), so a render
composites over any page colour and the same code can run live in a phone browser.

First-generation specs (named presets) still exist in the seed files; `src/lib/bottle/legacy.ts` converts them to v2
when the catalogue is assembled. The illustrations are honest placeholders: they are labelled "Illustration, not a
product photo", carry a provenance record from the `original-renders` data source, and are replaced automatically the
moment a photograph is listed for the same slug.

### Rendering

`npm run bottles` (`scripts/bottles/render.ts`) bundles the builder with esbuild, opens headless Chromium with
SwiftShader WebGL (`/opt/pw-browsers/chromium` in this environment), and for each fragrance writes:

- `public/bottles/<slug>.webp` – the composite poster, 900×1200, transparent.
- `<slug>.shadow.webp`, `<slug>.body.webp`, `<slug>.cap.webp` – the same frame split into layers.
- `<slug>.layers.json` – where the nozzle is and the cap's box, as fractions of the frame.
- `public/models/<slug>.glb` – an animated model, only for fragrances flagged `has3d` (one today).

`--specs <dir> --out <dir> --png` renders arbitrary spec files, which is how specs are iterated.
`npm run bottles:manifest` collects real heights (from the spec) and 16px blur placeholders into
`public/bottles/manifest.json` for the cards.

## The stage

`src/components/fragrance/BottleStage.tsx` works for a flat cutout, photo or illustration alike:

- The image is the LCP element and is server-rendered; nothing waits for scripts.
- Body and cap lean a couple of degrees toward the pointer; the shadow stays on the floor and slides against the lean.
- A sheen of two vertical highlights slides sideways with the pointer, masked to the bottle's own alpha so it never
  paints the page.
- "Explore the scent": with layers, the cap lifts and tilts off the neck, the body dips as the atomizer is pressed, a
  puff of droplets leaves the nozzle, and the cap clicks back on; without layers (a photograph) the press and the puff
  still play from the nozzle point. `MistOverlay` then carries the mist into the scent journey.
- With a model and a capable device (`autoLoad3d()`: no reduced-motion, no save-data, no 2G/3G, enough memory,
  WebGL available), the live viewer is fetched after the page is idle and crossfaded over the image from the same
  camera framing. Dragging turns the bottle; it never spins on its own.
- Reduced motion: no lean, no sheen, no puff; the explore button scrolls.

## Legal notes for launch

- Illustrations are original work made from observation; several real bottle shapes are registered designs or 3D
  marks. Get a legal read on the illustrated catalogue before launch (listed in the handoff).
- Photographs need their licence and credit stored with the asset (the manifest enforces it) and a takedown path
  (delete the asset row; the illustration returns).
