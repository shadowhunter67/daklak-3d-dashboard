import { useRef, useState } from 'react';
import labels from '#province-assets/daklak-labels.json';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';
import { serializePortfolioHash } from '../../routing/hashRoute';
import { useHashRoute } from '../../routing/useHashRoute';
import { Card, DataTable, PanelHeader, ProgressBar, StatusChip } from '../../components/ui';
import { FolderIcon } from '../../components/layout/icons';
import type { ProjectStatus } from '../../entities/project/types';
import type { ProjectAttentionItem } from './model/executiveOverviewTypes';
import { ProjectSummaryPanel } from './ProjectSummaryPanel';

const labelMap = labels as Record<string, { name: string }>;

function statusTone(
  status: ProjectStatus,
): 'danger' | 'warning' | 'info' | 'success' | 'neutral' | 'progress' {
  if (status === 'completed' || status === 'active') return 'success';
  if (status === 'delayed' || status === 'suspended' || status === 'cancelled') return 'danger';
  if (status === 'at-risk') return 'warning';
  if (status === 'unknown') return 'neutral';
  return 'progress';
}

function progressTone(status: ProjectStatus): 'gold' | 'orange' | 'green' | 'blue' | 'red' {
  if (status === 'completed' || status === 'active') return 'green';
  if (status === 'delayed' || status === 'suspended' || status === 'cancelled') return 'red';
  if (status === 'at-risk') return 'orange';
  if (status === 'unknown') return 'gold';
  return 'blue';
}

export function PriorityProjectsTable({
  items,
  attentionProjectCount,
  asOf,
  onOpenPortfolio,
}: {
  items: readonly ProjectAttentionItem[];
  attentionProjectCount: number;
  asOf: Date;
  onOpenPortfolio?: () => void;
}) {
  const { t } = useTranslation();
  const { navigate } = useHashRoute();
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const openItem = items.find((item) => item.projectId === openProjectId) ?? null;
  const openPortfolio = () => {
    if (onOpenPortfolio) onOpenPortfolio();
    else navigate(serializePortfolioHash());
  };

  return (
    <Card className="priority-projects-card" aria-labelledby="priority-projects-heading">
      <PanelHeader
        title={t('priorityProjects.heading', { count: String(attentionProjectCount) })}
        icon={<FolderIcon />}
        headingId="priority-projects-heading"
        action={
          <button type="button" className="ui-panel-link" onClick={openPortfolio}>
            {t('priorityProjects.viewAll')}
          </button>
        }
      />
      {items.length === 0 ? (
        <p className="priority-projects-card__empty">{t('priorityProjects.empty')}</p>
      ) : (
        <DataTable
          caption={t('priorityProjects.tableCaption')}
          rows={[...items]}
          getRowKey={(row) => row.projectId}
          columns={[
            {
              key: 'projectName',
              header: t('priorityProjects.colName'),
              render: (row) => (
                <button
                  type="button"
                  className="priority-projects-card__project-link"
                  onClick={(event) => {
                    triggerRef.current = event.currentTarget;
                    setOpenProjectId(row.projectId);
                  }}
                  aria-haspopup="dialog"
                >
                  {row.projectName}
                </button>
              ),
            },
            {
              key: 'area',
              header: t('priorityProjects.colArea'),
              render: (row) =>
                labelMap[row.administrativeAreaCodes[0]]?.name ?? t('priorityProjects.unknownArea'),
            },
            {
              key: 'sector',
              header: t('priorityProjects.colSector'),
              render: (row) => t(`sector.${row.sector}` as MessageKey),
            },
            {
              key: 'progress',
              header: t('priorityProjects.colProgress'),
              render: (row) => (
                <ProgressBar
                  value={row.overallProgress}
                  tone={progressTone(row.status)}
                  label={t('priorityProjects.progress', { value: row.overallProgress })}
                  valueText={`${row.overallProgress}%`}
                />
              ),
            },
            {
              key: 'status',
              header: t('priorityProjects.colStatus'),
              render: (row) => (
                <StatusChip
                  label={t(`status.${row.status}` as MessageKey)}
                  tone={statusTone(row.status)}
                  dot
                />
              ),
            },
          ]}
        />
      )}
      {openItem && (
        <ProjectSummaryPanel
          item={openItem}
          asOf={asOf}
          onClose={() => setOpenProjectId(null)}
          restoreFocusTo={triggerRef}
        />
      )}
    </Card>
  );
}
