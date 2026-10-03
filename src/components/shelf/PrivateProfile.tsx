import Link from 'next/link';
import { FollowButton } from './FollowButton';
import { ProfileHeader, type ProfileHeadData } from './ProfileHeader';
import styles from './PrivateProfile.module.css';

/**
 * A private profile keeps the header (the person is still a person) and says plainly what is
 * kept back. Nothing on the page pretends there is more to see: one sentence, Follow when the
 * viewer is signed in, and the way to the lists that are public anyway.
 */
export function PrivateProfile({ p, signedIn, following }: { p: ProfileHeadData; signedIn: boolean; following: boolean }) {
  return (
    <div className={`page ${styles.page}`}>
      <ProfileHeader
        p={{ ...p, bio: null }}
        locked
        identity="Keeps their shelf, diary and lists private."
        action={
          <>
            {signedIn && <FollowButton handle={p.handle} name={p.displayName} initial={following} />}
            <Link href="/lists" className="btn btn--quiet">
              Browse public lists
            </Link>
          </>
        }
      />
    </div>
  );
}
