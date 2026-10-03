import { NextResponse } from 'next/server';
import { getViewer } from '@/lib/auth/session';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * What the signed-in person wore today, and their likely picks to log in one tap. Picks carry
 * the fragrance's accent so the home panel's atomizer mists in that colour, and the days logged
 * this month so the panel can say "12 days logged this month" without a second request.
 */
export async function GET() {
  const v = await getViewer();
  if (!v) return NextResponse.json({ signedIn: false });
  const [today, picks, streak] = await Promise.all([
    sql<{ slug: string; name: string; accent: string | null }>(
      `select f.slug, f.name, f.accent_hex accent from public.wear_logs w join public.wear_log_items i on i.wear_log_id = w.id join public.fragrances f on f.id = i.fragrance_id
        where w.user_id = $1 and w.worn_on = current_date
        order by w.created_at, i.position`,
      [v.id],
    ),
    sql<{ slug: string; name: string; poster: string | null; accent: string | null }>(
      `select f.slug, f.name, a.url poster, f.accent_hex accent,
              (select count(*) from public.wear_log_items wi join public.wear_logs w on w.id = wi.wear_log_id where w.user_id = c.user_id and wi.fragrance_id = f.id and w.worn_on > current_date - 60) recent
         from public.collection_items i join public.collections c on c.id = i.collection_id and c.kind = 'main'
         join public.fragrances f on f.id = i.fragrance_id
         left join public.fragrance_primary_image a on a.fragrance_id = f.id
        where c.user_id = $1 and i.status = 'own'
        order by i.is_favorite desc, recent desc, f.name limit 4`,
      [v.id],
    ),
    sql<{ n: string }>(`select count(distinct worn_on) n from public.wear_logs where user_id = $1 and worn_on > current_date - 30`, [v.id]),
  ]);
  return NextResponse.json(
    { signedIn: true, name: v.displayName, today, picks, daysLogged30: Number(streak[0]?.n ?? 0) },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
