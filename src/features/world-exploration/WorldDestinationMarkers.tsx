import { Html } from '@react-three/drei';
import { useState } from 'react';
import { verifiedTourismDestinations } from '../../entities/tourism/verifiedTourismDestinations';
import type { TourismDestination } from '../../entities/tourism/types';
import { useTranslation } from '../../i18n/useTranslation';
import { projection } from '../../utils/geo';
import { useWorldExplorationStore } from './state/worldExplorationStore';
import { CATEGORY_MESSAGE_KEY } from './poi/poiCategoryMessages';
import { getDestinationMarkerHeight } from './poi/destinationElevation';
import { useTerrainSampler } from './terrain/useTerrainSampler';

/**
 * Phase T2 (reports/tourism-digital-twin/) — real, sourced destination markers on top of the
 * illustrative terrain (`src/entities/tourism/verifiedTourismDestinations.ts`).
 *
 * Selection (`selectedId`) moved in Phase T3 to `worldExplorationStore.ts`'s `selectedPoiId` —
 * still NOT `useMapStore`'s `hoveredCode`/`selectedCode` (same isolation reasoning
 * `WorldTerrainMesh.tsx` documents: this scene must not mutate state the existing `3d`/analytical
 * view's camera/selection logic reacts to), but now shared with `PlayerRig.tsx`'s "E" interact
 * and `WorldPoiList.tsx`'s "view details" so all three entry points open the exact same panel
 * below (unchanged markup/behavior — every existing Phase T2 e2e assertion on this panel's DOM
 * structure, `role="dialog"`, close button, etc. still passes unmodified). `hovered` stays local
 * `useState` — purely visual, per-marker, never needed outside this component.
 *
 * Coordinate transform: identical to `terrainConfig.ts`'s own `terrainNorthWest`/`terrainCenter`
 * derivation — `projection([lon, lat])` then negate Y (`ringToPoints` in `src/utils/geo.ts` does
 * the same sign flip) — so markers land in the exact same scene-plane space as the terrain mesh
 * they sit on.
 */

/** Small pin above the terrain surface — the terrain group is rotated `[-Math.PI / 2, 0, 0]` in
 * `WorldScene.tsx`, so a positive local Z here lifts the marker above the ground plane once
 * rotated into world space, same as `MapAnnotations.tsx`'s existing `0.34` marker Z-offset.
 *
 * Phase T3 tried switching this flat `0.5` to the real per-POI terrain height via the shared CPU
 * sampler and reverted it after it broke `world-exploration.spec.ts`'s Phase T2 "plausible marker
 * positions" assertion: `WorldFlyInCamera.tsx`'s fixed, zoomed-in fly-in framing was tuned around
 * the flat height, and some real destinations sit low enough on the real terrain to fall outside
 * that fixed camera's frame. Phase T4 revisits this the way the task requires: ground-anchor the
 * *marker's* rendered position (via `getDestinationMarkerHeight`, `poi/destinationElevation.ts`)
 * without touching `WorldFlyInCamera.tsx`'s path/framing at all — every camera-behavior e2e
 * assertion T2/T3 already wrote about the intro stays valid unmodified. A marker can still be
 * outside the intro's fixed frame at real elevation (Phase T2's own report already accepted this
 * as expected scene-design behavior for the flat height, loosening its "plausible marker
 * positions" check to desktop widths only) — the non-canvas `WorldPoiList.tsx` and Walk/Fly/Tour
 * modes remain the accessible path to every destination regardless of intro framing. Before the
 * shared terrain sampler resolves (`useTerrainSampler()` returns `null` on first render — the PNG
 * decode is async), `getDestinationMarkerHeight` returns the original flat `MARKER_FALLBACK_HEIGHT`
 * so markers are visible immediately, then update once real elevation is available. */

function DestinationMarker({
  destination,
  selected,
  onSelect,
  markerHeight,
}: {
  destination: TourismDestination;
  selected: boolean;
  onSelect: (id: string | null) => void;
  markerHeight: number;
}) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const point = projection(destination.coordinates)!;
  const position: [number, number, number] = [point[0], -point[1], markerHeight];

  return (
    <group position={position}>
      <Html transform sprite center distanceFactor={2.4} zIndexRange={[10, 5]}>
        <button
          type="button"
          className={`tourism-marker${selected ? ' tourism-marker--selected' : ''}${
            hovered ? ' tourism-marker--hovered' : ''
          }`}
          aria-label={t('worldExploration.destination.markerAriaLabel', {
            name: destination.name,
          })}
          aria-expanded={selected}
          onPointerOver={(event) => {
            event.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={(event) => {
            event.stopPropagation();
            setHovered(false);
          }}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(selected ? null : destination.id);
          }}
        >
          <span className="tourism-marker__dot" />
          {(hovered || selected) && (
            <span className="tourism-marker__label">{destination.name}</span>
          )}
        </button>
      </Html>
      {selected && (
        <Html
          position={[0, 0, 0]}
          transform
          sprite
          center
          distanceFactor={2.4}
          zIndexRange={[20, 15]}
          occlude={false}
        >
          <div
            className="tourism-info-panel"
            role="dialog"
            aria-label={destination.name}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="tourism-info-panel__close"
              aria-label={t('worldExploration.destination.closeLabel')}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(null);
              }}
            >
              ×
            </button>
            <p className="tourism-info-panel__category">
              {t(CATEGORY_MESSAGE_KEY[destination.category])}
            </p>
            <h3 className="tourism-info-panel__name">{destination.name}</h3>
            <p className="tourism-info-panel__description">{destination.description}</p>
            <p className="tourism-info-panel__verified-note">
              {t('worldExploration.destination.verifiedNote')}
            </p>
            <a
              className="tourism-info-panel__source"
              href={destination.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={t('worldExploration.destination.sourceLinkAria', {
                name: destination.name,
              })}
            >
              {t('worldExploration.destination.sourceLabel')} {destination.sourceUrl}
            </a>
          </div>
        </Html>
      )}
    </group>
  );
}

export function WorldDestinationMarkers() {
  const selectedId = useWorldExplorationStore((state) => state.selectedPoiId);
  const setSelectedId = useWorldExplorationStore((state) => state.selectPoi);
  const sampler = useTerrainSampler();
  return (
    <>
      {verifiedTourismDestinations.map((destination) => (
        <DestinationMarker
          key={destination.id}
          destination={destination}
          selected={destination.id === selectedId}
          onSelect={setSelectedId}
          markerHeight={getDestinationMarkerHeight(sampler, destination)}
        />
      ))}
    </>
  );
}
