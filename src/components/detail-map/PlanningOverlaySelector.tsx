import { useTranslation } from '../../i18n/useTranslation';
import type { PlanningOverlay } from './detailMapTypes';
import { PLANNING_THEMES, PLANNING_THEME_IDS } from './planningThemes';

/**
 * Radio selector for the illustrative planning overlays (`planningThemes.ts`) plus the legend of
 * whichever theme is active and a standing "illustrative, no legal validity" disclaimer. Radio,
 * not checkboxes: only one translucent zone wash is readable at a time.
 *
 * Theme/category copy is Vietnamese-only, sourced from the `PLANNING_THEMES` registry — the same
 * arrangement as the other map-layer titles in `data-platform/catalog/layers.ts` (the layer panel
 * has never localised layer names; see `MapLayerPanel`).
 */
export function PlanningOverlaySelector({
  value,
  onChange,
}: {
  value: PlanningOverlay;
  onChange: (overlay: PlanningOverlay) => void;
}) {
  const { t } = useTranslation();
  const activeTheme = value === 'none' ? null : PLANNING_THEMES[value];

  return (
    <div className="detail-map-planning-selector">
      <div role="radiogroup" aria-label={t('layerPanel.planningAria')}>
        <label className="planning-option">
          <input
            type="radio"
            name="detail-map-planning"
            value="none"
            checked={value === 'none'}
            onChange={() => onChange('none')}
          />
          {t('layerPanel.planningNone')}
        </label>
        {PLANNING_THEME_IDS.map((id) => (
          <label key={id} className="planning-option">
            <input
              type="radio"
              name="detail-map-planning"
              value={id}
              checked={value === id}
              onChange={() => onChange(id)}
            />
            {PLANNING_THEMES[id].name}
          </label>
        ))}
      </div>

      {activeTheme && (
        <>
          <ul className="planning-legend" aria-label={t('layerPanel.planningLegendLabel')}>
            {activeTheme.categories.map((category) => (
              <li key={category.id}>
                <span
                  className="planning-legend__swatch"
                  style={{ background: category.color }}
                  aria-hidden="true"
                />
                {category.label}
              </li>
            ))}
          </ul>
          <p className="planning-disclaimer">{t('layerPanel.planningDisclaimer')}</p>
        </>
      )}
    </div>
  );
}
