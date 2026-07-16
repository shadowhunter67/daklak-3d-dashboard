import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
export type UnitType = 'xa' | 'phuong';
export interface WardProperties {
  code: string;
  name: string;
  type: UnitType;
  provinceCode: '66';
  areaKm2: number;
}
export type WardCollection = FeatureCollection<Polygon | MultiPolygon, WardProperties>;
export interface Metric {
  population: number;
  coverage: number;
  growth: number;
}
