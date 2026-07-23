import { useCallback, useEffect, useState } from 'react';
import { parseHashRoute, type HashRoute } from './hashRoute';

function readHash(): string {
  return typeof window === 'undefined' ? '' : window.location.hash;
}

/**
 * Thin adapter between `location.hash` and React — see docs/adr/0002-static-host-routing.md.
 * Subscribes to `hashchange` (fired both by the browser on Back/Forward and by `navigate` below),
 * so a single code path handles both.
 */
export function useHashRoute(): {
  route: HashRoute;
  navigate: (hash: string, opts?: { replace?: boolean }) => void;
} {
  const [rawHash, setRawHash] = useState(readHash);

  useEffect(() => {
    const onHashChange = () => setRawHash(readHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((hash: string, opts?: { replace?: boolean }) => {
    const url = new URL(window.location.href);
    url.hash = hash;
    if (opts?.replace) {
      window.history.replaceState(null, '', url);
    } else {
      window.history.pushState(null, '', url);
    }
    // pushState/replaceState do not fire 'hashchange' on their own — dispatch manually so the
    // listener above (and any other hashchange consumer) stays in sync.
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }, []);

  return { route: parseHashRoute(rawHash), navigate };
}
