import { NextResponse, type NextRequest } from 'next/server';
import { sqlOne } from '@/lib/db';
import { listReviews, type ReviewSort } from '@/lib/data/reviews';

/* Pages of twenty, never infinite scroll: the list prints "Show 20 more · N left" from `counts`. */
const PAGE_SIZE = 20;

export async function GET(req: NextRequest, ctx: RouteContext<'/api/fragrance/[slug]/reviews'>) {
  const { slug } = await ctx.params;
  const f = await sqlOne<{ id: string }>(`select id from public.fragrances where slug = $1`, [slug]);
  if (!f) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const sp = req.nextUrl.searchParams;
  const sort = (['helpful', 'recent', 'highest', 'lowest'].includes(sp.get('sort') ?? '') ? sp.get('sort') : 'helpful') as ReviewSort;
  const kind = sp.get('kind') === 'quick' || sp.get('kind') === 'full' ? (sp.get('kind') as 'quick' | 'full') : null;
  const focus = sp.get('focus')?.replace(/[^a-z_]/g, '') || null;
  const pageSize = Math.min(PAGE_SIZE, Math.max(1, Number(sp.get('pageSize') ?? PAGE_SIZE) || PAGE_SIZE));
  const data = await listReviews(f.id, { sort, kind, focus, owners: sp.get('owners') === '1', page: Number(sp.get('page') ?? 0) || 0, pageSize });
  // Sub-scores (scent, performance, value, originality) ride along once the reviews table carries
  // them (WP11b's migration) and `mapReview` maps them; the item renders them when present.
  return NextResponse.json({ ...data, pageSize }, { headers: { 'Cache-Control': 'public, max-age=20, stale-while-revalidate=120' } });
}
