/**
 * Xu hướng KPI cấp danh mục theo thời gian ("so với kỳ trước"), dựng từ lịch sử `progressSnapshots`
 * thật của từng dự án — KHÔNG suy đoán, KHÔNG nội suy tuyến tính. Nếu không đủ dự án có snapshot cũ
 * hơn cửa sổ so sánh, trả `status: 'unavailable'` thay vì một con số nhìn hợp lý nhưng vô căn cứ
 * (cùng nguyên tắc với `kpi/index.ts`: không có dữ liệu thì không có con số, không phải 0/xấp xỉ).
 */
import type { ProjectBundle } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Cửa sổ so sánh mặc định: 30 ngày. Đây là một quy ước rolling-window, không phải "cùng kỳ năm
 * trước" — domain hiện chưa có đủ lịch sử nhiều năm để so sánh theo năm; ghi rõ trong explanation
 * để không gây hiểu nhầm với cách các dashboard vĩ mô (GRDP, ngân sách...) thường so "cùng kỳ". */
export const TREND_WINDOW_DAYS = 30;

/** Tỷ trọng ngân sách tối thiểu (theo `adjustedBudget`/`approvedBudget`) phải có lịch sử cũ hơn
 * cửa sổ so sánh thì xu hướng mới được coi là đại diện cho toàn danh mục. */
const MIN_COMPARABLE_BUDGET_SHARE = 0.5;

export interface PortfolioTrendResult {
  status: 'ok' | 'unavailable';
  /** Điểm phần trăm, kỳ hiện tại − kỳ trước (dương = tăng). `null` khi `status: 'unavailable'`. */
  deltaPercentagePoints: number | null;
  previousAsOf: string;
  comparableProjectCount: number;
  totalProjectCount: number;
  explanation: string;
}

function projectBudgetCeiling(bundle: ProjectBundle): number {
  const ceiling = bundle.project.adjustedBudget ?? bundle.project.approvedBudget;
  return Number.isFinite(ceiling) && ceiling > 0 ? ceiling : 0;
}

/** Dựng lại số tiền đã giải ngân của một dự án tại thời điểm `asOf`, từ snapshot tiến độ mới nhất
 * có `observedAt <= asOf`. Trả `undefined` (không phải 0) khi dự án chưa có snapshot nào cũ đến
 * mức đó — nghĩa là "chưa biết", không phải "chưa giải ngân đồng nào". */
function disbursedAmountAsOf(bundle: ProjectBundle, asOf: Date): number | undefined {
  const asOfMs = asOf.getTime();
  const eligible = bundle.progressSnapshots.filter(
    (snapshot) => new Date(snapshot.observedAt).getTime() <= asOfMs,
  );
  if (eligible.length === 0) return undefined;
  const latest = eligible.reduce((a, b) =>
    new Date(b.observedAt).getTime() > new Date(a.observedAt).getTime() ? b : a,
  );
  return latest.disbursedAmount;
}

/**
 * Xu hướng tỷ lệ giải ngân toàn danh mục so với `windowDays` ngày trước. Chỉ tính trên tập con dự
 * án có snapshot cũ hơn cửa sổ so sánh (cùng dùng ngân sách hiệu lực hiện tại làm mẫu số cho cả hai
 * kỳ — dự án không đổi ngân sách qua các snapshot minh hoạ/thật hiện có, đây là đơn giản hoá có chủ
 * đích, không phải sai số ẩn). Nếu tập con đó đại diện dưới 50% tổng ngân sách hiệu lực, trả
 * `unavailable`.
 */
export function portfolioDisbursementRateTrend(
  bundles: readonly ProjectBundle[],
  asOf: Date,
  windowDays: number = TREND_WINDOW_DAYS,
): PortfolioTrendResult {
  const previousAsOf = new Date(asOf.getTime() - windowDays * DAY_MS);

  const totalCeiling = bundles.reduce((sum, bundle) => sum + projectBudgetCeiling(bundle), 0);

  const comparable = bundles
    .map((bundle) => ({
      bundle,
      ceiling: projectBudgetCeiling(bundle),
      previousDisbursed: disbursedAmountAsOf(bundle, previousAsOf),
    }))
    .filter(
      (entry): entry is typeof entry & { previousDisbursed: number } =>
        entry.previousDisbursed !== undefined && entry.ceiling > 0,
    );

  const comparableCeiling = comparable.reduce((sum, entry) => sum + entry.ceiling, 0);

  if (totalCeiling <= 0 || comparableCeiling / totalCeiling < MIN_COMPARABLE_BUDGET_SHARE) {
    return {
      status: 'unavailable',
      deltaPercentagePoints: null,
      previousAsOf: previousAsOf.toISOString(),
      comparableProjectCount: comparable.length,
      totalProjectCount: bundles.length,
      explanation: `Không đủ dự án có lịch sử tiến độ trước ${windowDays} ngày (chỉ ${comparable.length}/${bundles.length} dự án, chưa tới 50% tổng ngân sách hiệu lực) để tính xu hướng đáng tin cậy.`,
    };
  }

  const currentRate =
    (comparable.reduce((sum, entry) => sum + entry.bundle.project.disbursedAmount, 0) /
      comparableCeiling) *
    100;
  const previousRate =
    (comparable.reduce((sum, entry) => sum + entry.previousDisbursed, 0) / comparableCeiling) * 100;

  return {
    status: 'ok',
    deltaPercentagePoints: currentRate - previousRate,
    previousAsOf: previousAsOf.toISOString(),
    comparableProjectCount: comparable.length,
    totalProjectCount: bundles.length,
    explanation: `So sánh trên ${comparable.length}/${bundles.length} dự án có dữ liệu tiến độ từ trước ${windowDays} ngày (dùng ngân sách hiệu lực hiện tại làm mẫu số chung cho cả hai kỳ).`,
  };
}
