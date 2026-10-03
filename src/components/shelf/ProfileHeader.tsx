import type { ReactNode } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { DemoFlag } from '@/components/ui/DemoFlag';
import { Icon } from '@/components/Icon';
import { EXPERIENCE_LABEL } from '@/lib/scent/vocab';
import styles from './ProfileHeader.module.css';

export interface ProfileHeadData {
  displayName: string;
  handle: string;
  experience: string | null;
  location: string | null;
  hue: string | null;
  isDemo: boolean;
  bio: string | null;
}

/** The header's fields from a `profiles` row. */
export function profileHead(p: Record<string, unknown>): ProfileHeadData {
  return {
    displayName: String(p.display_name),
    handle: String(p.handle),
    experience: (p.experience_level as string) ?? null,
    location: (p.location as string) ?? null,
    hue: (p.avatar_hue as string) ?? null,
    isDemo: Boolean(p.is_demo),
    bio: (p.bio as string) ?? null,
  };
}

/**
 * The person: a 72px monogram, the name in the display roman, the handle line, and the shelf
 * read as one serif sentence. Follower counts live at the end of the meta line and only when
 * there are any: a profile is about what someone wears, not who watches them.
 */
export function ProfileHeader({
  p,
  identity,
  followers = 0,
  following = 0,
  locked,
  action,
}: {
  p: ProfileHeadData;
  /** "3 bottles, a soft spot for ambroxan, lately mostly Sauvage." */
  identity?: string | null;
  followers?: number;
  following?: number;
  /** A private profile: the lock sits in the meta line and the identity line says so. */
  locked?: boolean;
  action?: ReactNode;
}) {
  const meta = [`@${p.handle}`, p.experience ? EXPERIENCE_LABEL[p.experience] : null, p.location].filter(Boolean);
  const social = followers || following ? `Followed by ${followers} · follows ${following}` : null;
  return (
    <header className={styles.head}>
      <Avatar name={p.displayName} hue={p.hue} size={72} />
      <div className={styles.id}>
        <h1 className={`t-display ${styles.name}`}>{p.displayName}</h1>
        <p className={`${styles.meta} tnum`}>
          {locked && <Icon name="lock" size={16} className={styles.lock} label="Private profile" />}
          {meta.join(' · ')}
          {p.isDemo && (
            <>
              {' · '}
              <DemoFlag label="Demo account" />
            </>
          )}
          {social && <span className={styles.social}> · {social}</span>}
        </p>
        {identity && <p className={styles.identity}>{identity}</p>}
        {p.bio && <p className={styles.bio}>{p.bio}</p>}
        {action && <div className={styles.action}>{action}</div>}
      </div>
    </header>
  );
}
