import type { Metadata } from 'next';
import Link from 'next/link';
import { getViewer } from '@/lib/auth/session';
import { sql } from '@/lib/db';
import { AdminQueue } from '@/components/admin/AdminQueue';
import styles from '../editorial.module.css';

export const metadata: Metadata = { title: 'Moderation', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const v = await getViewer();
  if (!v || (v.role !== 'admin' && v.role !== 'moderator')) {
    return (
      <div className={`page ${styles.page}`}>
        <h1 className={styles.title}>Moderation</h1>
        <p className={styles.lede}>This area is for moderators.</p>
        {!v && (
          <Link className="btn" href="/sign-in?next=/admin">
            Sign in
          </Link>
        )}
      </div>
    );
  }
  const [subs, reports, counts] = await Promise.all([
    sql<Record<string, unknown>>(
      `select s.id, s.kind, s.payload, s.source_url, s.evidence_url, s.created_at, s.duplicate_of, p.handle, p.created_at as member_since,
              f.slug, f.name, d.name as dup_name, d.slug as dup_slug,
              (select count(*) from public.submissions s2 where s2.user_id = s.user_id and s2.status = 'approved') approved_before
         from public.submissions s join public.profiles p on p.id = s.user_id
         left join public.fragrances f on f.id = s.target_fragrance_id
         left join public.fragrances d on d.id = s.duplicate_of
        where s.status = 'pending' order by s.created_at`,
    ),
    sql<Record<string, unknown>>(
      `select r.id, r.target_type, r.target_id, r.reason, r.details, r.created_at, rv.body, rv.title, f.name as fragrance, f.slug
         from public.reports r left join public.reviews rv on rv.id = r.target_id and r.target_type = 'review'
         left join public.fragrances f on f.id = rv.fragrance_id
        where r.status = 'open' order by r.created_at`,
    ),
    sql<{ pending: string; approved: string; rejected: string }>(
      `select count(*) filter (where status = 'pending') pending, count(*) filter (where status = 'approved') approved, count(*) filter (where status = 'rejected') rejected from public.submissions`,
    ),
  ]);
  return (
    <div className={`page ${styles.page}`} style={{ maxWidth: 1100 }}>
      <header className={styles.head}>
        <h1 className={styles.title}>Moderation</h1>
        <p className={styles.lede}>
          {counts[0].pending} suggestions waiting · {reports.length} open reports · {counts[0].approved} approved so far.
        </p>
      </header>
      <AdminQueue
        submissions={subs.map((s) => ({
          id: String(s.id),
          kind: String(s.kind),
          payload: s.payload as Record<string, unknown>,
          sourceUrl: (s.source_url as string) ?? null,
          evidenceUrl: (s.evidence_url as string) ?? null,
          createdAt: new Date(s.created_at as string).toISOString(),
          handle: String(s.handle),
          approvedBefore: Number(s.approved_before),
          target: s.slug ? { slug: String(s.slug), name: String(s.name) } : null,
          duplicate: s.dup_slug ? { slug: String(s.dup_slug), name: String(s.dup_name) } : null,
        }))}
        reports={reports.map((r) => ({
          id: String(r.id),
          targetType: String(r.target_type),
          reason: String(r.reason),
          details: (r.details as string) ?? null,
          excerpt: (r.title as string) ?? (r.body as string)?.slice(0, 280) ?? null,
          fragrance: r.slug ? { slug: String(r.slug), name: String(r.fragrance) } : null,
        }))}
      />
    </div>
  );
}
