import { useState } from 'react';
import labels from '#province-assets/daklak-labels.json';
import { Card, PanelHeader } from '../../components/ui';
import { AlertIcon } from '../../components/layout/icons';
import { formatNumber } from '../../i18n/formatters';
import type { MessageKey } from '../../i18n/messages';
import { useTranslation } from '../../i18n/useTranslation';
import { formatCapitalBillions } from '../investment-catalog/model/catalogModel';
import { countByKind, type DecisionItem } from './model/decisionQueue';

const VISIBLE_STEP = 6;
const areaName = (code: string) => (labels as Record<string, { name: string }>)[code]?.name ?? code;

/**
 * Hàng chờ "Việc cần xử lý": từng dự án có vấn đề, kèm căn cứ và đường tới hồ sơ. Trường chưa có
 * nguồn (đơn vị chịu trách nhiệm, hạn xử lý) luôn hiện "Chưa có dữ liệu", không suy diễn.
 */
export function DecisionQueue({
  items,
  onOpen,
}: {
  items: readonly DecisionItem[];
  onOpen: (item: DecisionItem) => void;
}) {
  const { t, locale } = useTranslation();
  const [limit, setLimit] = useState(VISIBLE_STEP);
  const high = countByKind(items)['planning-review'];
  const shown = items.slice(0, limit);
  const missing = t('decision.missing');

  return (
    <Card role="region" aria-labelledby="decision-queue-heading" className="decision-queue">
      <PanelHeader
        title={t('decision.heading')}
        icon={<AlertIcon />}
        headingId="decision-queue-heading"
      />
      <p>{t('decision.note')}</p>
      {items.length === 0 ? (
        <p>{t('decision.empty')}</p>
      ) : (
        <>
          <p className="decision-queue__summary">
            {t('decision.summary', {
              count: formatNumber(items.length, locale),
              high: formatNumber(high, locale),
            })}
          </p>
          <ol className="decision-queue__list" aria-label={t('decision.listAria')}>
            {shown.map((item) => (
              <li
                key={item.projectId}
                className="decision-queue__item"
                data-priority={item.priority}
              >
                <div className="decision-queue__head">
                  <strong>{item.name}</strong>
                  <span className="decision-queue__badges">
                    <span className="decision-queue__priority">
                      {t(`decision.priority.${item.priority}` as MessageKey)}
                    </span>
                    <span className="decision-queue__kind">
                      {t(`decision.kind.${item.kind}` as MessageKey)}
                    </span>
                  </span>
                </div>
                <dl className="decision-queue__fields">
                  <div>
                    <dt>{t('decision.field.area')}</dt>
                    <dd>
                      {item.areaCodes.length ? item.areaCodes.map(areaName).join(', ') : missing}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('decision.field.capital')}</dt>
                    <dd>
                      {item.capitalVnd === undefined
                        ? missing
                        : t('catalog.capitalValue', {
                            value: formatCapitalBillions(item.capitalVnd, locale),
                          })}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('decision.field.source')}</dt>
                    <dd>{item.source ?? missing}</dd>
                  </div>
                  <div>
                    <dt>{t('decision.field.owner')}</dt>
                    <dd>{missing}</dd>
                  </div>
                  <div>
                    <dt>{t('decision.field.deadline')}</dt>
                    <dd>{missing}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className="project-portfolio__row-link"
                  onClick={() => onOpen(item)}
                >
                  {t('decision.action')}
                  <span className="ui-visually-hidden"> — {item.name}</span>
                </button>
              </li>
            ))}
          </ol>
          {items.length > VISIBLE_STEP && (
            <button
              type="button"
              className="project-portfolio-card__open"
              onClick={() =>
                setLimit(limit >= items.length ? VISIBLE_STEP : limit + VISIBLE_STEP * 2)
              }
            >
              {limit >= items.length
                ? t('decision.less')
                : t('decision.more', { count: formatNumber(items.length - limit, locale) })}
            </button>
          )}
        </>
      )}
    </Card>
  );
}
