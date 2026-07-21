import { useEffect } from 'react';
import { useMapStore, type MapState } from '../stores/mapStore';
import {
  decideDashboardHistoryAction,
  parseDashboardUrl,
  serializeDashboardUrl,
} from '../utils/dashboardUrl';
import {
  camerasApproximatelyEqual,
  layerStatesEqual,
  parseDetailMapCamera,
  parseDetailMapLayers,
  serializeDetailMapParams,
} from '../components/detail-map/detailMapUrl';
import labels from '../assets/maps/daklak/daklak-labels.json';

const validCodes = new Set(Object.keys(labels));

/**
 * Builds the full shareable URL: the base view/mode/ward params, plus (only while viewMode is
 * 'map') the detail-map basemap/layer/camera params. Keeping the base canonical when not on the
 * detail map avoids leaking stale lat/lng/zoom into 3D-overview or directory URLs.
 */
function serializeFullUrl(state: MapState): string {
  const base = serializeDashboardUrl(state);
  if (state.viewMode !== 'map') return base;
  const params = new URLSearchParams(base.slice(1));
  serializeDetailMapParams(state.detailMapCamera, state.detailMapLayers).forEach((value, key) =>
    params.set(key, value),
  );
  return `?${params.toString()}`;
}

export function useDashboardUrlSync() {
  useEffect(() => {
    let applyingHistory = false;
    const current = useMapStore.getState();
    const canonical = serializeFullUrl(current);
    if (window.location.search !== canonical) window.history.replaceState(null, '', canonical);

    const unsubscribe = useMapStore.subscribe((state, previous) => {
      if (applyingHistory) return;
      const baseChanged =
        state.viewMode !== previous.viewMode ||
        state.dataMode !== previous.dataMode ||
        state.selectedCode !== previous.selectedCode;
      const detailChanged =
        state.viewMode === 'map' &&
        (!layerStatesEqual(state.detailMapLayers, previous.detailMapLayers) ||
          !camerasApproximatelyEqual(state.detailMapCamera, previous.detailMapCamera));
      if (!baseChanged && !detailChanged) return;

      const url = serializeFullUrl(state);
      // A view/mode/ward change is push-worthy even when it happens together with a detail-map
      // layer/camera change; a layer toggle or camera move alone only ever replaces.
      if (baseChanged && decideDashboardHistoryAction(previous, state) === 'push') {
        window.history.pushState(null, '', url);
      } else {
        window.history.replaceState(null, '', url);
      }
    });
    const restore = () => {
      applyingHistory = true;
      try {
        const search = window.location.search;
        const baseState = parseDashboardUrl(search, validCodes);
        useMapStore.getState().applyUrlState(baseState);
        if (baseState.viewMode === 'map') {
          useMapStore.getState().applyDetailMapUrlState({
            layers: parseDetailMapLayers(search),
            camera: parseDetailMapCamera(search),
          });
        }
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
