# Data architecture

How the catalogue, the community data and their provenance are stored, read and refreshed.
Companion to `docs/research/data-and-legal.md` (why) and `supabase/migrations/*.sql` (what, exactly).

## One schema, two drivers

The same SQL migrations run on both engines, so local demo mode and production behave the same:

| Mode | Driver | When |
|---|---|---|
| Local | PGlite 0.5 (Postgres 18 compiled to WASM, in-process, extensions `pg_trgm` + `unaccent`) | no `DATABASE_URL`: `next dev`, tests, the preview build |
| Production | postgres.js against Supabase Postgres | `DATABASE_URL` set |

`src/lib/db/index.ts` exposes `sql`, `sqlOne`, `getDb().tx`. In local mode it applies `supabase/local/auth_shim.sql`
(an `auth.users` table, `auth.uid()`, the `anon`/`authenticated`/`service_role` roles), every migration, the generated
seed and `supabase/local/seed_local.sql` (demo credentials), then rebuilds the read model. The data directory is
`.data/pglite` in development and in-memory everywhere else.

Two local-mode rules learned the hard way:

- `generateStaticParams` must not touch the embedded database. Next runs it outside the request path, and a second
  PGlite opening the same data directory aborts the WASM engine for every later query. `src/lib/data/static-params.ts`
  reads the seed modules instead (and the database only when `DATABASE_URL` is set).
- The wrapper reopens the database and retries once if the engine ever aborts, and logs the statement that hit it.

## Tables

Migrations are numbered by concern:

1. `000100_foundation`: extensions, `immutable_unaccent()`, `touch_updated_at()`, `profiles`, `data_sources`.
2. `000200_catalog`: `brands`, `perfumers`, `notes` (kind: material / accord / descriptor; family; aliases; plain-language
   `smells_like`, `origin`, `contributes`), `accords` (the 13 character dimensions), `fragrances`, `fragrance_variants`
   (formulations, flankers), `fragrance_source_records` (field-level provenance), `fragrance_perfumers`, `fragrance_notes`
   (layer: top / heart / base / unspecified, position, `source_record_id`), `fragrance_accords` (editorial character per
   phase), `fragrance_assets`, `retailer_offers`.
3. `000300_community`: `ratings` (overall, scent, performance, value, originality), `perceived_note_votes` (per phase),
   `accord_votes`, `performance_votes` (longevity bucket, projection opening / later, sprays, bottle year),
   `wear_contexts` + `wearability_votes` (fits / does not fit per context), `similarity_votes`, `reviews`
   (quick / full, focus tags, ownership, wear count, gifted disclosure, status incl. `deleted`), `review_votes`,
   `review_comments`, `collections` + `collection_items` (status, favourite, format, size, fill, batch, price),
   `wear_logs` + `wear_log_items` (layering), `lists` + `list_items`, `follows`.
4. `000400_moderation`: `submissions` (kind, payload, source URL, evidence, attestation, duplicate hint), `change_log`,
   `reports`, `moderation_actions`.
5. `000500_stats_search`: `community_baselines`, `fragrance_stats` (read model), `fragrance_search` (tsvector + trigram
   document) and `refresh_fragrance_search(fid)`.
6. `000600_rls`: row-level security for the Supabase client roles.
7. `000700_primary_image`: `fragrance_assets.layers` and the `fragrance_primary_image` view.

### `fragrances` worth knowing

- `marketed_for` is the house's positioning and nothing else; wearability is a separate community signal
  (`wearability_votes`). There is no `gender` column on purpose.
- `bottle_spec` (jsonb) is the parametric description the illustration was rendered from (`src/lib/bottle/spec.ts`).
- `accent_hex` is the controlled per-fragrance accent the interface derives its washes from.
- `phase_heart_min` / `phase_drydown_min` are the editorial phase boundaries the Trail and the journey share.
- `summary`, `best_for`, `editorial`, `official_description` are separate columns so marketing copy is never mixed
  with our own words.

## Provenance

Every important claim is a row in `fragrance_source_records`: `fragrance_id`, `data_source_id`, `field`
(`identity`, `notes`, `perfumers`, `price`, `status`, `image`, …), `value` (jsonb snapshot), `source_url`, `license`,
`retrieved_at`, `verified_at`, `verified_by`, `confidence` (0 to 1), `submitted_by`, `status`
(`accepted` / `pending` / `rejected` / `superseded`), `supersedes_id`, `display_scope` (`public` / `internal` /
`offer_only`), `notes` (for readers, never a build log).

`data_sources` carries `source_type` (`official_brand`, `licensed_database`, `editorial`, `community`,
`public_dataset`, `retailer_feed`), its licence, `share_alike` and `is_demo`. Resolution order when claims disagree:
official_brand → editorial → licensed_database → community consensus → public_dataset. Deleting everything from one
source (a takedown) is one `delete … where data_source_id = …`.

The rows that join notes and perfumers to a fragrance carry the `source_record_id` of the claim they came from, so the
page can say "Listed by Dior · checked Oct 2026" next to the note list and "Not yet checked" when it has not been.

Today every catalogue claim is `editorial` with no `source_url` and a confidence of 0.4 to 0.7: the research
environment could not reach house websites. `/about/data` prints the live count. The launch checklist in the handoff
has verification against each house page as the first item.

## Official vs perceived

Official notes live in `fragrance_notes` (with provenance). What people smell lives in `perceived_note_votes`, one
row per person, note and phase, and never touches the official list. The read model aggregates them into
`fragrance_stats.perceived` (share of voters who noticed the note, by phase) so the page can show "Listed by the house"
beside "What people smell" with its own sample size and confidence word.

## Demo community data

The 50 fragrances are real; the community around them is not yet. `scripts/lib/baseline.ts` expands each seed
fragrance's compact `community` block (tier, rating, divisiveness, sub-ratings, longevity, projection, context fits)
into plausible distributions, deterministically, at early-community sizes (hundreds of votes at most). They are stored
as one `community_baselines` row per fragrance from a `data_sources` row flagged `is_demo`, never in the vote tables.

`refreshFragranceStats` (`src/lib/data/stats.ts`) adds real votes on top of the baseline and sets
`fragrance_stats.includes_baseline`, which the interface turns into the "Demo figures" flag. Once real votes outnumber
the baseline for a fragrance the baseline is dropped from the blend (`PRIOR_VOTES`), and deleting the demo data source
removes every baseline at once. There are no invented reviews of real products anywhere in the seed.

## Read model and search

`fragrance_stats` is rebuilt in TypeScript rather than by triggers so the blend logic lives in one testable place:
rating average / count / spread / histogram, longevity histogram and median, projection histograms (opening and later),
wear-context fit shares, perceived note shares, the blended 13-dimension `character` per phase (editorial accords plus
`accord_votes`), own count, review count, trending (wears in the last 30 days), similarity inputs.

`fragrance_search` holds a `simple`-dictionary tsvector (prefix matching for type-ahead) and a trigram document
(typo tolerance); `src/lib/data/search.ts` combines `ts_rank` with `word_similarity` and `src/lib/search/interpret.ts`
turns sentences ("vanilla without tobacco, lasts 8 hours, under $100") into the same `Filters` the rail exposes.

## Images

`fragrance_assets` rows have a `kind` (`poster` = our illustration, `photo` = a licensed photograph, `model_3d`,
`press`, `user_photo`), `license`, `credit`, provenance links and `layers` (nozzle point; for illustrations the
separate shadow / body / cap renders). `fragrance_primary_image` picks the one image a fragrance is shown with: a
licensed photograph wins over the illustration. See `docs/06-images-and-stage.md`.

## Auth

Local mode uses a signed cookie session (`src/lib/auth/session.ts`, scrypt credentials in `auth.local_credentials`);
production uses Supabase Auth with the same `profiles` table. Moderation requires `profiles.role` of `moderator` or
`admin`; the demo account is an admin so the queue can be explored.
