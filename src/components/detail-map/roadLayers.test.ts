import { describe, expect, it } from 'vitest';
import labels from '#province-assets/daklak-labels.json';
import { HAMLET_LABELS_LAYER_ID, PLACE_LABELS_LAYER_ID, buildLabelLayers } from './roadLayers';

const wardNames = Object.values(labels as Record<string, { name: string }>).map((l) => l.name);

describe('buildLabelLayers', () => {
  it('nhãn địa danh OSM loại trừ mọi tên xã/phường để không trùng nhãn tên đơn vị hành chính', () => {
    const layer = buildLabelLayers().find((l) => l.id === PLACE_LABELS_LAYER_ID)!;
    const text = JSON.stringify((layer as { filter?: unknown }).filter);
    for (const name of wardNames) expect(text).toContain(JSON.stringify(name).slice(1, -1));
    // Dạng "không thuộc danh sách" — nếu đảo điều kiện thì mọi nhãn OSM sẽ biến mất.
    expect(text).toContain('"!"');
  });

  it('nhãn địa danh OSM chỉ hiện khi đã phóng gần (minzoom >= 11) để không đè nhãn tên đơn vị', () => {
    const layer = buildLabelLayers().find((l) => l.id === PLACE_LABELS_LAYER_ID)!;
    expect(layer.minzoom).toBeGreaterThanOrEqual(11);
  });

  it('nhãn thôn/buôn không bị loại theo tên xã/phường', () => {
    const layer = buildLabelLayers().find((l) => l.id === HAMLET_LABELS_LAYER_ID)!;
    expect(JSON.stringify((layer as { filter?: unknown }).filter)).not.toContain('Ea Drăng');
  });
});
