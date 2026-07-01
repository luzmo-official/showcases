'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'routedata:dev-stack-labels';

type DevStackLabelsContextValue = {
  enabled: boolean;
  setEnabled: (next: boolean) => void;
};

const DevStackLabelsContext = createContext<DevStackLabelsContextValue | null>(null);

export function DevStackLabelsProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(false);

  // Read the persisted flag once after mount (deferred to keep SSR/hydration in sync).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only read of a persisted value
      setEnabledState(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      /* ignore */
    }
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ enabled, setEnabled }), [enabled, setEnabled]);

  return <DevStackLabelsContext.Provider value={value}>{children}</DevStackLabelsContext.Provider>;
}

export function useDevStackLabels(): DevStackLabelsContextValue {
  const ctx = useContext(DevStackLabelsContext);
  if (!ctx) {
    return { enabled: false, setEnabled: () => {} };
  }
  return ctx;
}
