import { useTranslation } from '../../i18n/useTranslation';
import { ChevronRightIcon } from '../layout/icons';

/** Collapse/expand button for a floating 3D HUD panel. Icon + accessible name; the chevron points
 * toward where the panel will go. */
export function HudToggle({
  collapsed,
  onToggle,
  label,
  side = 'left',
}: {
  collapsed: boolean;
  onToggle: () => void;
  label: string;
  side?: 'left' | 'right';
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="hud-toggle"
      data-side={side}
      aria-expanded={!collapsed}
      aria-label={t(collapsed ? 'hud.expand' : 'hud.collapse', { name: label })}
      title={t(collapsed ? 'hud.expand' : 'hud.collapse', { name: label })}
      onClick={onToggle}
    >
      <ChevronRightIcon />
    </button>
  );
}
