import { useSyncExternalStore } from 'react';
import type { ThemeMode } from './theme';

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

/** The active theme as set on <html data-theme> by `applyTheme` — lets non-CSS consumers (the
 * MapLibre canvas) follow the toggle without a second source of truth. */
export function useAppTheme(): ThemeMode {
  return useSyncExternalStore(
    subscribe,
    () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'),
    () => 'light',
  );
}
