/** Selector/format helper thuần cho UI Executive Overview — không tính KPI (đã có ở
 * `buildExecutiveOverview.ts`), chỉ định dạng hiển thị và nhóm dữ liệu đã tính sẵn. */
import type { KpiResult } from '../../../entities/project/kpi/types';
import type { Locale } from '../../../i18n/locale';
import type { MessageKey } from '../../../i18n/messages';
import { formatDateTime, formatNumber, formatPercent, formatVnd } from '../../../i18n/formatters';
import type { PortfolioAlert, PortfolioAlertSeverity } from './executiveOverviewTypes';

const vndFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const percentFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
const numberFormatter = new Intl.NumberFormat('vi-VN');

/**
 * Chuỗi hiển thị cho một KPI — spec: không hiển thị 0 cho unavailable, dùng text giải thích. Trả
 * cả `text` (hiển thị) và `isUnavailable` (để UI quyết định style/aria).
 *
 * Giữ nguyên tiếng Việt hard-code (không nhận `locale`) vì `ProjectDetailView`/`ProjectPortfolioView`
 * (chưa nằm trong phạm vi dịch của PR này — xem docs/adr/0003-internationalization.md) vẫn gọi hàm
 * này trực tiếp. Dùng `formatKpiValueLocalized` bên dưới cho mọi call site đã dịch (Executive
 * Overview) thay vì đổi chữ ký hàm này và buộc phải dịch lây sang những file chưa tới lượt.
 */
export function formatKpiValue(kpi: KpiResult): { text: string; isUnavailable: boolean } {
  if (kpi.status === 'unavailable' || kpi.value === null)
    return { text: 'Chưa đủ dữ liệu', isUnavailable: true };
  switch (kpi.unit) {
    case 'VND':
      return { text: `${vndFormatter.format(kpi.value)} ₫`, isUnavailable: false };
    case '%':
      return { text: `${percentFormatter.format(kpi.value)}%`, isUnavailable: false };
    case 'count':
      return { text: numberFormatter.format(kpi.value), isUnavailable: false };
    case 'days':
      return { text: `${numberFormatter.format(kpi.value)} ngày`, isUnavailable: false };
    default:
      return { text: numberFormatter.format(kpi.value), isUnavailable: false };
  }
}

type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

/** Locale-aware counterpart of `formatKpiValue` — used by translated Executive Overview components. */
export function formatKpiValueLocalized(
  kpi: KpiResult,
  locale: Locale,
  t: Translate,
): { text: string; isUnavailable: boolean } {
  if (kpi.status === 'unavailable' || kpi.value === null)
    return { text: t('kpi.unavailable'), isUnavailable: true };
  switch (kpi.unit) {
    case 'VND':
      return { text: formatVnd(kpi.value, locale), isUnavailable: false };
    case '%':
      return { text: formatPercent(kpi.value, locale), isUnavailable: false };
    case 'count':
      return { text: formatNumber(kpi.value, locale), isUnavailable: false };
    case 'days':
      return {
        text: t('kpi.daysValue', { value: formatNumber(kpi.value, locale) }),
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
