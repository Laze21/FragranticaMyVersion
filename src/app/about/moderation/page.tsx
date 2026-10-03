import type { Metadata } from 'next';
import { sql } from '@/lib/db';
import styles from '../../editorial.module.css';

export const metadata: Metadata = { title: 'Moderation log' };
export const dynamic = 'force-dynamic';

export default async function ModerationLog() {
  const [actions, changes] = await Promise.all([
    sql<{ action: string; target_type: string; reason: string | null; created_at: string }>(
      `select action, target_type, reason, created_at from public.moderation_actions where is_public order by created_at desc limit 50`,
    ),
    sql<{ entity_type: string; field: string; reason: string | null; created_at: string; name: string | null }>(
      `select c.entity_type, c.field, c.reason, c.created_at, f.name from public.change_log c left join public.fragrances f on f.id = c.entity_id
        order by c.created_at desc limit 50`,
    ),
  ]);
  return (
    <article className={`page ${styles.page}`}>
      <header className={styles.head}>
        <h1 className={styles.title}>Moderation log</h1>
        <p className={styles.lede}>
          Removed reviews, approved corrections and merged duplicates, in public. People’s names stay private; the actions and reasons don’t.
        </p>
      </header>
      <h2 className={styles.h2}>Catalogue changes</h2>
      {changes.length ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">What</th>
              <th scope="col">Why</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((c, i) => (
              <tr key={i}>
                <td>{new Date(c.created_at).toLocaleDateString('en-GB')}</td>
                <td>
                  {c.name ?? c.entity_type}: {c.field}
                </td>
                <td>{c.reason ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="t-meta">No catalogue changes yet.</p>
      )}
      <h2 className={styles.h2} style={{ marginTop: 'var(--s-8)' }}>
        Moderation actions
      </h2>
      {actions.length ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Action</th>
              <th scope="col">Reason</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a, i) => (
              <tr key={i}>
                <td>{new Date(a.created_at).toLocaleDateString('en-GB')}</td>
                <td>
                  {a.action} {a.target_type}
                </td>
                <td>{a.reason ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="t-meta">Nothing to report yet.</p>
      )}
    </article>
  );
}
