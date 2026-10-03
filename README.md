# Wake (working name)

A fragrance database, collection tracker and community: what a fragrance smells like in plain words, how long it
lasts, when to wear it, and what people actually smell, kept apart from what the house lists, and sourced.

The name is a token (`APP_NAME` in `src/lib/config.ts`); see `docs/03-naming.md`.

## Run it

```bash
npm install
npm run dev            # http://localhost:3000, embedded Postgres, demo data, no services needed
```

The first start boots an in-process Postgres (PGlite), applies `supabase/migrations`, loads `supabase/seed.sql` and
builds the read model (a few seconds). Data persists in `.data/pglite`; `npm run db:reset` wipes it.

Demo account: `demo@example.com` / `fragrance`, or the "Continue as the demo account" button on `/sign-in`. It is an
admin, so `/admin` is reachable.

## Scripts

| Script | What it does |
|---|---|
| `npm run seed:generate` | turns `src/seed/**` into `supabase/seed.sql` |
| `npm run bottles` | renders every bottle illustration (poster + shadow/body/cap layers) with headless Chromium; `-- slug…` for a subset |
| `npm run bottles:manifest` | collects bottle heights and blur placeholders into `public/bottles/manifest.json` |
| `npm run images` | ingests licensed photographs listed in `src/seed/images.ts` into transparent cutouts |
| `npm run typecheck`, `npm run lint`, `npm run lint:css` | checks |
| `npm test` | unit tests and schema tests on a fresh in-memory database (vitest) |
| `npm run test:e2e` | Playwright: search, filters, compare, auth, shelf, rating, review, wear log, stage fallback, reduced motion, overflow, axe |

## Production

Set `DATABASE_URL` to a Supabase Postgres and run the same migrations (`supabase/migrations`) there; the app switches to
postgres.js with no code change. Supabase Auth replaces the local credential shim. Media stays in `public/` until an
object store is wired (`fragrance_assets.url` is a plain URL).

## Documentation

- `docs/00-brief.md`: the client brief
- `docs/01-research.md` and `docs/research/`: market, data and legal, naming
- `docs/02-product.md`: product definition and information architecture
- `docs/03-naming.md`: the naming sprint
- `docs/04-design-system.md`: tokens, type, colour, motion, the Trail
- `docs/05-data-architecture.md`: schema, provenance, read model, search
- `docs/06-images-and-stage.md`: photographs, illustrations, the stage
- `docs/design-plan.md` and `docs/critiques/`: the redesign plan and the critiques behind it
- `docs/07-handoff.md`: what remains for launch

## Rules this codebase follows

- No scraping of other fragrance databases, no hotlinked images, no copied bottle CAD. Every image carries its licence
  and credit; illustrations are labelled as illustrations.
- Every important fact has a provenance record. Demo community figures are flagged and sized like a young community.
- No invented reviews of real products.
