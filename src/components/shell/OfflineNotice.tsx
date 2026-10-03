'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';

/** Poor connection state: say so plainly, keep what's already on screen usable. */
export function OfflineNotice() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    setOffline(!navigator.onLine);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" style={{ background: 'var(--ink)', color: 'var(--porcelain)', fontSize: 'var(--t-small)' }}>
      <p className="page" style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 40 }}>
        <Icon name="wifi_off" size={16} /> You’re offline. Pages you’ve opened still work; votes and wears will need a connection.
      </p>
    </div>
  );
}
