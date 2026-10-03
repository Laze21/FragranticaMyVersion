'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toggleFollow } from '@/app/actions/community';
import { toast } from '@/components/ui/Toaster';

/**
 * Follow is quiet in both states: ink while it is an invitation, outlined once accepted, with
 * the state in `aria-pressed` and the label, never in colour alone. The page refreshes after so
 * the follower count in the header moves with it.
 */
export function FollowButton({ handle, name, initial }: { handle: string; name?: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      className={`btn btn--small ${on ? 'btn--quiet' : ''}`}
      aria-pressed={on}
      aria-busy={pending || undefined}
      onClick={() =>
        start(async () => {
          const r = await toggleFollow(handle);
          if (!r.ok) return toast(r.error, 'error');
          const now = (r.data as { following: boolean }).following;
          setOn(now);
          toast(now ? `Following ${name ?? `@${handle}`}.` : `No longer following ${name ?? `@${handle}`}.`);
          router.refresh();
        })
      }
    >
      {on ? 'Following' : 'Follow'}
    </button>
  );
}
