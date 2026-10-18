import { useTranslation } from '../../i18n/useTranslation';
import { Card, PanelHeader } from '../../components/ui';
import { ClockIcon } from '../../components/layout/icons';
import { formatAbsoluteDateTime } from './model/executiveOverviewSelectors';
import type { ExecutiveOverviewModel } from './model/executiveOverviewTypes';

export function RecentUpdatesCard({
  timeline,
}: {
  timeline: ExecutiveOverviewModel['dataTimeline'];
}) {
  const { t, locale } = useTranslation();
  const entries = [
    ['effectiveAt', 'executiveOverview.timeline.effectiveAt'],
    ['sourcePublishedAt', 'executiveOverview.timeline.sourcePublishedAt'],
    ['retrievedAt', 'executiveOverview.timeline.retrievedAt'],
    ['publishedToDashboardAt', 'executiveOverview.timeline.publishedToDashboardAt'],
    ['loadedInBrowserAt', 'executiveOverview.timeline.loadedInBrowserAt'],
  ] as const;

  return (
    <Card className="recent-updates-card" aria-labelledby="recent-updates-heading">
      <PanelHeader
        title={t('executiveOverview.recentUpdates')}
        icon={<ClockIcon />}
        headingId="recent-updates-heading"
      />
      <ol className="recent-updates-card__timeline">
        {entries.map(([field, label]) => (
          <li key={field}>
            <span className="recent-updates-card__dot" aria-hidden="true" />
            <div>
              <span>{t(label)}</span>
              <time dateTime={timeline[field]}>
                {formatAbsoluteDateTime(timeline[field], locale)}
              </time>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
