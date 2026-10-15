import { useTranslation } from '../../i18n/useTranslation';

/** Placeholder for the sidebar's "Báo cáo" entry. There is no report data source yet, so this page
 * says so plainly instead of faking charts or export buttons. */
export function ReportsView({ onBackToOverview }: { onBackToOverview: () => void }) {
  const { t } = useTranslation();
  return (
    <section id="reports" className="project-portfolio reports-view" tabIndex={-1}>
      <h2>{t('reports.title')}</h2>
      <p className="reports-view__badge" role="note">
        {t('reports.comingSoon')}
      </p>
      <p>{t('reports.body')}</p>
      <button
        type="button"
        className="executive-overview__portfolio-link"
        onClick={onBackToOverview}
      >
        {t('reports.backToOverview')}
      </button>
    </section>
  );
}
