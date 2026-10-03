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
/**
 * The turning bottle is a progressive extra, gated by what the device and the person asked for.
 * `auto` lets `autoLoad3d()` decide; `on` is the person pressing "Turn on" after that gate said
 * no (reduced motion, data saver, a slow link), and it holds for the session so they are not
 * asked again on the next fragrance; `off` is "Turn off" from the stage.
 */
export type ThreeDPreference = 'auto' | 'on' | 'off';
const THREE_D_KEY = 'wake:3d';

interface ViewerState {
  viewer: ClientViewer | null;
  shelf: Record<string, ShelfEntry>;
  loaded: boolean;
  refresh: () => Promise<void>;
  setShelfEntry: (slug: string, entry: ShelfEntry | null) => void;
  threeD: ThreeDPreference;
  setThreeD: (next: ThreeDPreference) => void;
}

const Ctx = createContext<ViewerState>({
  viewer: null,
  shelf: {},
  loaded: false,
  refresh: async () => {},
  setShelfEntry: () => {},
  threeD: 'auto',
  setThreeD: () => {},
});

function readThreeD(): ThreeDPreference {
  try {
    const v = window.sessionStorage.getItem(THREE_D_KEY);
    return v === 'on' || v === 'off' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

/**
 * Personal state lives in a client island so catalogue pages can be served from a CDN cache.
 * One request on load gives every component on the page the viewer and their shelf map.
 */
export function ViewerProvider({ children }: { children: React.ReactNode }) {
  const [viewer, setViewer] = useState<ClientViewer | null>(null);
  const [shelf, setShelf] = useState<Record<string, ShelfEntry>>({});
  const [loaded, setLoaded] = useState(false);
  const [threeD, setThreeDState] = useState<ThreeDPreference>('auto');

  useEffect(() => {
    setThreeDState(readThreeD());
  }, []);
  const setThreeD = useCallback((next: ThreeDPreference) => {
    setThreeDState(next);
    try {
      if (next === 'auto') window.sessionStorage.removeItem(THREE_D_KEY);
      else window.sessionStorage.setItem(THREE_D_KEY, next);
    } catch {
      // Private mode or blocked storage: the choice still holds for this page.
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/me', { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as {
        viewer: ClientViewer | null;
        shelf: Record<string, ShelfEntry>;
      };
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

  const value = useMemo(
    () => ({
      viewer,
      shelf,
      loaded,
      refresh,
      setShelfEntry,
      threeD,
      setThreeD,
    }),
    [viewer, shelf, loaded, refresh, setShelfEntry, threeD, setThreeD],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useViewer = () => useContext(Ctx);
