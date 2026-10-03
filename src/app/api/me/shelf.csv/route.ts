import { getViewer } from '@/lib/auth/session';
import { getShelf } from '@/lib/data/shelf';

export const dynamic = 'force-dynamic';

/** Your data is yours: the whole shelf as CSV. */
export async function GET() {
  const v = await getViewer();
  if (!v) return new Response('Sign in first.', { status: 401 });
  const items = await getShelf(v.id);
  const esc = (x: unknown) => {
    const s = x === null || x === undefined ? '' : String(x);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ['house', 'fragrance', 'status', 'favorite', 'format', 'size_ml', 'fill_percent', 'batch_code', 'price_paid_usd', 'times_worn', 'last_worn', 'added', 'notes'];
  const lines = items.map((i) =>
    [i.card.brandName, i.card.name, i.status, i.favorite, i.format, i.sizeMl, i.fill !== null ? Math.round(i.fill * 100) : '', i.batchCode, i.pricePaid, i.wears, i.lastWorn, i.addedAt.slice(0, 10), i.notes]
      .map(esc)
      .join(','),
  );
  return new Response([head.join(','), ...lines].join('\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="shelf-${v.handle}.csv"` },
  });
}
