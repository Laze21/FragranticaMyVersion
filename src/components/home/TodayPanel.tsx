'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { logWear } from '@/app/actions/community';
import { toast } from '@/components/ui/Toaster';
import { useViewer } from '@/components/viewer/ViewerProvider';
import styles from './TodayPanel.module.css';

interface Today {
  signedIn: boolean;
  name?: string;
  today?: Array<{ slug: string; name: string }>;
  picks?: Array<{ slug: string; name: string; poster: string | null }>;
  daysLogged30?: number;
}

/** The daily habit, on the front page: "Worn this today?" One tap logs it. */
export function TodayPanel() {
  const { viewer, loaded } = useViewer();
  const [data, setData] = useState<Today | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => {
    if (!loaded || !viewer) return;
    void fetch('/api/me/today').then(async (r) => setData(await r.json()));
  }, [loaded, viewer]);
  if (!loaded || !viewer || !data?.signedIn) return null;
  const today = data.today ?? [];
  return (
    <div className={styles.panel}>
      {today.length ? (
        <p className={styles.line}>
          Today you’re wearing <b>{today.map((t) => t.name).join(' and ')}</b>. {data.daysLogged30 ? `${data.daysLogged30} days logged this month.` : ''}{' '}
          <Link href="/diary">Diary</Link>
        </p>
      ) : (
        <>
          <p className={styles.line}>Worn something today, {data.name?.split(' ')[0]}?</p>
          <ul role="list" className={styles.picks}>
            {(data.picks ?? []).map((p) => (
              <li key={p.slug}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await logWear({ slugs: [p.slug] });
                      if (!res.ok) return toast(res.error, 'error');
                      toast(`Logged ${p.name} for today.`);
                      setData((d) => (d ? { ...d, today: [{ slug: p.slug, name: p.name }] } : d));
                    })
                  }
                >
                  <span className={styles.thumb}>{p.poster && <Image src={p.poster} alt="" fill sizes="40px" />}</span>
                  {p.name}
                </button>
              </li>
            ))}
            <li>
              <Link href="/diary?log=1" className={styles.other}>
                Something else…
              </Link>
            </li>
          </ul>
        </>
      )}
    </div>
  );
}
