import { useTranslation } from '../../../i18n/useTranslation';
import { getWorldTourById } from '../tours/worldTours';
import { useWorldExplorationStore } from '../state/worldExplorationStore';

/** Pause/resume/stop bar shown only while a tour is actually active (task section 2: "Người dùng
 * có thể: bắt đầu tour; pause; tiếp tục; bỏ tour; chuyển về walk/fly"). Starting a tour happens in
 * `WorldTeleportMenu.tsx`; switching back to Walk/Fly is `WorldModeSwitch.tsx` (unchanged) —
 * `stopTour()` here only clears the active tour, it does not itself change `mode` back to
 * Walk/Fly, matching the task's explicit "bỏ tour" vs. "chuyển về walk/fly" as two separate
 * actions. */
export function WorldTourControls() {
  const { t } = useTranslation();
  const mode = useWorldExplorationStore((state) => state.mode);
  const activeTourId = useWorldExplorationStore((state) => state.activeTourId);
  const tourPlaying = useWorldExplorationStore((state) => state.tourPlaying);
  const tourStopIndex = useWorldExplorationStore((state) => state.tourStopIndex);
  const pauseTour = useWorldExplorationStore((state) => state.pauseTour);
  const resumeTour = useWorldExplorationStore((state) => state.resumeTour);
  const stopTour = useWorldExplorationStore((state) => state.stopTour);

  if (mode !== 'tour' || !activeTourId) return null;
  const tour = getWorldTourById(activeTourId);
  if (!tour) return null;

  const total = tour.stops.length;
  const current = Math.min(tourStopIndex + 1, total);
  const statusKey = tourPlaying
    ? ('worldExploration.tour.playingStatus' as const)
    : ('worldExploration.tour.pausedStatus' as const);

  return (
    <div className="world-hud__tour-controls" role="status">
      <p>{t(statusKey, { title: t(tour.titleKey), current, total })}</p>
      <div className="world-hud__tour-buttons">
        {tourPlaying ? (
          <button type="button" onClick={pauseTour}>
            {t('worldExploration.tour.pauseButton')}
          </button>
        ) : (
          <button type="button" onClick={resumeTour}>
            {t('worldExploration.tour.resumeButton')}
          </button>
        )}
        <button type="button" onClick={stopTour}>
          {t('worldExploration.tour.stopButton')}
        </button>
      </div>
    </div>
  );
}
