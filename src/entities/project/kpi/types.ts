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

export function unavailableKpi(
  unit: string,
  missingInputs: string[],
  explanation: string,
  now: Date = new Date(),
): KpiResult {
  return {
    value: null,
    unit,
    status: 'unavailable',
    calculatedAt: now.toISOString(),
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
  now: Date = new Date(),
): KpiResult {
  return {
    value,
    unit,
    status: 'ok',
    calculatedAt: now.toISOString(),
    sourceDatasetIds,
    missingInputs: [],
    explanation,
  };
}
