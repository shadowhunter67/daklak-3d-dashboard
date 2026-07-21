import { describe, expect, it } from 'vitest';
import { layoutAdministrativeLabels } from './administrativeLabelLayout';

const identityProject = (longitude: number, latitude: number): [number, number] => [
  longitude,
  latitude,
];

describe('layoutAdministrativeLabels', () => {
  const labels = {
    '24580': { name: 'Lien Son Lak', longitude: 10, latitude: 10, priority: 2 },
    '24000': { name: 'Buon Ma Thuot', longitude: 20, latitude: 0, priority: 1 },
  };

  it('maps geographic coordinates into canvas pixel space', () => {
    const [draw] = layoutAdministrativeLabels(
      { a: { name: 'A', longitude: 5, latitude: 5, priority: 1 } },
      null,
      identityProject,
      100,
      100,
      [0, 0],
      10,
      10,
    );
    expect(draw.x).toBe(50);
    expect(draw.y).toBe(50);
  });

  it('emphasizes the selected code with a bigger, bolder, gold label', () => {
    const draws = layoutAdministrativeLabels(
      labels,
      '24580',
      identityProject,
      100,
      100,
      [0, 0],
      100,
      100,
    );
    const selected = draws.find((draw) => draw.code === '24580')!;
    const other = draws.find((draw) => draw.code === '24000')!;
    expect(selected.fontSize).toBe(13);
    expect(selected.fontWeight).toBe(700);
    expect(selected.fillStyle).toBe('#ffe49a');
    expect(other.fontSize).toBe(10); // priority 1, not selected
    expect(other.fontWeight).toBe(600);
    expect(other.fillStyle).toBe('#f3f0d8');
  });

  it('gives lower priority (higher number) labels the smallest font when unselected', () => {
    const [draw] = layoutAdministrativeLabels(
      { a: { name: 'A', longitude: 0, latitude: 0, priority: 2 } },
      null,
      identityProject,
      100,
      100,
      [0, 0],
      100,
      100,
    );
    expect(draw.fontSize).toBe(8);
  });

  it('normalizes text to NFC form', () => {
    const composed = 'é'; // "é" as a single precomposed code point
    const decomposed = composed.normalize('NFD'); // "e" + combining acute accent
    expect(decomposed).not.toBe(composed);
    const [draw] = layoutAdministrativeLabels(
      { a: { name: decomposed, longitude: 0, latitude: 0, priority: 1 } },
      null,
      identityProject,
      100,
      100,
      [0, 0],
      100,
      100,
    );
    expect(draw.text).toBe(composed);
  });
});
