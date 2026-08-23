import { useTranslation } from '../../../i18n/useTranslation';
import { useWorldExplorationStore } from '../state/worldExplorationStore';
import { useTerrainSampler } from '../terrain/useTerrainSampler';
import { worldToLatLon } from '../coordinates/worldCoordinates';
import { getWorldPoiById, POI_PROXIMITY_RADIUS } from '../poi/worldPoi';
import {
  formatAltitudeMeters,
  formatDistanceMeters,
  formatLatLon,
  yawToCompassDegrees,
} from './worldHudFormat';
import { haversineDistanceMeters } from '../coordinates/worldCoordinates';

/**
 * Compass + altitude/coordinates + nearest-POI/interact-hint — the HUD sketch's right-hand
 * status cluster (task section 13). Reads `pose`/`nearestPoiId`/`nearestPoiDistance` from the
 * store, all of which `PlayerRig.tsx`/`TourRig.tsx` commit at a throttled rate (see their own
 * doc comments) — this component re-renders at that same throttled rate, not every frame.
 */
export function WorldStatusBar() {
  const { t } = useTranslation();
  const pose = useWorldExplorationStore((state) => state.pose);
  const nearestPoiId = useWorldExplorationStore((state) => state.nearestPoiId);
  const nearestPoiDistance = useWorldExplorationStore((state) => state.nearestPoiDistance);
  const terrainReady = useWorldExplorationStore((state) => state.terrainReady);
  const mode = useWorldExplorationStore((state) => state.mode);
  const sampler = useTerrainSampler();

  const [longitude, latitude] = worldToLatLon(pose.x, pose.z);
  const altitudeMeters = sampler?.getElevationMeters(pose.x, pose.z) ?? null;
  const headingDegrees = yawToCompassDegrees(pose.yaw);

  const nearestPoi = nearestPoiId ? getWorldPoiById(nearestPoiId) : undefined;
  const nearestMeters =
    nearestPoi && nearestPoiDistance !== null
      ? haversineDistanceMeters([longitude, latitude], nearestPoi.coordinates)
      : null;
  const isInInteractRange =
    nearestPoiDistance !== null && nearestPoiDistance <= POI_PROXIMITY_RADIUS;

  return (
    <div className="world-hud__status" aria-live="off">
      <div
        className="world-hud__compass"
        role="img"
        aria-label={t('worldExploration.hud.compassAria', { degrees: Math.round(headingDegrees) })}
      >
        <span
          className="world-hud__compass-needle"
          style={{ transform: `rotate(${-headingDegrees}deg)` }}
        />
        <span className="world-hud__compass-label">{t('worldExploration.hud.compassNorth')}</span>
      </div>
      <p className="world-hud__coordinates">{formatLatLon(longitude, latitude)}</p>
      <p className="world-hud__altitude">
        {terrainReady
          ? t('worldExploration.hud.altitude', { meters: formatAltitudeMeters(altitudeMeters) })
          : t('worldExploration.hud.terrainLoading')}
      </p>
      <p className="world-hud__nearest-poi">
        {nearestPoi && nearestMeters !== null
          ? t('worldExploration.hud.nearestPoi', {
              name: nearestPoi.name,
              distance: formatDistanceMeters(nearestMeters),
            })
          : t('worldExploration.hud.noNearbyPoi')}
      </p>
      {mode === 'walk' && isInInteractRange && (
        <p className="world-hud__interact-hint">{t('worldExploration.hud.interactHint')}</p>
      )}
    </div>
  );
}
