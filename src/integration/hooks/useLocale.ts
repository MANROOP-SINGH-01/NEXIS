import { useState, useCallback, useSyncExternalStore } from 'react';
import { t, setLocale, getLocale, type Locale, type StringKey } from '../../i18n';

// ponytail: useSyncExternalStore to get reactivity without a store.
// One global listener list, re-renders subscribers on locale change.

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => { listeners.add(cb); return () => listeners.delete(cb); };
const getSnapshot = () => getLocale();

export function useLocale() {
  const locale = useSyncExternalStore(subscribe, getSnapshot);

  const switchLocale = useCallback((next: Locale) => {
    setLocale(next);
    listeners.forEach(cb => cb());
  }, []);

  return { locale, setLocale: switchLocale, t };
}
