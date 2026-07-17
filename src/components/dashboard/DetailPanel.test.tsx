import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import wards from '../../assets/maps/daklak/daklak-wards-render.json';
import { useMapStore } from '../../stores/mapStore';
import type { WardCollection } from '../../types/map';
import { normalizeDisplayName, splitDisplayNameWords } from '../../utils/displayName';
import { DetailPanel } from './DetailPanel';

const data = wards as WardCollection;
const namesToCheck = [
  'Liên Sơn Lắk',
  'Buôn Ma Thuột',
  "Cư M'gar",
  "Cư M'ta",
  'Krông Ana',
  'Đắk Liêng',
];

describe('DetailPanel unit names', () => {
  beforeEach(() => useMapStore.setState({ selectedCode: '24580', hoveredCode: null }));

  it('normalizes the selected source name to NFC without changing its text', () => {
    const sourceName = data.features.find(({ properties }) => properties.code === '24580')!
      .properties.name;
    expect(sourceName).toBe('Liên Sơn Lắk');
    expect(normalizeDisplayName(sourceName)).toBe('Liên Sơn Lắk');
    expect(normalizeDisplayName(sourceName)).toBe(
      normalizeDisplayName(sourceName).normalize('NFC'),
    );

    render(<DetailPanel />);
    const heading = screen.getByRole('heading', { name: sourceName });
    expect(heading).toHaveTextContent(sourceName);
    expect(heading.textContent).toBe(sourceName);
    expect(heading).toHaveAttribute('data-source-name', sourceName);
  });

  it.each(namesToCheck)('keeps every word in %s intact', (name) => {
    const words = splitDisplayNameWords(name);
    expect(words.join(' ')).toBe(name.normalize('NFC'));
    expect(words).not.toContain('');
    for (const word of words) expect(word).not.toMatch(/\s/u);
  });
});
