/** Selector/format helper thuần cho UI Executive Overview — không tính KPI (đã có ở
 * `buildExecutiveOverview.ts`), chỉ định dạng hiển thị và nhóm dữ liệu đã tính sẵn. */
import type { KpiResult } from '../../../entities/project/kpi/types';
import type { Locale } from '../../../i18n/locale';
import type { MessageKey } from '../../../i18n/messages';
import {
  formatDateTime,
  formatNumber,
  formatPercent,
  formatPercentagePointsDelta,
  formatVnd,
  formatVndInBillions,
} from '../../../i18n/formatters';
import type {
  PortfolioAlert,
  PortfolioAlertSeverity,
  PortfolioStatus,
} from './executiveOverviewTypes';

type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

/** Shared between the `.executive-overview__status` line and `ExecutiveStatusHero` — one
 * canonical mapping so the two never drift to different wording for the same status. */
export const PORTFOLIO_STATUS_MESSAGE_KEY: Record<PortfolioStatus, MessageKey> = {
  healthy: 'portfolioStatus.healthy',
  attention: 'portfolioStatus.attention',
  critical: 'portfolioStatus.critical',
  degraded: 'portfolioStatus.degraded',
};

/** Formats a KPI value for display — never a bare 0 for unavailable, an explanatory text instead
 * (spec). Every UI surface (Executive Overview, Project Portfolio, Project Detail) is translated,
 * so this is the only KPI formatter — locale-aware via the centralized `i18n/formatters.ts`. */
export function formatKpiValueLocalized(
  kpi: KpiResult,
  locale: Locale,
  t: Translate,
): { text: string; isUnavailable: boolean; fullText?: string } {
  if (kpi.status === 'unavailable' || kpi.value === null)
    return { text: t('kpi.unavailable'), isUnavailable: true };
  switch (kpi.unit) {
    case 'VND':
      // A full unformatted VND amount ("2.453.000.000.000 ₫") wraps ugly and breaks the KPI
      // grid's fixed-width cards (spec §M) — show the compact form ("2,5 nghìn tỷ ₫") and carry
      // the exact figure in `fullText` for the caller to surface as a tooltip/accessible label,
      // never silently dropping precision.
      return {
        text: formatVndInBillions(kpi.value, locale),
        fullText: formatVnd(kpi.value, locale),
        isUnavailable: false,
      };
    case '%':
      return { text: formatPercent(kpi.value, locale), isUnavailable: false };
    case 'count':
      return { text: formatNumber(kpi.value, locale), isUnavailable: false };
    case 'days':
      return {
        text: t('kpi.daysValue', { value: formatNumber(kpi.value, locale) }),
        isUnavailable: false,
      };
    case 'percentage-points':
      // Was falling through to the bare-number `default` case below — a schedule/disbursement
      // variance rendered as a naked "-9" on Project Detail, with no unit telling the reader it
      // means "9 điểm phần trăm chậm hơn kế hoạch" (real defect, found via screenshot review).
      return {
        text: formatPercentagePointsDelta(kpi.value, locale),
        isUnavailable: false,
      };
    default:
      return { text: formatNumber(kpi.value, locale), isUnavailable: false };
  }
}

export interface GroupedAlerts {
  critical: PortfolioAlert[];
  warning: PortfolioAlert[];
  dataQuality: PortfolioAlert[];
}

/** Nhóm alert theo đúng 3 nhóm spec yêu cầu: critical (business), warning (business), data quality
 * (mọi mức độ, tách riêng khỏi hai nhóm business) — không trộn business và data-quality. */
export function groupAlerts(alerts: readonly PortfolioAlert[]): GroupedAlerts {
  const dataQuality = alerts.filter((a) => a.kind === 'data-quality');
  const business = alerts.filter((a) => a.kind === 'business');
  return {
    critical: business.filter((a) => a.severity === 'critical'),
    warning: business.filter((a) => a.severity === 'warning'),
    dataQuality,
  };
}

export function severityMessageKey(severity: PortfolioAlertSeverity): MessageKey {
  return severity === 'critical' ? 'severity.critical' : 'severity.warning';
}

/**
 * Định dạng một mốc thời gian dữ liệu (effectiveAt/sourcePublishedAt/retrievedAt/
 * publishedToDashboardAt) thành chuỗi tuyệt đối, không tương đối — cố tình tránh dạng "Hôm nay"/"N
 * ngày trước" vì các mốc này là thuộc tính deterministic của snapshot, không phải thời điểm phiên
 * trình duyệt hiện tại mở trang (xem `ProjectPortfolioProvenance`). `locale` mặc định `'vi'` để giữ
 * tương thích ngược cho call site nào chưa truyền — component đã dịch luôn truyền locale hiện tại.
 */
export function formatAbsoluteDateTime(iso: string, locale: Locale = 'vi'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return locale === 'en' ? 'Unknown time' : 'Không rõ thời điểm';
  return formatDateTime(date, locale);
}
