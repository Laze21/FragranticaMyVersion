'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { decideSubmission, handleReport } from '@/app/actions/moderation';
import { toast } from '@/components/ui/Toaster';
import styles from './AdminQueue.module.css';

interface Sub {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  sourceUrl: string | null;
  evidenceUrl: string | null;
  createdAt: string;
  handle: string;
  approvedBefore: number;
  target: { slug: string; name: string } | null;
  duplicate: { slug: string; name: string } | null;
}
interface Rep {
  id: string;
  targetType: string;
  reason: string;
  details: string | null;
  excerpt: string | null;
  fragrance: { slug: string; name: string } | null;
}

export function AdminQueue({ submissions, reports }: { submissions: Sub[]; reports: Rep[] }) {
  const [tab, setTab] = useState<'subs' | 'reports'>('subs');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const router = useRouter();
  const decide = (id: string, d: 'approved' | 'rejected' | 'needs_info') =>
    start(async () => {
      const r = await decideSubmission(id, d, notes[id] ?? '');
      toast(r.ok ? `Marked ${d.replace('_', ' ')}.` : (r.error ?? 'Failed'), r.ok ? 'default' : 'error');
      router.refresh();
    });
  return (
    <div>
      <div className="cluster" role="tablist" style={{ marginBottom: 'var(--s-5)' }}>
        <button type="button" role="tab" aria-selected={tab === 'subs'} className="chip" data-on={tab === 'subs' || undefined} onClick={() => setTab('subs')}>
          Suggestions {submissions.length}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'reports'} className="chip" data-on={tab === 'reports' || undefined} onClick={() => setTab('reports')}>
          Reports {reports.length}
        </button>
      </div>
      {tab === 'subs' ? (
        submissions.length === 0 ? (
          <p className="t-meta">Queue is empty. Nice.</p>
        ) : (
          <ul role="list" className={styles.list}>
            {submissions.map((s) => (
              <li key={s.id} className={styles.item}>
                <div className={styles.meta}>
                  <b>{s.kind.replace(/_/g, ' ')}</b>
                  {s.target && (
                    <>
                      {' '}
                      on <Link href={`/fragrance/${s.target.slug}`}>{s.target.name}</Link>
                    </>
                  )}
                  <span className="t-meta">
                    {' '}
                    · by @{s.handle} ({s.approvedBefore} accepted before) · {new Date(s.createdAt).toLocaleDateString('en-GB')}
                  </span>
                </div>
                <dl className={styles.payload}>
                  {Object.entries(s.payload)
                    .filter(([, v]) => v !== null && v !== '')
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{String(v)}</dd>
                      </div>
                    ))}
                  <div>
                    <dt>source</dt>
                    <dd>{s.sourceUrl ? <a href={s.sourceUrl} target="_blank" rel="noopener nofollow">{s.sourceUrl}</a> : <i>none given</i>}</dd>
                  </div>
                </dl>
                {s.duplicate && (
                  <p className={styles.warn}>
                    Possible duplicate of <Link href={`/fragrance/${s.duplicate.slug}`}>{s.duplicate.name}</Link>. Contributor says it’s different.
                  </p>
                )}
                <label className="visually-hidden" htmlFor={`n-${s.id}`}>
                  Note to contributor
                </label>
                <input
                  id={`n-${s.id}`}
                  className="input"
                  placeholder="Note to the contributor (shown to them)"
                  value={notes[s.id] ?? ''}
                  onChange={(e) => setNotes((n) => ({ ...n, [s.id]: e.target.value }))}
                />
                <div className="cluster">
                  <button type="button" className="btn btn--small" disabled={pending} onClick={() => decide(s.id, 'approved')}>
                    Approve
                  </button>
                  <button type="button" className="btn btn--quiet btn--small" disabled={pending} onClick={() => decide(s.id, 'needs_info')}>
                    Ask for more
                  </button>
                  <button type="button" className="btn btn--bare btn--small" disabled={pending} onClick={() => decide(s.id, 'rejected')}>
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : reports.length === 0 ? (
        <p className="t-meta">No open reports.</p>
      ) : (
        <ul role="list" className={styles.list}>
          {reports.map((r) => (
            <li key={r.id} className={styles.item}>
              <div className={styles.meta}>
                <b>{r.reason.replace(/_/g, ' ')}</b> · {r.targetType}
                {r.fragrance && (
                  <>
                    {' '}
                    on <Link href={`/fragrance/${r.fragrance.slug}#reviews`}>{r.fragrance.name}</Link>
                  </>
                )}
              </div>
              {r.excerpt && <blockquote className={styles.quote}>{r.excerpt}</blockquote>}
              {r.details && <p className="t-meta">{r.details}</p>}
              <div className="cluster">
                <button type="button" className="btn btn--small" disabled={pending} onClick={() => start(async () => void (await handleReport(r.id, 'hide'), router.refresh()))}>
                  Hide it
                </button>
                <button type="button" className="btn btn--quiet btn--small" disabled={pending} onClick={() => start(async () => void (await handleReport(r.id, 'dismiss'), router.refresh()))}>
                  Dismiss
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
