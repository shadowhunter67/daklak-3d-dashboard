import { useRef, useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';
import type { ProjectAttentionItem } from './model/executiveOverviewTypes';
import { ProjectSummaryPanel } from './ProjectSummaryPanel';

export function PriorityProjectList({
  items,
  asOf,
}: {
  items: readonly ProjectAttentionItem[];
  asOf: Date;
}) {
  const { t } = useTranslation();
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  const openItem = items.find((item) => item.projectId === openProjectId) ?? null;
  // Captured at click time (guaranteed to be the real trigger) rather than read from
  // `document.activeElement` inside the panel later — see ProjectSummaryPanel.tsx for why.
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  return (
    <section aria-labelledby="priority-project-heading" className="priority-project-list">
      <h3 id="priority-project-heading">{t('priorityProjects.heading')}</h3>
      {items.length === 0 ? (
        <p>{t('priorityProjects.empty')}</p>
      ) : (
        <ol>
          {items.map((item) => (
            <li key={item.projectId} className="priority-project-item">
              <div className="priority-project-item__main">
                <p className="priority-project-item__name">{item.projectName}</p>
                {/* Identifier and owning sector on their own line, the way the portfolio table and
                    the reference dashboard both present a record's provenance. Previously the code
                    trailed the name inline, where a long name pushed it to the line end and the
                    browser broke it at its own hyphens ("DL-2026-NL-" / "001"). */}
                <p className="priority-project-item__code">
                  {item.projectCode} <span aria-hidden="true">·</span>{' '}
                  {t(`sector.${item.sector}` as MessageKey)}
                </p>
                <p className="priority-project-item__meta">
                  <span className="priority-project-item__status" data-status={item.status}>
                    {t(`status.${item.status}` as MessageKey)}
                  </span>
                  <span>{t('priorityProjects.progress', { value: item.overallProgress })}</span>
                </p>
                {/* Decorative scanning aid only — the percentage is stated as text on the line
                    above, so the bar carries no information of its own and stays out of the
                    accessibility tree. Same component the portfolio table uses, so a progress
                    figure looks the same wherever it appears. */}
                <span
                  className="mini-progress-bar priority-project-item__progress"
                  aria-hidden="true"
                >
                  <span
                    className="mini-progress-bar__fill"
                    style={{ width: `${Math.max(0, Math.min(100, item.overallProgress))}%` }}
                  />
                </span>
                <p className="priority-project-item__reason">
                  <strong>{t('priorityProjects.reasonLabel')}</strong>{' '}
                  {t(`reason.${item.reasonCategory}` as MessageKey)}
                </p>
              </div>
              <button
                type="button"
                className="priority-project-item__action"
                onClick={(event) => {
                  triggerRef.current = event.currentTarget;
                  setOpenProjectId(item.projectId);
                }}
                aria-haspopup="dialog"
              >
                {t('priorityProjects.viewSummary')}
              </button>
            </li>
          ))}
        </ol>
      )}
      {openItem && (
        <ProjectSummaryPanel
          item={openItem}
          asOf={asOf}
          onClose={() => setOpenProjectId(null)}
          restoreFocusTo={triggerRef}
        />
      )}
    </section>
  );
}
