import { NextResponse, type NextRequest } from 'next/server';
import { sqlOne } from '@/lib/db';
import { listReviews, type ReviewSort } from '@/lib/data/reviews';

export async function GET(req: NextRequest, ctx: RouteContext<'/api/fragrance/[slug]/reviews'>) {
  const { slug } = await ctx.params;
  const f = await sqlOne<{ id: string }>(`select id from public.fragrances where slug = $1`, [slug]);
  if (!f) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const sp = req.nextUrl.searchParams;
  const sort = (['helpful', 'recent', 'highest', 'lowest'].includes(sp.get('sort') ?? '') ? sp.get('sort') : 'helpful') as ReviewSort;
  const kind = sp.get('kind') === 'quick' || sp.get('kind') === 'full' ? (sp.get('kind') as 'quick' | 'full') : null;
  const focus = sp.get('focus')?.replace(/[^a-z_]/g, '') || null;
  const data = await listReviews(f.id, { sort, kind, focus, owners: sp.get('owners') === '1', page: Number(sp.get('page') ?? 0) || 0 });
  return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=20, stale-while-revalidate=120' } });
}
