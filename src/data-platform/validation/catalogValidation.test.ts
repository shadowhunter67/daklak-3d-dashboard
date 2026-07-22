import { describe, expect, it } from 'vitest';
import type { DatasetDescriptor } from '../schemas/dataset';
import type { IndicatorDefinition, IndicatorObservation } from '../schemas/indicator';
import type { MapLayerDescriptor } from '../schemas/layer';
import { DEFAULT_ACCESS_POLICIES } from '../policies/defaultPolicies';
import { catalogValidationIssues, validateCatalog } from './catalogValidation';

function makeDataset(overrides: Partial<DatasetDescriptor> = {}): DatasetDescriptor {
  return {
    id: 'ds-1',
    title: 'Dataset 1',
    description: 'test',
    domain: 'other',
    classification: 'public',
    authority: 'illustrative',
    publicationStatus: 'published',
    administrativeLevel: 'commune',
    temporalResolution: 'static',
    spatialRepresentation: 'none',
    source: { organization: 'test' },
    version: '1.0.0',
    checksum: 'abc',
    quality: { status: 'unverified', knownLimitations: [] },
    access: { delivery: 'bundled-static', requiresAuthentication: false },
    ...overrides,
  };
}

describe('validateCatalog', () => {
  it('passes for the real catalog wired into the app', () => {
    expect(catalogValidationIssues).toEqual([]);
  });

  it('flags duplicate dataset ids', () => {
    const issues = validateCatalog({
      datasets: [makeDataset({ id: 'dup' }), makeDataset({ id: 'dup' })],
      indicatorDefinitions: [],
      indicatorObservations: [],
      layers: [],
      policies: DEFAULT_ACCESS_POLICIES,
    });
    expect(issues.some((issue) => issue.includes('Trùng dataset id'))).toBe(true);
  });

  it('flags an indicator referencing a missing dataset', () => {
    const definition: IndicatorDefinition = {
      code: 'x',
      name: 'X',
      description: '',
      domain: 'other',
      unit: '',
      valueType: 'integer',
      aggregation: 'none',
      sourceDatasetId: 'missing-dataset',
      allowedAdministrativeLevels: ['commune'],
    };
    const issues = validateCatalog({
      datasets: [],
      indicatorDefinitions: [definition],
      indicatorObservations: [],
      layers: [],
      policies: DEFAULT_ACCESS_POLICIES,
    });
    expect(issues.some((issue) => issue.includes('missing-dataset'))).toBe(true);
  });

  it('flags a province-level observation on a commune-only indicator (no silent province-to-commune assignment)', () => {
    const dataset = makeDataset();
    const definition: IndicatorDefinition = {
      code: 'commune-only',
      name: 'Commune only',
      description: '',
      domain: 'other',
      unit: '',
      valueType: 'integer',
      aggregation: 'none',
      sourceDatasetId: dataset.id,
      allowedAdministrativeLevels: ['commune'],
    };
    const observation: IndicatorObservation = {
      indicatorCode: 'commune-only',
      administrativeCode: '66',
      administrativeLevel: 'province',
      period: '2025',
      value: 1,
      status: 'official',
      sourceDatasetId: dataset.id,
    };
    const issues = validateCatalog({
      datasets: [dataset],
      indicatorDefinitions: [definition],
      indicatorObservations: [observation],
      layers: [],
      policies: DEFAULT_ACCESS_POLICIES,
    });
    expect(issues.some((issue) => issue.includes('administrativeLevel'))).toBe(true);
  });

  it('flags NaN/Infinity observation values', () => {
    const dataset = makeDataset();
    const definition: IndicatorDefinition = {
      code: 'c',
      name: 'C',
      description: '',
      domain: 'other',
      unit: '',
      valueType: 'integer',
      aggregation: 'none',
      sourceDatasetId: dataset.id,
      allowedAdministrativeLevels: ['commune'],
    };
    const observation: IndicatorObservation = {
      indicatorCode: 'c',
      administrativeCode: '00001',
      administrativeLevel: 'commune',
      period: '2025',
      value: Number.POSITIVE_INFINITY,
      status: 'illustrative',
      sourceDatasetId: dataset.id,
    };
    const issues = validateCatalog({
      datasets: [dataset],
      indicatorDefinitions: [definition],
      indicatorObservations: [observation],
      layers: [],
      policies: DEFAULT_ACCESS_POLICIES,
    });
    expect(issues.some((issue) => issue.includes('NaN/Infinity'))).toBe(true);
  });

  it('accepts a null observation value as a valid "missing" marker', () => {
    const dataset = makeDataset();
    const definition: IndicatorDefinition = {
      code: 'c',
      name: 'C',
      description: '',
      domain: 'other',
      unit: '',
      valueType: 'integer',
      aggregation: 'none',
      sourceDatasetId: dataset.id,
      allowedAdministrativeLevels: ['commune'],
    };
    const observation: IndicatorObservation = {
      indicatorCode: 'c',
      administrativeCode: '00001',
      administrativeLevel: 'commune',
      period: '2025',
      value: null,
      status: 'missing',
      sourceDatasetId: dataset.id,
    };
    const issues = validateCatalog({
      datasets: [dataset],
      indicatorDefinitions: [definition],
      indicatorObservations: [observation],
      layers: [],
      policies: DEFAULT_ACCESS_POLICIES,
    });
    expect(issues).toEqual([]);
  });

  it('rejects a non-HTTPS, non-internal source URL', () => {
    const dataset = makeDataset({
      source: { organization: 'x', sourceUrl: 'http://example.com/data' },
    });
    const issues = validateCatalog({
      datasets: [dataset],
      indicatorDefinitions: [],
      indicatorObservations: [],
      layers: [],
      policies: DEFAULT_ACCESS_POLICIES,
    });
    expect(issues.some((issue) => issue.includes('HTTPS'))).toBe(true);
  });

  it('requires either a checksum or a documented reason for its absence', () => {
    const dataset = makeDataset({
      checksum: undefined,
      quality: { status: 'unverified', knownLimitations: [] },
    });
    const issues = validateCatalog({
      datasets: [dataset],
      indicatorDefinitions: [],
      indicatorObservations: [],
      layers: [],
      policies: DEFAULT_ACCESS_POLICIES,
    });
    expect(issues.some((issue) => issue.includes('checksum'))).toBe(true);
  });

  it('flags a bundled-static dataset that is not classification:public as a leakage risk', () => {
    const dataset = makeDataset({
      classification: 'internal',
      access: { delivery: 'bundled-static', requiresAuthentication: false },
    });
    const issues = validateCatalog({
      datasets: [dataset],
      indicatorDefinitions: [],
      indicatorObservations: [],
      layers: [],
      policies: DEFAULT_ACCESS_POLICIES,
    });
    expect(issues.some((issue) => issue.includes('RÒ RỈ DỮ LIỆU'))).toBe(true);
  });

  it('flags a layer referencing a missing dataset or access policy', () => {
    const layer: MapLayerDescriptor = {
      id: 'layer-1',
      title: 'Layer 1',
      group: 'test',
      datasetId: 'missing-dataset',
      renderer: 'maplibre',
      defaultVisible: true,
      accessPolicyId: 'missing-policy',
      availability: 'available',
    };
    const issues = validateCatalog({
      datasets: [],
      indicatorDefinitions: [],
      indicatorObservations: [],
      layers: [layer],
      policies: DEFAULT_ACCESS_POLICIES,
    });
    expect(issues.some((issue) => issue.includes('missing-dataset'))).toBe(true);
    expect(issues.some((issue) => issue.includes('missing-policy'))).toBe(true);
  });
});
