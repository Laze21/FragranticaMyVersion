'use client';

import { useState, useTransition } from 'react';
import { toggleFollow } from '@/app/actions/community';
import { toast } from '@/components/ui/Toaster';

export function FollowButton({ handle, initial }: { handle: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={`btn btn--small ${on ? 'btn--quiet' : ''}`}
      aria-pressed={on}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await toggleFollow(handle);
          if (!r.ok) return toast(r.error, 'error');
          setOn((r.data as { following: boolean }).following);
        })
      }
    >
      {on ? 'Following' : 'Follow'}
    </button>
  );
}
