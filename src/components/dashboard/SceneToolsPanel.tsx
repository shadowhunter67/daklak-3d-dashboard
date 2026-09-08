import { useMapStore } from '../../stores/mapStore';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * The 3D scene's own controls, as a panel beside the scene instead of four more pills in the
 * global header row.
 *
 * They used to live in `.header-meta` behind a `viewMode === '3d'` gate, sharing one
 * horizontally-scrolling row with every app-level control (share / help / provenance / data
 * sources / font scale / language). In the 3D view that row carried eleven controls and pushed
 * the last of them off the right edge behind the scroll fade — so the ones that became
 * unreachable were the global controls a user needs from every view, crowded out by four that
 * only mean anything here. These four belong to the scene, so they now sit with it.
 *
 * Same store actions and the same accessible names, titles and pressed states as before: nothing
 * about how they are announced or operated changes, only where they are.
 */
export function SceneToolsPanel() {
  const { t } = useTranslation();
  const viewMode = useMapStore((state) => state.viewMode);
  const labelsVisible = useMapStore((state) => state.labelsVisible);
  const roadsVisible = useMapStore((state) => state.roadsVisible);
  const autoRotate = useMapStore((state) => state.autoRotate);
  const reducedMotion = useMapStore((state) => state.reducedMotion);
  const toggleLabels = useMapStore((state) => state.toggleLabels);
  const toggleRoads = useMapStore((state) => state.toggleRoads);
  const toggleAutoRotate = useMapStore((state) => state.toggleAutoRotate);
  const requestCameraReset = useMapStore((state) => state.requestCameraReset);

  // Every control here drives the 3D scene specifically; the merged map view has its own layer
  // panel (MapLayerPanel.tsx) and the other views have no camera to speak of.
  if (viewMode !== '3d') return null;

  return (
    <section className="scene-tools glass" aria-labelledby="scene-tools-heading">
      <h2 className="scene-tools__heading" id="scene-tools-heading">
        {t('sceneTools.heading')}
      </h2>
      <div className="scene-tools__group">
        <button
          type="button"
          className="scene-tools__toggle"
          onClick={toggleAutoRotate}
          aria-pressed={autoRotate}
          disabled={reducedMotion}
          aria-label={
            reducedMotion
              ? t('header.autoRotate.ariaLabelReducedMotion')
              : autoRotate
                ? t('header.autoRotate.ariaLabelStop')
                : t('header.autoRotate.ariaLabelStart')
          }
          title={
            reducedMotion ? t('header.autoRotate.titleReducedMotion') : t('header.autoRotate.title')
          }
        >
          {reducedMotion
            ? t('header.autoRotate.labelReducedMotion')
            : autoRotate
              ? t('header.autoRotate.labelStop')
              : t('header.autoRotate.labelStart')}
        </button>
        <button
          type="button"
          className="scene-tools__toggle"
          onClick={toggleRoads}
          aria-pressed={roadsVisible}
          aria-label={
            roadsVisible ? t('header.roads.ariaLabelHide') : t('header.roads.ariaLabelShow')
          }
        >
          {roadsVisible ? t('header.roads.labelHide') : t('header.roads.labelShow')}
        </button>
        <button
          type="button"
          className="scene-tools__toggle"
          onClick={toggleLabels}
          aria-pressed={labelsVisible}
          aria-label={
            labelsVisible
              ? t('header.centerLabels.ariaLabelHide')
              : t('header.centerLabels.ariaLabelShow')
          }
        >
          {labelsVisible ? t('header.centerLabels.labelHide') : t('header.centerLabels.labelShow')}
        </button>
      </div>
      {/* An action, not a state — kept visually apart from the three toggles above it so the
          panel does not read as four things of the same kind. */}
      <button
        type="button"
        className="scene-tools__action"
        onClick={requestCameraReset}
        aria-label={t('header.resetCamera.ariaLabel')}
        title={t('header.resetCamera.title')}
      >
        {t('header.resetCamera.label')}
      </button>
    </section>
  );
}
