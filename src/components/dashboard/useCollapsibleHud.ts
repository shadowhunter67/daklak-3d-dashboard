import { useCallback, useEffect, useState } from 'react';
import { useMapStore } from '../../stores/mapStore';

/** Panels start collapsed unless the window is wide enough (1280px) to leave the 102-label map real room. */
const OPEN_BY_DEFAULT_MIN_WIDTH = 1280;

/**
 * Open/collapsed state of a floating 3D HUD panel. Collapsing narrows the panel to a thin strip, so
 * the camera's safe viewport (see `viewportInsets.ts`, driven by `data-viewport-overlay`) is
 * re-measured and the province is refitted into the space that is actually free.
 */
export function useCollapsibleHud(): { collapsed: boolean; toggle: () => void } {
  const requestCameraReset = useMapStore((state) => state.requestCameraReset);
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < OPEN_BY_DEFAULT_MIN_WIDTH,
  );
  useEffect(() => {
    // A full refit (not just a pan): the free area changed size, so the whole province has to be
    // re-scaled into it. Also runs when the lazy panel first mounts, so the initial view already
    // accounts for the panels.
    requestCameraReset();
  }, [collapsed, requestCameraReset]);
  const toggle = useCallback(() => setCollapsed((value) => !value), []);
  return { collapsed, toggle };
}
