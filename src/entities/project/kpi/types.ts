export type KpiStatus = 'ok' | 'unavailable';

/**
 * Chuẩn chung cho mọi KPI trong domain Project (spec: "Mỗi KPI phải chứa value, unit, status,
 * calculatedAt, sourceDatasetIds, missingInputs, explanation"). Khi thiếu input cần thiết,
 * `status: 'unavailable'` và `value: null` — KHÔNG BAO GIỜ trả về 0 để thay cho "không tính được".
 */
export interface KpiResult {
  value: number | null;
  unit: string;
  status: KpiStatus;
  calculatedAt: string;
  sourceDatasetIds: string[];
  missingInputs: string[];
  explanation: string;
}

/**
 * `asOf` là bắt buộc, không có giá trị mặc định — domain layer không được tự gọi `new Date()`
 * (Phase 1.5 hardening, xem docs/adr/0001-project-centric-domain.md). Caller ở lớp adapter/UI
 * (Phase 2A: `BundledProjectPortfolioSource`) chịu trách nhiệm cung cấp `asOf` mặc định rõ ràng
 * (ví dụ thời điểm request), để mọi phép tính KPI luôn deterministic và test được với ngày cố định.
 */
export function unavailableKpi(
  unit: string,
  missingInputs: string[],
  explanation: string,
  asOf: Date,
): KpiResult {
  return {
    value: null,
    unit,
    status: 'unavailable',
    calculatedAt: asOf.toISOString(),
    sourceDatasetIds: [],
    missingInputs,
    explanation,
  };
}

export function availableKpi(
  value: number,
  unit: string,
  sourceDatasetIds: string[],
  explanation: string,
  asOf: Date,
): KpiResult {
  return {
    value,
    unit,
    status: 'ok',
    calculatedAt: asOf.toISOString(),
    sourceDatasetIds,
    missingInputs: [],
    explanation,
  };
}
