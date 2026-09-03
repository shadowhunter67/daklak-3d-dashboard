import { describe, expect, it } from 'vitest';
import { planningZonePopupHtml } from './planningZonePopup';

describe('planningZonePopupHtml', () => {
  const base = {
    name: 'Khu công nghiệp Thử Nghiệm',
    kind: 'Khu công nghiệp',
    summary: '~300 ha, xã X.',
    sourceUrl: 'https://example.gov.vn/kcn-thu-nghiem',
    sourceLabel: 'Ban QL KCN',
    sourceDate: '2025',
  };

  it('renders name, kind, source link and the schematic-boundary caveat', () => {
    const html = planningZonePopupHtml(base);
    expect(html).toContain('Khu công nghiệp Thử Nghiệm');
    expect(html).toContain('Khu công nghiệp');
    expect(html).toContain('href="https://example.gov.vn/kcn-thu-nghiem"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toMatch(/không phải ranh địa chính/);
  });

  it('escapes hostile input and drops a non-https source', () => {
    const html = planningZonePopupHtml({
      ...base,
      name: '<img src=x onerror=alert(1)>',
      sourceUrl: 'javascript:alert(1)',
    });
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('javascript:alert(1)');
  });

  it('tolerates missing properties', () => {
    expect(() => planningZonePopupHtml({})).not.toThrow();
  });
});
