/**
 * Builds supabase/seed.sql (+ supabase/local/seed_local.sql) from the typed modules in src/seed.
 *
 *   npm run seed:generate
 *
 * All rows produced here are demo content and carry is_demo = true or reference a data source
 * whose is_demo = true. Purge with: delete from data_sources where is_demo cascade-style (see docs).
 */
import { scryptSync } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { GLOSSARY } from '../src/seed/glossary';
import { LISTS } from '../src/seed/lists';
import { NOTES as BASE_NOTES } from '../src/seed/notes';
import { CATALOG } from '../src/seed/real';
import { BOTTLE_PHOTOS } from '../src/seed/images';

const brandNameOf = Object.fromEntries(CATALOG.brands.map((b) => [b.slug, b.name]));
import type { BottleSpec } from '../src/lib/bottle/spec';
import type { Dimension, SeedFragrance, SeedNote, SeedReview } from '../src/seed/types';
import { DIMENSIONS } from '../src/seed/types';
import { USERS } from '../src/seed/users';
import { NOTE_VOCABULARY } from '../src/seed/vocabulary';
import { DIMENSION_META, WEAR_CONTEXTS } from '../src/lib/scent/vocab';
import { expandBaseline } from './lib/baseline';
import { rng, seedId } from './lib/ids';

const FRAGRANCES: SeedFragrance[] = CATALOG.fragrances;
const BRANDS = CATALOG.brands;
const PERFUMERS = CATALOG.perfumers;
const NOTES: SeedNote[] = dedupe([...BASE_NOTES, ...CATALOG.notesExtra]);
// Real products get no invented reviews. Reviews come from real people using the app.
const REVIEWS: SeedReview[] = [];

function dedupe<T extends { slug: string }>(xs: T[]): T[] {
  const seen = new Set<string>();
  return xs.filter((x) => (seen.has(x.slug) ? false : (seen.add(x.slug), true)));
}

// ---------------------------------------------------------------------------
// SQL helpers
// ---------------------------------------------------------------------------
const q = (v: unknown): string => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return `'${String(v).replace(/'/g, "''")}'`;
};
const arr = (xs: string[] | undefined) => (xs && xs.length ? `array[${xs.map(q).join(', ')}]::text[]` : `'{}'::text[]`);
const json = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;
const ago = (days: number) => `now() - interval '${Math.max(0, Math.round(days * 24))} hours'`;

const out: string[] = [];
const emit = (s: string) => out.push(s);
function insert(table: string, rows: Record<string, string>[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const chunk = 200;
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    emit(`insert into ${table} (${cols.join(', ')}) values\n  ${part.map((r) => `(${cols.map((c) => r[c]).join(', ')})`).join(',\n  ')};`);
  }
}

// ---------------------------------------------------------------------------
// Validation: fail loudly on broken references before writing SQL.
// ---------------------------------------------------------------------------
const errors: string[] = [];
const brandSlugs = new Set(BRANDS.map((b) => b.slug));
const perfumerSlugs = new Set(PERFUMERS.map((p) => p.slug));
const fragranceSlugs = new Set(FRAGRANCES.map((f) => f.slug));
const userHandles = new Set(USERS.map((u) => u.handle));
const noteSlugs = new Set(NOTES.map((n) => n.slug));
for (const slug of Object.keys(NOTE_VOCABULARY)) if (!noteSlugs.has(slug)) errors.push(`note missing: ${slug}`);
for (const f of FRAGRANCES) if (!f.sources?.some((x) => x.field === 'identity')) errors.push(`${f.slug}: no identity source`);
if (fragranceSlugs.size !== FRAGRANCES.length) errors.push('duplicate fragrance slug');
for (const f of FRAGRANCES) {
  if (!brandSlugs.has(f.brand)) errors.push(`${f.slug}: unknown brand ${f.brand}`);
  for (const p of f.perfumers) if (!perfumerSlugs.has(p)) errors.push(`${f.slug}: unknown perfumer ${p}`);
  if (f.flankerOf && !fragranceSlugs.has(f.flankerOf)) errors.push(`${f.slug}: unknown parent ${f.flankerOf}`);
  const used = [
    ...Object.values(f.notes ?? {}).flat(),
    ...Object.keys(f.community.perceived),
    ...Object.values(f.community.strongestByPhase ?? {}).flat(),
  ];
  for (const s of used) if (!noteSlugs.has(s as string)) errors.push(`${f.slug}: unknown note ${s}`);
}
for (const u of USERS) {
  for (const s of [...(u.owns ?? []), ...(u.had ?? []), ...(u.wants ?? []), ...(u.favorites ?? [])])
    if (!fragranceSlugs.has(s)) errors.push(`user ${u.handle}: unknown fragrance ${s}`);
}
const reviewPairs = new Set<string>();
for (const r of REVIEWS) {
  if (!fragranceSlugs.has(r.fragrance)) errors.push(`review: unknown fragrance ${r.fragrance}`);
  if (!userHandles.has(r.author)) errors.push(`review: unknown author ${r.author}`);
  const k = `${r.author}|${r.fragrance}`;
  if (reviewPairs.has(k) && r.status !== 'deleted') errors.push(`duplicate review ${k}`);
  reviewPairs.add(k);
}
for (const l of LISTS) {
  if (!userHandles.has(l.author)) errors.push(`list ${l.slug}: unknown author`);
  for (const it of l.items) if (!fragranceSlugs.has(it.fragrance)) errors.push(`list ${l.slug}: unknown fragrance ${it.fragrance}`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

// ---------------------------------------------------------------------------
// IDs
// ---------------------------------------------------------------------------
const id = {
  source: (s: string) => seedId('source', s),
  brand: (s: string) => seedId('brand', s),
  perfumer: (s: string) => seedId('perfumer', s),
  note: (s: string) => seedId('note', s),
  fragrance: (s: string) => seedId('fragrance', s),
  user: (h: string) => seedId('user', h),
  collection: (h: string) => seedId('collection', h),
};

emit('-- GENERATED by scripts/generate-seed.ts. Do not edit by hand.');
emit('-- DEMO CONTENT: every house, perfumer, fragrance, person and community figure here is fictional.');
emit('begin;');

// Data sources --------------------------------------------------------------
insert('public.data_sources', [
  { id: q(id.source('editorial')), slug: q('editorial-desk'), name: q('Editorial desk'), source_type: q('editorial'), homepage_url: 'null', license: q('proprietary'), share_alike: 'false', terms_url: 'null', notes: q('Our own research, summaries and character estimates.'), is_demo: 'false' },
  { id: q(id.source('community-demo')), slug: q('community-demo-baseline'), name: q('Demo community baseline'), source_type: q('community'), homepage_url: 'null', license: q('demo'), share_alike: 'false', terms_url: 'null', notes: q('Generated aggregate votes so the prototype has realistic distributions. Not real people.'), is_demo: 'true' },
  { id: q(id.source('renders')), slug: q('original-renders'), name: q('Original bottle renders'), source_type: q('editorial'), homepage_url: 'null', license: q('proprietary'), share_alike: 'false', terms_url: 'null', notes: q('Bottle images rendered in-house from parametric models. No third-party imagery.'), is_demo: 'false' },
  { id: q(id.source('photos')), slug: q('bottle-photos'), name: q('Licensed bottle photographs'), source_type: q('public_dataset'), homepage_url: 'null', license: q('mixed'), share_alike: 'false', terms_url: 'null', notes: q('Product photographs used under their own licences (CC BY, CC BY-SA, CC0, written permission, or our own). Each asset row carries its licence, credit and source.'), is_demo: 'false' },
  { id: q(id.source('wikidata')), slug: q('wikidata'), name: q('Wikidata'), source_type: q('public_dataset'), homepage_url: q('https://www.wikidata.org'), license: q('CC0-1.0'), share_alike: 'false', terms_url: q('https://www.wikidata.org/wiki/Wikidata:Licensing'), notes: q('Brands, perfumers, parent companies, stable Q-IDs. Not used by the demo catalogue.'), is_demo: 'false' },
  { id: q(id.source('obf')), slug: q('open-beauty-facts'), name: q('Open Beauty Facts'), source_type: q('public_dataset'), homepage_url: q('https://world.openbeautyfacts.org'), license: q('ODbL-1.0'), share_alike: 'true', terms_url: q('https://world.openbeautyfacts.org/data'), notes: q('GTINs and INCI lists. Share-alike: stored in isolated tables, never merged into proprietary ones.'), is_demo: 'false' },
  { id: q(id.source('pubchem')), slug: q('pubchem'), name: q('PubChem'), source_type: q('public_dataset'), homepage_url: q('https://pubchem.ncbi.nlm.nih.gov'), license: q('public-domain'), share_alike: 'false', terms_url: q('https://www.ncbi.nlm.nih.gov/home/about/policies/'), notes: q('Aroma molecule identifiers and synonyms for note pages.'), is_demo: 'false' },
]);

// One data source per publisher cited by the research (house sites, retailers, press).
const publisherSlug = (p: string) => p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const publishers = new Map<string, { name: string; type: string }>();
for (const f of FRAGRANCES) for (const src of f.sources ?? []) publishers.set(`${src.type}:${publisherSlug(src.publisher)}`, { name: src.publisher, type: src.type });
insert(
  'public.data_sources',
  [...publishers.entries()].map(([key, p]) => ({
    id: q(id.source(key)),
    slug: q(`src-${key.replace(':', '-')}`.slice(0, 80)),
    name: q(p.name),
    source_type: q(p.type),
    homepage_url: 'null',
    license: q(p.type === 'public_dataset' ? 'see source' : 'facts only'),
    share_alike: 'false',
    terms_url: 'null',
    notes: q(p.type === 'official_brand' ? 'Published by the fragrance house.' : p.type === 'retailer_feed' ? 'Authorised retailer listing.' : null),
    is_demo: 'false',
  })),
);

// Character dimensions -------------------------------------------------------
insert(
  'public.accords',
  DIMENSIONS.map((d, i) => ({
    slug: q(d),
    name: q(DIMENSION_META[d].label),
    description: q(DIMENSION_META[d].description),
    hue: q(DIMENSION_META[d].hue),
    sort: String(i),
  })),
);

insert(
  'public.wear_contexts',
  WEAR_CONTEXTS.map((w, i) => ({ key: q(w.key), grp: q(w.grp), label: q(w.label), sort: String(i) })),
);

// Notes ----------------------------------------------------------------------
insert(
  'public.notes',
  NOTES.map((n) => ({
    id: q(id.note(n.slug)),
    slug: q(n.slug),
    name: q(n.name),
    kind: q(n.kind),
    family: q(n.family),
    aliases: arr(n.aliases),
    smells_like: q(n.smellsLike),
    origin: q(n.origin),
    contributes: q(n.contributes),
    synthetic: q(n.synthetic === true ? 'synthetic' : n.synthetic === false ? 'natural' : 'both'),
    volatility: q(n.volatility),
    character: json(n.character),
    hue: q(n.hue),
  })),
);

// Brands & perfumers ------------------------------------------------------------
insert(
  'public.brands',
  BRANDS.map((b) => ({
    id: q(id.brand(b.slug)),
    slug: q(b.slug),
    name: q(b.name),
    kind: q(b.kind),
    country: q(b.country),
    city: q(b.city),
    founded_year: q(b.founded),
    description: q(b.description),
    known_for: q(b.knownFor),
    website_url: q(b.website),
    parent_company: q(b.parentCompany),
    wikidata_qid: q(b.wikidataQid && /^Q\d+$/.test(b.wikidataQid) ? b.wikidataQid : null),
    data_source_id: q(id.source('editorial')),
    source_url: q(b.sourceUrl),
    is_demo: 'false',
  })),
);
insert(
  'public.perfumers',
  PERFUMERS.map((p) => ({
    id: q(id.perfumer(p.slug)),
    slug: q(p.slug),
    name: q(p.name),
    country: q(p.country),
    born_year: q(p.bornYear),
    bio: q(p.bio),
    signature: q(p.signature),
    wikidata_qid: q(p.wikidataQid && /^Q\d+$/.test(p.wikidataQid) ? p.wikidataQid : null),
    data_source_id: q(id.source('editorial')),
    source_url: q(p.sourceUrl),
    is_demo: 'false',
  })),
);

// Fragrances -----------------------------------------------------------------------
const brandCountry = Object.fromEntries(BRANDS.map((b) => [b.slug, b.country]));
insert(
  'public.fragrances',
  FRAGRANCES.map((f) => ({
    id: q(id.fragrance(f.slug)),
    slug: q(f.slug),
    name: q(f.name),
    brand_id: q(id.brand(f.brand)),
    concentration: q(f.concentration),
    release_year: q(f.releaseYear),
    discontinued_year: q(f.discontinuedYear),
    status: q(f.status),
    marketed_for: q(f.marketedFor),
    style: q(f.style),
    summary: q(f.summary),
    best_for: q(f.bestFor),
    official_description: q(f.officialDescription),
    editorial: q(f.editorial),
    country: q(brandCountry[f.brand]),
    price_band: q(f.priceBand),
    typical_price_usd: q(f.priceUsd),
    typical_size_ml: q(f.sizeMl),
    accent_hex: q(f.accent),
    bottle_spec: json(f.bottle),
    phase_heart_min: q(f.phases?.heartAtMin ?? 25),
    phase_drydown_min: q(f.phases?.drydownAtMin ?? 180),
    is_demo: 'false',
  })),
);
for (const f of FRAGRANCES) {
  if (f.flankerOf) emit(`update public.fragrances set parent_id = ${q(id.fragrance(f.flankerOf))} where id = ${q(id.fragrance(f.slug))};`);
}

// Provenance + notes + perfumers + assets ----------------------------------------------
const sourceRows: Record<string, string>[] = [];
const noteRows: Record<string, string>[] = [];
const perfumerRows: Record<string, string>[] = [];
const assetRows: Record<string, string>[] = [];
const accordRows: Record<string, string>[] = [];
const baselineRows: Record<string, string>[] = [];

for (const f of FRAGRANCES) {
  const fid = id.fragrance(f.slug);
  // Researched provenance: every source entry becomes a field-level claim.
  const claimFor = (field: string) => {
    const src = (f.sources ?? []).filter((x) => x.field === field).sort((a, b) => b.confidence - a.confidence)[0];
    if (!src) return null;
    const rid = seedId('claim', `${f.slug}:${field}`);
    const value =
      field === 'notes' ? f.notes : field === 'perfumers' ? f.perfumers : field === 'identity' ? { name: f.name, brand: f.brand, concentration: f.concentration, year: f.releaseYear } : field === 'price' ? { usd: f.priceUsd, ml: f.sizeMl } : { status: f.status };
    sourceRows.push({
      id: q(rid),
      fragrance_id: q(fid),
      data_source_id: q(id.source(`${src.type}:${publisherSlug(src.publisher)}`)),
      field: q(field),
      value: json(value),
      source_url: q(src.url),
      license: q('facts'),
      retrieved_at: q('2026-10-03T00:00:00Z'),
      verified_at: src.confidence >= 0.75 ? q('2026-10-03T00:00:00Z') : 'null',
      confidence: String(Math.max(0, Math.min(1, src.confidence))),
      status: q('accepted'),
      notes: q(src.note ?? null),
    });
    return rid;
  };
  claimFor('identity');
  claimFor('price');
  claimFor('status');
  const notesClaim = f.notes ? claimFor('notes') : null;
  const perfumersClaim = f.perfumers.length ? claimFor('perfumers') : null;
  if (!f.noImage) {
    sourceRows.push({
      id: q(seedId('claim', `${f.slug}:image`)),
      fragrance_id: q(fid),
      data_source_id: q(id.source('renders')),
      field: q('image'),
      value: json({ kind: 'illustration', generator: 'parametric-bottle' }),
      source_url: 'null',
      license: q('proprietary'),
      retrieved_at: q('2026-10-03T00:00:00Z'),
      verified_at: q('2026-10-03T00:00:00Z'),
      confidence: '1',
      status: q('accepted'),
      notes: q('Original illustration modelled on the real bottle. Not a product photograph.'),
    });
  }

  if (f.notes) {
    const layers: Array<[string, string[] | undefined]> = [
      ['top', f.notes.top],
      ['heart', f.notes.heart],
      ['base', f.notes.base],
      ['unspecified', f.notes.flat],
    ];
    for (const [layer, slugs] of layers) {
      (slugs ?? []).forEach((s, i) =>
        noteRows.push({ fragrance_id: q(fid), note_id: q(id.note(s)), layer: q(layer), position: String(i), source_record_id: q(notesClaim) }),
      );
    }
  }
  f.perfumers.forEach((p) =>
    perfumerRows.push({ fragrance_id: q(fid), perfumer_id: q(id.perfumer(p)), role: q('perfumer'), source_record_id: q(perfumersClaim) }),
  );
  if (!f.noImage) {
    assetRows.push({
      id: q(seedId('asset', `${f.slug}:poster`)),
      fragrance_id: q(fid),
      kind: q('poster'),
      url: q(`/bottles/${f.slug}.webp`),
      width: '900',
      height: '1200',
      mime: q('image/webp'),
      alt: q(`Illustration of the ${f.name} bottle: ${f.bottleDescription ?? describeBottle(f)}`),
      is_primary: 'true',
      license: q('proprietary'),
      credit: q('Original illustration (not a product photo)'),
      data_source_id: q(id.source('renders')),
      status: q('approved'),
      poster_url: 'null',
      model_version: 'null',
      animation_idle: 'null',
      animation_spray: 'null',
      animation_open: 'null',
      animation_notes: 'null',
    });
  }
  const photo = BOTTLE_PHOTOS.find((p) => p.slug === f.slug);
  if (photo) {
    assetRows.push({
      id: q(seedId('asset', `${f.slug}:photo`)),
      fragrance_id: q(fid),
      kind: q('photo'),
      url: q(`/bottles/${f.slug}.webp`),
      width: '900',
      height: '1200',
      mime: q('image/webp'),
      alt: q(`${f.name} by ${brandNameOf[f.brand] ?? f.brand}: ${f.bottleDescription ?? describeBottle(f)}`),
      is_primary: 'true',
      license: q(photo.license),
      credit: q(photo.credit),
      data_source_id: q(id.source('photos')),
      status: q('approved'),
      poster_url: photo.nozzle ? json(photo.nozzle) : 'null',
      model_version: 'null',
      animation_idle: 'null',
      animation_spray: 'null',
      animation_open: 'null',
      animation_notes: 'null',
    });
    sourceRows.push({
      id: q(seedId('claim', `${f.slug}:photo`)),
      fragrance_id: q(fid),
      data_source_id: q(id.source('photos')),
      field: q('image'),
      value: json({ kind: 'photo', license: photo.license, credit: photo.credit }),
      source_url: photo.sourceUrl ? q(photo.sourceUrl) : 'null',
      license: q(photo.license),
      retrieved_at: q(photo.verifiedAt),
      verified_at: q(photo.verifiedAt),
      confidence: '1',
      status: q('accepted'),
      notes: photo.notes ? q(photo.notes) : 'null',
    });
  }
  if (f.has3d) {
    assetRows.push({
      id: q(seedId('asset', `${f.slug}:model`)),
      fragrance_id: q(fid),
      kind: q('model_3d'),
      url: q(`/models/${f.slug}.glb`),
      width: 'null',
      height: 'null',
      mime: q('model/gltf-binary'),
      alt: q(`Interactive 3D illustration of the ${f.name} bottle`),
      is_primary: 'true',
      license: q('proprietary'),
      credit: q('Original model'),
      data_source_id: q(id.source('renders')),
      status: q('approved'),
      poster_url: q(`/bottles/${f.slug}.webp`),
      model_version: q('1'),
      animation_idle: q('Idle'),
      animation_spray: q('Spray'),
      animation_open: q('CapLift'),
      animation_notes: q('Explode'),
    });
  }
  for (const phase of ['opening', 'heart', 'drydown'] as const) {
    for (const [dim, v] of Object.entries(f.character[phase]) as Array<[Dimension, number]>) {
      if (!v) continue;
      accordRows.push({ fragrance_id: q(fid), accord_slug: q(dim), phase: q(phase), strength: (Math.round(v * 1000) / 1000).toFixed(3), source: q('editorial') });
    }
  }
  baselineRows.push({ fragrance_id: q(fid), data_source_id: q(id.source('community-demo')), payload: json(expandBaseline(f)) });
}
insert('public.fragrance_source_records', sourceRows);
insert('public.fragrance_notes', noteRows);
insert('public.fragrance_perfumers', perfumerRows);
insert('public.fragrance_assets', assetRows);
insert('public.fragrance_accords', accordRows);
insert('public.community_baselines', baselineRows);

// Variants: show the reformulation model on the two reformulated fragrances.
const variantRows: Record<string, string>[] = [];
for (const f of FRAGRANCES.filter((x) => x.status === 'reformulated')) {
  const year = f.slug === 'chypre-de-minuit' ? 2012 : 2019;
  variantRows.push(
    { id: q(seedId('variant', `${f.slug}:orig`)), fragrance_id: q(id.fragrance(f.slug)), label: q(`Original formulation (to ${year - 1})`), kind: q('formulation'), from_year: q(f.releaseYear), to_year: q(year - 1), notes: q('Older bottles. Performance votes for these are shown separately.') },
    { id: q(seedId('variant', `${f.slug}:reform`)), fragrance_id: q(id.fragrance(f.slug)), label: q(`${year} reformulation`), kind: q('formulation'), from_year: q(year), to_year: 'null', notes: q('Current production.') },
  );
}
insert('public.fragrance_variants', variantRows);

// People --------------------------------------------------------------------------------
const hues = ['#8E7F6A', '#6F7F78', '#8A6E6A', '#7A7590', '#7E8A62', '#9A7B52', '#5F6F7F'];
insert(
  'auth.users',
  USERS.map((u) => ({ id: q(id.user(u.handle)), email: q(`${u.handle.replace(/\./g, '-')}@example.com`) })),
);
insert(
  'public.profiles',
  USERS.map((u, i) => ({
    id: q(id.user(u.handle)),
    handle: q(u.handle),
    display_name: q(u.displayName),
    bio: q(u.bio),
    location: q(u.location),
    experience_level: q(u.experience),
    is_private: u.isPrivate ? 'true' : 'false',
    role: q(u.handle === 'demo' ? 'admin' : 'member'),
    avatar_hue: q(hues[i % hues.length]),
    is_demo: 'true',
    created_at: ago(120 + ((i * 97) % 1300)),
  })),
);
insert(
  'public.collections',
  USERS.map((u) => ({ id: q(id.collection(u.handle)), user_id: q(id.user(u.handle)), slug: q('shelf'), name: q('Shelf'), kind: q('main'), is_public: 'true' })),
);
const itemRows: Record<string, string>[] = [];
for (const u of USERS) {
  const r = rng(`items:${u.handle}`);
  const seen = new Set<string>();
  const push = (slug: string, status: string) => {
    if (seen.has(slug)) return;
    seen.add(slug);
    const f = FRAGRANCES.find((x) => x.slug === slug)!;
    const isSample = status === 'own' && r() < 0.18;
    itemRows.push({
      collection_id: q(id.collection(u.handle)),
      fragrance_id: q(id.fragrance(slug)),
      status: q(status),
      is_favorite: u.favorites?.includes(slug) ? 'true' : 'false',
      format: q(status === 'own' ? (isSample ? 'decant' : 'bottle') : null),
      size_ml: q(status === 'own' ? (isSample ? 10 : f.sizeMl) : null),
      fill_level: q(status === 'own' ? Math.round((0.25 + r() * 0.75) * 100) / 100 : null),
      price_paid: q(status === 'own' ? Math.round(f.priceUsd * (isSample ? 0.18 : 0.75 + r() * 0.3)) : null),
      currency: q(status === 'own' ? 'USD' : null),
      position: String(seen.size),
      created_at: ago(5 + Math.floor(r() * 700)),
    });
  };
  (u.owns ?? []).forEach((s) => push(s, 'own'));
  (u.had ?? []).forEach((s) => push(s, 'had'));
  (u.wants ?? []).forEach((s) => push(s, r() < 0.4 ? 'want_sample' : 'want'));
  (u.favorites ?? []).forEach((s) => push(s, 'own'));
}
insert('public.collection_items', itemRows);

// Reviews + the reviewers' ratings ----------------------------------------------------------
const reviewRows: Record<string, string>[] = [];
const ratingRows = new Map<string, Record<string, string>>();
for (const rv of REVIEWS) {
  const u = USERS.find((x) => x.handle === rv.author)!;
  const deleted = rv.status === 'deleted';
  reviewRows.push({
    id: q(seedId('review', `${rv.author}:${rv.fragrance}`)),
    fragrance_id: q(id.fragrance(rv.fragrance)),
    user_id: q(id.user(rv.author)),
    kind: q(rv.kind),
    title: q(rv.kind === 'full' ? rv.title ?? 'Untitled' : null),
    body: q(rv.body),
    rating_overall: q(rv.rating),
    focus: arr(rv.focus),
    ownership: q(rv.ownership),
    wear_count: q(rv.wearCount ?? null),
    experience_level: q(u.experience),
    gifted: rv.gifted ? 'true' : 'false',
    gift_note: q(rv.gifted ? 'Received free from the house or a retailer.' : null),
    status: q(deleted ? 'deleted' : 'published'),
    helpful_count: String(rv.helpful),
    helpful_baseline: String(rv.helpful),
    is_demo: 'true',
    created_at: ago(rv.daysAgo),
    deleted_at: deleted ? ago(Math.max(0, rv.daysAgo - 3)) : 'null',
  });
  if (!deleted) {
    ratingRows.set(`${rv.author}|${rv.fragrance}`, {
      user_id: q(id.user(rv.author)),
      fragrance_id: q(id.fragrance(rv.fragrance)),
      overall: String(rv.rating),
      created_at: ago(rv.daysAgo),
    });
  }
}
insert('public.reviews', reviewRows);
insert('public.ratings', [...ratingRows.values()]);

// Lists ---------------------------------------------------------------------------------------
insert(
  'public.lists',
  LISTS.map((l, i) => ({
    id: q(seedId('list', l.slug)),
    user_id: q(id.user(l.author)),
    slug: q(l.slug),
    title: q(l.title),
    description: q(l.description),
    is_public: 'true',
    is_demo: 'true',
    created_at: ago(10 + i * 37),
  })),
);
insert(
  'public.list_items',
  LISTS.flatMap((l) =>
    l.items.map((it, i) => ({ list_id: q(seedId('list', l.slug)), fragrance_id: q(id.fragrance(it.fragrance)), position: String(i), note: q(it.note ?? null) })),
  ),
);

// Wear diary for a few people (the demo account gets a believable 4 months) ----------------------
const logRows: Record<string, string>[] = [];
const logItemRows: Record<string, string>[] = [];
const weathers = ['mild', 'cool', 'warm', 'rain', 'cold', 'hot'];
const occasions = ['office', 'casual', 'date', 'outdoors', 'home', 'nightlife'];
const diarists = new Set([...USERS.filter((x) => (x.owns?.length ?? 0) >= 2).slice(0, 8), ...USERS.filter((x) => x.handle === 'demo')]);
for (const u of diarists) {
  const r = rng(`wear:${u.handle}`);
  const owned = Array.from(new Set([...(u.owns ?? []), ...(u.favorites ?? [])]));
  if (!owned.length) continue;
  const days = u.handle === 'demo' ? 120 : 60;
  for (let d = 1; d <= days; d++) {
    if (r() < (u.handle === 'demo' ? 0.42 : 0.3)) continue;
    const logId = seedId('wear', `${u.handle}:${d}`);
    const fav = u.favorites?.length && r() < 0.35 ? u.favorites[Math.floor(r() * u.favorites.length)] : owned[Math.floor(r() * owned.length)];
    logRows.push({
      id: q(logId),
      user_id: q(id.user(u.handle)),
      worn_on: `(current_date - ${d})`,
      weather: q(weathers[Math.floor(r() * weathers.length)]),
      occasion: q(occasions[Math.floor(r() * occasions.length)]),
      note: q(null),
      created_at: ago(d),
    });
    logItemRows.push({ wear_log_id: q(logId), fragrance_id: q(id.fragrance(fav)), sprays: String(2 + Math.floor(r() * 4)), position: '0' });
    if (r() < 0.08 && owned.length > 1) {
      const layer = owned.find((s) => s !== fav)!;
      logItemRows.push({ wear_log_id: q(logId), fragrance_id: q(id.fragrance(layer)), sprays: '1', position: '1' });
    }
  }
}
insert('public.wear_logs', logRows);
insert('public.wear_log_items', logItemRows);

emit('select public.refresh_fragrance_search(id) from public.fragrances;');
emit('commit;');

mkdirSync('supabase/local', { recursive: true });
writeFileSync('supabase/seed.sql', out.join('\n\n') + '\n');

// Glossary is static editorial content shipped with the app (src/seed/glossary.ts), not a table.
void GLOSSARY;

// Local-only credentials for the demo account (embedded Postgres; Supabase Auth owns these in prod).
const salt = 'demo-salt-not-secret';
const hash = scryptSync('fragrance', salt, 32).toString('hex');
writeFileSync(
  'supabase/local/seed_local.sql',
  [
    '-- LOCAL ONLY: credentials for demo accounts on embedded Postgres. Never applied to Supabase.',
    `insert into auth.local_credentials (user_id, password_hash) values (${q(id.user('demo'))}, ${q(`scrypt$${salt}$${hash}`)}) on conflict do nothing;`,
    '',
  ].join('\n'),
);

console.log(
  `seed.sql: ${FRAGRANCES.length} fragrances, ${NOTES.length} notes, ${BRANDS.length} brands, ${PERFUMERS.length} perfumers, ` +
    `${USERS.length} people, ${REVIEWS.length} reviews, ${LISTS.length} lists, ${logRows.length} wear logs`,
);

function describeBottle(f: SeedFragrance): string {
  const b = f.bottle as BottleSpec;
  const shape = b.body.kind === 'silhouette' ? 'a shaped' : b.body.plan === 'round' || b.body.plan === 'ellipse' ? 'a round' : b.body.plan === 'polygon' ? 'a faceted' : 'a rectangular';
  const glass = b.glass.finish === 'clear' ? 'clear glass' : `${b.glass.finish} glass`;
  const cap = b.cap.kind.startsWith('stopper') ? 'stopper' : 'cap';
  return `${shape} ${glass} bottle with a ${b.cap.material.replace('glass-', '')} ${cap}`;
}
