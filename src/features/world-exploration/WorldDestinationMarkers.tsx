import { Html } from '@react-three/drei';
import { useState } from 'react';
import { verifiedTourismDestinations } from '../../entities/tourism/verifiedTourismDestinations';
import type { TourismDestination } from '../../entities/tourism/types';
import { useTranslation } from '../../i18n/useTranslation';
import { projection } from '../../utils/geo';
import { useWorldExplorationStore } from './state/worldExplorationStore';
import { CATEGORY_MESSAGE_KEY } from './poi/poiCategoryMessages';

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
 * Phase T3 considered switching this to the real per-POI terrain height via the shared CPU
 * sampler (`useTerrainSampler.ts`, the same one `PlayerRig.tsx`/`TourRig.tsx` use), and rejected
 * it after it broke `world-exploration.spec.ts`'s existing Phase T2 "plausible marker positions"
 * assertion: `WorldFlyInCamera.tsx`'s fixed, zoomed-in fly-in framing was tuned around this flat
 * `0.5`, and several real destinations (e.g. lower-elevation ones) sit low enough on the real
 * terrain that they moved outside that fixed camera's frame entirely. Ground-anchoring markers
 * to real elevation is a real, reasonable T2.1+ enhancement, but it needs the fly-in camera
 * framing revisited alongside it (or Walk/Fly mode, where the player's own camera moves freely
 * and this constraint doesn't apply) — not a one-line height swap that quietly makes some real
 * destinations undiscoverable in the illustrative intro. Player/POI proximity/teleport (the
 * actual "ground-anchored" gameplay requirement) already use the shared sampler; only this
 * decorative marker offset stays fixed. */
const MARKER_Z = 0.5;

function DestinationMarker({
  destination,
  selected,
  onSelect,
}: {
  destination: TourismDestination;
  selected: boolean;
  onSelect: (id: string | null) => void;
}) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const point = projection(destination.coordinates)!;
  const position: [number, number, number] = [point[0], -point[1], MARKER_Z];

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
  return (
    <>
      {verifiedTourismDestinations.map((destination) => (
        <DestinationMarker
          key={destination.id}
          destination={destination}
          selected={destination.id === selectedId}
          onSelect={setSelectedId}
        />
      ))}
    </>
  );
}
