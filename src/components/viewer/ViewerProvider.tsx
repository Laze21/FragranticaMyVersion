'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface ClientViewer {
  id: string;
  handle: string;
  displayName: string;
  role: string;
  avatarHue: string | null;
}
export interface ShelfEntry {
  status: string;
  favorite: boolean;
}
interface ViewerState {
  viewer: ClientViewer | null;
  shelf: Record<string, ShelfEntry>;
  loaded: boolean;
  refresh: () => Promise<void>;
  setShelfEntry: (slug: string, entry: ShelfEntry | null) => void;
}

const Ctx = createContext<ViewerState>({
  viewer: null,
  shelf: {},
  loaded: false,
  refresh: async () => {},
  setShelfEntry: () => {},
});

/**
 * Personal state lives in a client island so catalogue pages can be served from a CDN cache.
 * One request on load gives every component on the page the viewer and their shelf map.
 */
export function ViewerProvider({ children }: { children: React.ReactNode }) {
  const [viewer, setViewer] = useState<ClientViewer | null>(null);
  const [shelf, setShelf] = useState<Record<string, ShelfEntry>>({});
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/me', { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { viewer: ClientViewer | null; shelf: Record<string, ShelfEntry> };
      setViewer(data.viewer);
      setShelf(data.shelf ?? {});
    } catch {
      // Offline or server hiccup: keep whatever we had; the UI degrades to signed-out actions.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setShelfEntry = useCallback((slug: string, entry: ShelfEntry | null) => {
    setShelf((s) => {
      const next = { ...s };
      if (entry) next[slug] = entry;
      else delete next[slug];
      return next;
    });
  }, []);

  const value = useMemo(() => ({ viewer, shelf, loaded, refresh, setShelfEntry }), [viewer, shelf, loaded, refresh, setShelfEntry]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useViewer = () => useContext(Ctx);
