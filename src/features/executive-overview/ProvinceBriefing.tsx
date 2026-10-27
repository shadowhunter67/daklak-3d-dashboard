import { useEffect, useMemo, useState } from 'react';
import labels from '#province-assets/daklak-labels.json';
import { ADMIN_UNIT_MEDIA } from '../../data/adminUnitMedia';
import { loadResearchedProjects } from '../../data/loadResearchedProjects';
import type { ResearchedDataset } from '../../entities/researched-project/types';
import { formatNumber } from '../../i18n/formatters';
import type { MessageKey } from '../../i18n/messages';
import { useTranslation } from '../../i18n/useTranslation';
import {
  serializeDataReadinessHash,
  serializeInvestmentCatalogHash,
  serializePlanningHash,
  serializeTourismHash,
} from '../../routing/hashRoute';
import { useHashRoute } from '../../routing/useHashRoute';
import { Card, PanelHeader } from '../../components/ui';
import { AlertIcon, ChartIcon } from '../../components/layout/icons';
import { buildCatalogRows, formatCapitalBillions } from '../investment-catalog/model/catalogModel';
import { SECTOR_KEY } from '../investment-catalog/model/sectorLabels';
import { imageCoverage } from '../unit-profile/model/unitProfileModel';
import { DecisionQueue } from './DecisionQueue';
import { buildDecisionQueue } from './model/decisionQueue';
import { buildBriefing, type BriefingTaskId } from './model/provinceBriefing';

const ALL_UNIT_CODES = Object.keys(labels);
const TOP_SECTORS = 5;

const TASK_HASH: Record<BriefingTaskId, () => string> = {
  capital: () => serializeInvestmentCatalogHash(),
  planning: serializePlanningHash,
  'tourism-photo': serializeTourismHash,
  'unit-photo': serializeDataReadinessHash,
};

/**
 * Khối điều hành chỉ dùng dữ liệu thật: hàng chờ "việc cần chú ý" (khoảng trống dữ liệu), quy mô vốn
 * dự kiến theo lĩnh vực (danh mục QĐ 1985) và ghi chú trung thực về phần chưa có nguồn (trách nhiệm,
 * giải ngân). Các nguồn phụ tải lười để không làm nặng gói chính của trang Tổng quan.
 */
export function ProvinceBriefing() {
  const { t, locale } = useTranslation();
  const { navigate } = useHashRoute();
  const [dataset, setDataset] = useState<ResearchedDataset | null>(null);
  const [failed, setFailed] = useState(false);
  const [extras, setExtras] = useState<{
    planning: number;
    tourismNoPhoto: number;
    reviewIds: ReadonlySet<string>;
    uncitedIds: ReadonlySet<string>;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadResearchedProjects().then(
      (value) => !cancelled && setDataset(value),
      () => !cancelled && setFailed(true),
    );
    Promise.all([
      import('../../data/planningCitations'),
      import('../../entities/tourism/verifiedTourismDestinations'),
    ]).then(
      ([planning, tourism]) =>
        !cancelled &&
        setExtras({
          planning: planning.PLANNING_REVIEW_PROJECT_IDS.length,
          reviewIds: new Set(planning.PLANNING_REVIEW_PROJECT_IDS),
          uncitedIds: new Set(planning.PLANNING_UNCITED_PROJECT_IDS),
          tourismNoPhoto: tourism.verifiedTourismDestinations.filter((d) => !d.imageUrl).length,
        }),
      () => !cancelled && setFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const briefing = useMemo(() => {
    if (!dataset || !extras) return null;
    const coverage = imageCoverage(ALL_UNIT_CODES, ADMIN_UNIT_MEDIA);
    const rows = buildCatalogRows(dataset);
    return {
      decisions: buildDecisionQueue({
        rows,
        reviewIds: extras.reviewIds,
        uncitedIds: extras.uncitedIds,
      }),
      ...buildBriefing({
        rows,
        planningReviewCount: extras.planning,
        destinationsWithoutPhoto: extras.tourismNoPhoto,
        unitsWithoutVerifiedImage: coverage.total - coverage.verified,
      }),
    };
  }, [dataset, extras]);

  if (failed)
    return (
      <p className="province-briefing__status" role="alert">
        {t('briefing.error')}
      </p>
    );
  if (!briefing)
    return (
      <p className="province-briefing__status" role="status">
        {t('briefing.loading')}
      </p>
    );
  // Việc về dự án nằm ở hàng chờ "Việc cần xử lý"; khối này chỉ còn khoảng trống nội dung (ảnh).
  const contentGaps = briefing.queue.filter(
    (task) => task.id === 'tourism-photo' || task.id === 'unit-photo',
  );
  const sectors = briefing.sectors.slice(0, TOP_SECTORS);
  const largest = sectors[0]?.capitalVnd ?? 1;

  return (
    <div className="province-briefing">
      <DecisionQueue
        items={briefing.decisions}
        onOpen={(item) => navigate(serializeInvestmentCatalogHash(item.name))}
      />
      <Card role="region" aria-labelledby="briefing-queue-heading">
        <PanelHeader
          title={t('briefing.gaps.heading')}
          icon={<AlertIcon />}
          headingId="briefing-queue-heading"
        />
        <p>{t('briefing.queue.note')}</p>
        {contentGaps.length === 0 ? (
          <p>{t('briefing.queue.empty')}</p>
        ) : (
          <ul className="province-briefing__queue">
            {contentGaps.map((task) => (
              <li key={task.id}>
                <span>
                  {t(`briefing.task.${task.id}` as MessageKey, {
                    count: formatNumber(task.count, locale),
                  })}
                </span>
                <button
                  type="button"
                  className="project-portfolio__row-link"
                  onClick={() => navigate(TASK_HASH[task.id]())}
                >
                  {t(`briefing.action.${task.id}` as MessageKey)}
                </button>
              </li>
            ))}
          </ul>
        )}
        <h3 className="province-briefing__sub">{t('briefing.accountability.heading')}</h3>
        <p>{t('briefing.accountability.note')}</p>
      </Card>

      <Card role="region" aria-labelledby="briefing-economy-heading">
        <PanelHeader
          title={t('briefing.economy.heading')}
          icon={<ChartIcon />}
          headingId="briefing-economy-heading"
        />
        <p>{t('briefing.economy.note')}</p>
        <p>
          {t('briefing.economy.total', {
            count: formatNumber(briefing.projectsWithCapital, locale),
            capital: formatCapitalBillions(briefing.totalCapitalVnd, locale),
          })}
        </p>
        <ul className="province-briefing__bars" aria-label={t('briefing.economy.listAria')}>
          {sectors.map((s) => (
            <li key={s.sector}>
              <span className="province-briefing__bar-label">{t(SECTOR_KEY[s.sector])}</span>
              <span
                className="province-briefing__bar"
                style={{ width: `${Math.max(4, (s.capitalVnd / largest) * 100)}%` }}
                aria-hidden="true"
              />
              <span className="province-briefing__bar-value">
                {t('briefing.economy.row', {
                  capital: formatCapitalBillions(s.capitalVnd, locale),
                  count: formatNumber(s.projects, locale),
                })}
              </span>
            </li>
          ))}
        </ul>
        <p>{t('briefing.economy.caveat')}</p>
        {briefing.projectsWithoutCapital > 0 && (
          <p>
            {t('briefing.economy.excluded', {
              count: formatNumber(briefing.projectsWithoutCapital, locale),
            })}
          </p>
        )}
      </Card>
    </div>
  );
}
