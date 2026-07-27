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
                <p className="priority-project-item__name">
                  {item.projectName}{' '}
                  <span className="priority-project-item__code">({item.projectCode})</span>
                </p>
                <p className="priority-project-item__meta">
                  <span>{t(`sector.${item.sector}` as MessageKey)}</span>
                  <span aria-hidden="true"> · </span>
                  <span>{t(`status.${item.status}` as MessageKey)}</span>
                  <span aria-hidden="true"> · </span>
                  <span>{t('priorityProjects.progress', { value: item.overallProgress })}</span>
                </p>
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
