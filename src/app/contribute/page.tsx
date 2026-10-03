import type { Metadata } from 'next';
import Link from 'next/link';
import { getViewer } from '@/lib/auth/session';
import { sql, sqlOne } from '@/lib/db';
import { ContributeForm } from '@/components/contribute/ContributeForm';
import styles from '../editorial.module.css';

export const metadata: Metadata = { title: 'Suggest a fragrance or a fix', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function ContributePage(props: PageProps<'/contribute'>) {
  const sp = await props.searchParams;
  const viewer = await getViewer();
  const slug = typeof sp.fragrance === 'string' ? sp.fragrance : '';
  const target = slug ? await sqlOne<{ slug: string; name: string }>('select slug, name from public.fragrances where slug = $1', [slug]) : null;
  const mine = viewer
    ? await sql<{ kind: string; status: string; created_at: string; reviewer_note: string | null; name: string | null }>(
        `select s.kind, s.status, s.created_at, s.reviewer_note, coalesce(f.name, s.payload->>'name') name
           from public.submissions s left join public.fragrances f on f.id = s.target_fragrance_id
          where s.user_id = $1 order by s.created_at desc limit 10`,
        [viewer.id],
      )
    : [];
  return (
    <div className={`page ${styles.page}`} style={{ maxWidth: 760 }}>
      <header className={styles.head}>
        <h1 className={styles.title}>Suggest a fragrance or a fix</h1>
        <p className={styles.lede}>
          Missing fragrance, wrong year, a perfumer we didn’t credit, official notes we don’t have. Send it with a source and a person will check it,
          usually within days, not months.
        </p>
      </header>
      {sp.sent && (
        <p role="status" style={{ padding: '12px 16px', background: 'color-mix(in oklab, var(--juniper) 18%, var(--paper))', marginBottom: 24 }}>
          Thanks. It’s in the queue. You’ll see its status below.
        </p>
      )}
      {viewer ? (
        <ContributeForm target={target} initialKind={typeof sp.kind === 'string' ? sp.kind : target ? 'correction' : 'new_fragrance'} />
      ) : (
        <p>
          <Link className="btn" href="/sign-in?next=/contribute">
            Sign in to send a suggestion
          </Link>
        </p>
      )}
      {mine.length > 0 && (
        <section style={{ marginTop: 'var(--s-9)' }}>
          <h2 className={styles.h2}>Your suggestions</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">What</th>
                <th scope="col">Status</th>
                <th scope="col">Note from the moderator</th>
              </tr>
            </thead>
            <tbody>
              {mine.map((m, i) => (
                <tr key={i}>
                  <td>
                    {m.kind.replace(/_/g, ' ')}
                    {m.name ? `: ${m.name}` : ''}
                  </td>
                  <td>{m.status.replace(/_/g, ' ')}</td>
                  <td>{m.reviewer_note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
