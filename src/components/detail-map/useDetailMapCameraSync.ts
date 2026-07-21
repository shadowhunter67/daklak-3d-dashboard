import { useEffect, useMemo, useRef } from 'react';
import { useMapStore } from '../../stores/mapStore';
import { camerasApproximatelyEqual } from './detailMapUrl';
import type { DetailMapCameraState } from './detailMapTypes';

const DEBOUNCE_MS = 400;

/**
 * Returns a stable callback the caller registers with the map provider's onCameraChange. Debounces
 * pan/zoom/rotate/tilt events (300-500ms per the task's requirement) and skips the store update
 * entirely when the new camera is within epsilon of the current one — camerasApproximatelyEqual
 * and setDetailMapCamera's own epsilon guard both help avoid a feedback loop between the map,
 * the store, and the URL: the map only ever reports moveend, the store only ever updates on a
 * real change, and the URL sync (useDashboardUrlSync) only ever replaces on a real store change.
 */
export function useDetailMapCameraSync() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    [],
  );

  return useMemo(
    () => (camera: DetailMapCameraState) => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const current = useMapStore.getState().detailMapCamera;
        if (camerasApproximatelyEqual(current, camera)) return;
        useMapStore.getState().setDetailMapCamera(camera);
      }, DEBOUNCE_MS);
    },
    [],
  );
}
