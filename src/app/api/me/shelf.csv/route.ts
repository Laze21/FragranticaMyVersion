import { getViewer } from '@/lib/auth/session';
import { getShelf } from '@/lib/data/shelf';
import { COLLECTION_STATUSES, FORMATS } from '@/lib/scent/vocab';

export const dynamic = 'force-dynamic';

const STATUS_ORDER = COLLECTION_STATUSES.map((s) => s.key as string);

/**
 * Your data is yours: the whole shelf as CSV, in the words the site uses (statuses and formats
 * as labels, not keys), grouped by status and then by house so it reads in a spreadsheet the
 * way it reads on the shelf. Cost per wear comes along since the table already shows it.
 */
export async function GET() {
  const v = await getViewer();
  if (!v) return new Response('Sign in first.', { status: 401 });
  const items = (await getShelf(v.id)).sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.card.brandName.localeCompare(b.card.brandName) || a.card.name.localeCompare(b.card.name),
  );
  const esc = (x: unknown) => {
    const s = x === null || x === undefined ? '' : String(x);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ['house', 'fragrance', 'status', 'favorite', 'format', 'size_ml', 'fill_percent', 'batch_code', 'price_paid_usd', 'times_worn', 'last_worn', 'cost_per_wear_usd', 'added', 'notes'];
  const lines = items.map((i) =>
    [
      i.card.brandName,
      i.card.name,
      COLLECTION_STATUSES.find((s) => s.key === i.status)?.label ?? i.status,
      i.favorite ? 'yes' : 'no',
      FORMATS.find((f) => f.key === i.format)?.label ?? i.format,
      i.sizeMl,
      i.fill !== null ? Math.round(i.fill * 100) : '',
      i.batchCode,
      i.pricePaid,
      i.wears,
      i.lastWorn,
      i.pricePaid !== null && i.wears > 0 ? (i.pricePaid / i.wears).toFixed(2) : '',
      i.addedAt.slice(0, 10),
      i.notes,
    ]
      .map(esc)
      .join(','),
  );
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response([head.join(','), ...lines].join('\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="shelf-${v.handle}-${stamp}.csv"` },
  });
}
