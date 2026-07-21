import { useEffect } from 'react';
import { useMapStore } from '../stores/mapStore';
import {
  decideDashboardHistoryAction,
  parseDashboardUrl,
  serializeDashboardUrl,
} from '../utils/dashboardUrl';
import labels from '../assets/maps/daklak/daklak-labels.json';

const validCodes = new Set(Object.keys(labels));

export function useDashboardUrlSync() {
  useEffect(() => {
    let applyingHistory = false;
    const current = useMapStore.getState();
    const canonical = serializeDashboardUrl(current);
    if (window.location.search !== canonical) window.history.replaceState(null, '', canonical);

    const unsubscribe = useMapStore.subscribe((state, previous) => {
      if (applyingHistory) return;
      const changed =
        state.viewMode !== previous.viewMode ||
        state.dataMode !== previous.dataMode ||
        state.selectedCode !== previous.selectedCode;
      if (!changed) return;
      const url = serializeDashboardUrl(state);
      if (decideDashboardHistoryAction(previous, state) === 'push') {
        window.history.pushState(null, '', url);
      } else {
        window.history.replaceState(null, '', url);
      }
    });
    const restore = () => {
      applyingHistory = true;
      try {
        useMapStore
          .getState()
          .applyUrlState(parseDashboardUrl(window.location.search, validCodes));
      } finally {
        applyingHistory = false;
      }
    };
    window.addEventListener('popstate', restore);
    return () => {
      unsubscribe();
      window.removeEventListener('popstate', restore);
    };
  }, []);
}
