export type MapRenderer = 'three' | 'maplibre' | 'table' | 'chart';

export type LayerGeometryType = 'point' | 'line' | 'polygon' | 'raster' | 'vector-tile';

export type LayerAvailability =
  'available' | 'not-configured' | 'loading' | 'degraded' | 'unavailable';

export interface LegendEntry {
  label: string;
  color?: string;
  symbol?: string;
}

export interface LegendDefinition {
  title: string;
  entries: LegendEntry[];
}

export interface MapLayerDescriptor {
  id: string;
  title: string;
  group: string;
  datasetId: string;
  renderer: MapRenderer;
  geometryType?: LayerGeometryType;
  defaultVisible: boolean;
  minZoom?: number;
  maxZoom?: number;
  legend?: LegendDefinition;
  accessPolicyId: string;
  /** Computed by catalog/layers.ts from live source availability, not hand-maintained per entry. */
  availability: LayerAvailability;
}
