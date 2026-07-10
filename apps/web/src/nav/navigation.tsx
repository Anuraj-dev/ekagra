import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

/** The five tab routes plus the overlay routes reachable from headers/flows. */
export type TabRoute = 'today' | 'goals' | 'insights' | 'crew' | 'tasks';
export type OverlayRoute = 'focus' | 'morning-commit' | 'evening-close' | 'settings' | null;

export const TABS: { route: TabRoute; label: string }[] = [
  { route: 'today', label: 'Today' },
  { route: 'goals', label: 'Goals' },
  { route: 'insights', label: 'Insights' },
  { route: 'crew', label: 'Crew' },
  { route: 'tasks', label: 'Tasks' },
];

type NavContextValue = {
  tab: TabRoute;
  overlay: OverlayRoute;
  setTab: (tab: TabRoute) => void;
  open: (overlay: Exclude<OverlayRoute, null>) => void;
  close: () => void;
};

const NavContext = createContext<NavContextValue | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<TabRoute>('today');
  const [overlay, setOverlay] = useState<OverlayRoute>(null);

  const open = useCallback((next: Exclude<OverlayRoute, null>) => setOverlay(next), []);
  const close = useCallback(() => setOverlay(null), []);
  const changeTab = useCallback((next: TabRoute) => {
    setOverlay(null);
    setTab(next);
  }, []);

  const value = useMemo<NavContextValue>(
    () => ({ tab, overlay, setTab: changeTab, open, close }),
    [tab, overlay, changeTab, open, close],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavContextValue {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used within NavProvider');
  return ctx;
}
