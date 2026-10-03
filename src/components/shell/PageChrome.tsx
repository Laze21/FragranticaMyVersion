'use client';

import { useEffect, useSyncExternalStore } from 'react';

/**
 * Which set of actions the shell should show for the page in view. "none" is every ordinary page;
 * "fragrance" is a fragrance page once `#hero-actions` has left the viewport, when the tab bar's
 * labels become Shelf / Rate / Wear / I smell... / Sections and the header can carry the name.
 */
export type ContextualActions = 'none' | 'fragrance';

export interface PageChromeState {
  contextualActions: ContextualActions;
  /** The id of the fragrance section currently in view, for the Sections sheet and the rail list. */
  sectionInView: string | null;
}

export interface PageChrome extends PageChromeState {
  setContextualActions: (next: ContextualActions) => void;
  setSectionInView: (id: string | null) => void;
}

const INITIAL: PageChromeState = { contextualActions: 'none', sectionInView: null };

/*
 * The only channel between a page and the shell. The fragrance page writes (which actions, which
 * section); the tab bar and header read. The shell lives in the root layout above every page, so
 * a React context provided by the page could never reach it: the state is a small module store
 * instead, and neither side imports the other's components. Page packages and the shell package
 * therefore never edit the same file.
 */
let state: PageChromeState = INITIAL;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
const getSnapshot = () => state;
const getServerSnapshot = () => INITIAL;

function patch(next: Partial<PageChromeState>) {
  const merged = { ...state, ...next };
  if (merged.contextualActions === state.contextualActions && merged.sectionInView === state.sectionInView) return;
  state = merged;
  emit();
}

export function setContextualActions(next: ContextualActions) {
  patch({ contextualActions: next });
}
export function setSectionInView(id: string | null) {
  patch({ sectionInView: id });
}

/** Read the page chrome (the shell) or write it (a page). Re-renders on every change. */
export function usePageChrome(): PageChrome {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { ...snap, setContextualActions, setSectionInView };
}

/**
 * For the page that owns the chrome: declare the actions while mounted, and hand the shell back
 * to its ordinary state on unmount, so navigating away from a fragrance never leaves the tab bar
 * reading "Rate" on the home page. The page updates `sectionInView` through `usePageChrome()`.
 */
export function useProvidePageChrome(contextualActions: ContextualActions) {
  useEffect(() => {
    setContextualActions(contextualActions);
    return () => {
      patch(INITIAL);
    };
  }, [contextualActions]);
}
