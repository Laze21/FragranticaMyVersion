# Handoff: what remains for launch

The prototype is a working application on a real schema with a real catalogue. This is the list of things a
product team has to do before it is a public site, in rough order.

## 1. Facts

- **Verify every catalogue claim against the house's own page.** All 50 fragrances were written from editorial
  research in an environment that could not open house websites; every claim in `fragrance_source_records` is
  `editorial`, has no `source_url`, and carries a confidence of 0.4 to 0.7. `/about/data` prints the live count.
  Launch year, perfumer, concentration and official notes per fragrance; typical price from a retailer feed.
  `paradigme` (Prada, 2025) was the least certain entry and should be checked first or dropped.
- **Decide the sourcing contracts** in `docs/research/data-and-legal.md`: Wikidata for brands and perfumers (CC0),
  Open Beauty Facts in an isolated table (ODbL), a licensed editorial database if the catalogue is to grow faster than
  an editorial team can write it (Fragrances of the World is the credible candidate), affiliate feeds for prices.
- **Write the contributor licence and the takedown process** (notice-and-takedown by data source is already one
  statement; the public policy page and the inbox are not written).

## 2. Images

- **Open network access** for the build environment (Wikimedia Commons, house press rooms) so licensed photographs
  can be fetched, or supply files by hand: drop them in `assets/photos/`, list them in `src/seed/images.ts` with
  licence, credit, source and date, run `npm run images`, `npm run bottles:manifest`, `npm run seed:generate`.
  A photograph replaces the illustration automatically.
- **Legal read on the illustrated bottles.** Several bottle shapes are registered designs or three-dimensional marks
  (Chanel N°5, Black Opium among them). The illustrations are original work made from observation and are labelled as
  illustrations; a trademark lawyer should look at the catalogue before launch.
- **Press images need written permission** for catalogue display; they are not "editorial use" when the page sells
  through affiliate links.

## 3. Community data

- **Delete the demo baseline before launch**: one `delete from public.data_sources where slug = 'community-demo'`
  removes every generated distribution; the pages fall back to "Not enough votes" states that are already designed.
- Decide the moderation staffing for the queue in `/admin`; merge-duplicates and asset moderation beyond
  approve/reject are not built (the schema supports them: `submissions.duplicate_of`, `fragrance_assets.status`).

## 4. Platform

- **Supabase**: create the project, run `supabase/migrations`, point `DATABASE_URL` at it, switch sign-in to Supabase
  Auth (the local credential shim in `supabase/local/` is development only), move `public/bottles` and uploads to
  Storage or an object store (`fragrance_assets.url` is a plain URL).
- **Deploy** on Vercel or equivalent; set `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_SITE_URL`. The pages are static or ISR
  with personal state in client islands, so a CDN in front is enough.
- **Fonts**: the self-hosted Newsreader and Archivo subsets were made without network access; re-export Newsreader
  with its optical-size axis and re-subset Archivo to include the arrow glyphs (U+2190 to U+2193, U+2197), then
  enable `font-optical-sizing: auto` in `src/app/layout.tsx`.
- **Not-found status**: with a streaming loading boundary an unknown fragrance renders the not-found page with a
  `noindex` meta but a 200 status. If a true 404 is wanted, move the lookup ahead of the shell (edge proxy against a
  slug list) or drop the loading boundary on that route.
- Decide whether an external search service is ever needed; Postgres full-text search with trigrams covers the
  current catalogue size comfortably.

## 5. Name

`APP_NAME` is a token. Run trademark clearance and handle checks on the finalists in `docs/03-naming.md` before the
first public URL.

## 6. Known gaps in the prototype

- Lists can be read and shared; creating lists from the interface is new in this build and should be exercised.
- The 3D view exists for one bottle (`dior-sauvage`) as a demonstration of the progressive-enhancement path; every
  other bottle uses the layered 2D stage. Nothing on the page waits for 3D.
- Review sub-scores are stored when provided; the composer's "break it down" disclosure feeds them.
- The embedded database is single-process: fine for development and previews, not for a multi-instance deployment.
