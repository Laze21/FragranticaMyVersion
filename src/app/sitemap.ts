import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config';
import { sql } from '@/lib/db';
import { glossaryTerms } from '@/lib/glossary';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [fr, br, pf, nt, ls] = await Promise.all([
    sql<{ slug: string; updated_at: string }>(`select slug, updated_at from public.fragrances where visibility = 'public'`),
    sql<{ slug: string }>('select slug from public.brands'),
    sql<{ slug: string }>('select slug from public.perfumers'),
    sql<{ slug: string }>('select slug from public.notes'),
    sql<{ slug: string; handle: string }>(`select l.slug, p.handle from public.lists l join public.profiles p on p.id = l.user_id where l.is_public and not p.is_private`),
  ]);
  const u = (p: string) => `${SITE_URL}${p}`;
  return [
    { url: u('/'), changeFrequency: 'daily', priority: 1 },
    { url: u('/discover'), changeFrequency: 'daily', priority: 0.8 },
    { url: u('/notes'), priority: 0.7 },
    { url: u('/learn'), priority: 0.6 },
    { url: u('/lists'), priority: 0.5 },
    ...fr.map((f) => ({ url: u(`/fragrance/${f.slug}`), lastModified: new Date(f.updated_at), changeFrequency: 'weekly' as const, priority: 0.9 })),
    ...br.map((b) => ({ url: u(`/house/${b.slug}`), priority: 0.6 })),
    ...pf.map((p) => ({ url: u(`/perfumer/${p.slug}`), priority: 0.5 })),
    ...nt.map((n) => ({ url: u(`/notes/${n.slug}`), priority: 0.6 })),
    ...glossaryTerms().map((t) => ({ url: u(`/learn/${t.slug}`), priority: 0.4 })),
    ...ls.map((l) => ({ url: u(`/lists/${l.handle}/${l.slug}`), priority: 0.4 })),
  ];
}
