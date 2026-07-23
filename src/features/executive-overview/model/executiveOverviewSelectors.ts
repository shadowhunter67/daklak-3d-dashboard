/** Selector/format helper thuần cho UI Executive Overview — không tính KPI (đã có ở
 * `buildExecutiveOverview.ts`), chỉ định dạng hiển thị và nhóm dữ liệu đã tính sẵn. */
import type { KpiResult } from '../../../entities/project/kpi/types';
import type { PortfolioAlert, PortfolioAlertSeverity } from './executiveOverviewTypes';

const vndFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const percentFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
const numberFormatter = new Intl.NumberFormat('vi-VN');

/**
 * Chuỗi hiển thị cho một KPI — spec: không hiển thị 0 cho unavailable, dùng text giải thích. Trả
 * cả `text` (hiển thị) và `isUnavailable` (để UI quyết định style/aria).
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

export function severityLabel(severity: PortfolioAlertSeverity): string {
  return severity === 'critical' ? 'Nghiêm trọng' : 'Cảnh báo';
}

export function formatRelativeUpdatedAt(iso: string, asOf: Date): string {
  const updated = new Date(iso);
  if (Number.isNaN(updated.getTime())) return 'Không rõ thời điểm';
  const days = Math.round((asOf.getTime() - updated.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'Hôm nay';
  if (days === 1) return '1 ngày trước';
  return `${days} ngày trước`;
}
