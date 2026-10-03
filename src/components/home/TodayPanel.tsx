'use client';

import Link from 'next/link';
import { Fragment, useEffect, useState, useTransition } from 'react';
import { logWear } from '@/app/actions/community';
import { AtomizerButton } from '@/components/ui/AtomizerButton';
import { toast } from '@/components/ui/Toaster';
import { useViewer } from '@/components/viewer/ViewerProvider';
import styles from './TodayPanel.module.css';

interface Today {
  signedIn: boolean;
  name?: string;
  today?: Array<{ slug: string; name: string }>;
  picks?: Array<{ slug: string; name: string; poster: string | null; accent?: string | null }>;
  daysLogged30?: number;
}

/**
 * The daily habit, on the front page, as one line on the hero's baseline: "Worn something today?"
 * followed by the likely bottles as atomizer buttons. One press logs it and the line becomes
 * what today looks like. No box: it is a sentence, not a form.
 */
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
  const days = data.daysLogged30 ?? 0;
  if (today.length) {
    return (
      <p className={styles.today}>
        Today you’re wearing <i className={styles.name}>{today.map((t) => t.name).join(' and ')}</i>.{' '}
        {days > 0 && <span className="tnum">{days === 1 ? '1 day' : `${days} days`} logged this month. </span>}
        <Link href="/diary" className={styles.link}>
          Open the diary
        </Link>
      </p>
    );
  }
  const picks = data.picks ?? [];
  return (
    <p className={styles.line}>
      <span className={styles.ask}>Worn something today?</span>
      {picks.map((p) => (
        <Fragment key={p.slug}>
          <AtomizerButton
            variant="bare"
            iconSize={16}
            className={styles.pick}
            disabled={pending}
            style={p.accent ? { ['--scent' as string]: p.accent } : undefined}
            onClick={() =>
              start(async () => {
                const res = await logWear({ slugs: [p.slug] });
                if (!res.ok) return toast(res.error, 'error');
                toast(`${p.name} logged for today.`);
                setData((d) => (d ? { ...d, today: [{ slug: p.slug, name: p.name }], daysLogged30: (d.daysLogged30 ?? 0) + 1 } : d));
              })
            }
          >
            <i className={styles.name}>{p.name}</i>
          </AtomizerButton>
          <span className={styles.dot} aria-hidden>
            ·
          </span>
        </Fragment>
      ))}
      <Link href="/diary?log=1" className={styles.link}>
        Something else
      </Link>
    </p>
  );
}
