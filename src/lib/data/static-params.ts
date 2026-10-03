import 'server-only';
import { NOTES } from '@/seed/notes';
import { CATALOG } from '@/seed/real';

/**
 * Slugs for generateStaticParams.
 *
 * In local mode these come straight from the seed modules, never from the embedded database:
 * Next runs generateStaticParams outside the request path, and a second PGlite opening the same
 * data directory is exactly how the WASM Postgres aborts. With a real database (DATABASE_URL)
 * the catalogue can be larger than the seed, so we ask it instead. Pages keep `dynamicParams`,
 * so anything missing here still renders on demand.
 */
const live = () => !!process.env.DATABASE_URL;

export async function fragranceSlugs(): Promise<string[]> {
  if (live()) return (await import('./catalog')).getAllFragranceSlugs();
  return CATALOG.fragrances.map((f) => f.slug);
}

export async function brandSlugs(): Promise<string[]> {
  if (live()) return (await import('./people')).allBrandSlugs();
  return CATALOG.brands.map((b) => b.slug);
}

export async function perfumerSlugs(): Promise<string[]> {
  if (live()) return (await import('./people')).allPerfumerSlugs();
  return CATALOG.perfumers.map((p) => p.slug);
}

export async function noteSlugs(): Promise<string[]> {
  if (live()) return (await import('./notes')).getNotesIndex().then((ns) => ns.map((n) => n.slug));
  return [...NOTES, ...CATALOG.notesExtra].map((n) => n.slug);
}
