import type { AdministrativeLevel } from './dataset';

export type IndicatorValueType = 'integer' | 'decimal' | 'percentage' | 'currency' | 'index';

export type IndicatorAggregation = 'sum' | 'average' | 'weighted-average' | 'latest' | 'none';

export interface IndicatorDefinition {
  code: string;
  name: string;
  description: string;
  domain: string;
  unit: string;
  valueType: IndicatorValueType;
  aggregation: IndicatorAggregation;
  methodology?: string;
  numeratorIndicator?: string;
  denominatorIndicator?: string;
  sourceDatasetId: string;
  /** Restricted to 'province' | 'commune' on purpose: an indicator must not silently apply to
   * a level its source data was never verified at (see catalogValidation's level check). */
  allowedAdministrativeLevels: Array<Extract<AdministrativeLevel, 'province' | 'commune'>>;
}

export type IndicatorObservationStatus =
  'official' | 'provisional' | 'estimated' | 'illustrative' | 'missing';

export interface IndicatorObservation {
  indicatorCode: string;
  administrativeCode: string;
  administrativeLevel: Extract<AdministrativeLevel, 'province' | 'commune'>;
  period: string;
  /** null (not 0) for missing — see spec §3.2. */
  value: number | null;
  status: IndicatorObservationStatus;
  sourceDatasetId: string;
  revision?: number;
  updatedAt?: string;
  note?: string;
}
