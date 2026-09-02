import { describe, expect, it } from 'vitest';
import { escapeHtml, keyProjectPopupHtml } from './keyProjectPopup';

describe('escapeHtml', () => {
  it('neutralises the HTML metacharacters', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">&\'')).toBe(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;',
    );
  });
});

describe('keyProjectPopupHtml', () => {
  const base = {
    name: 'Cao tốc X',
    category: 'giao-thong-quoc-gia',
    status: 'dang-thi-cong',
    summary: 'Đang thi công.',
    sourceUrl: 'https://baochinhphu.vn/abc',
    sourceLabel: 'Báo Chính phủ',
    sourceDate: '2026-03',
  };

  it('renders name, status label, a real source link and the approximate-location caveat', () => {
    const html = keyProjectPopupHtml(base);
    expect(html).toContain('Cao tốc X');
    expect(html).toContain('Đang thi công');
    expect(html).toContain('href="https://baochinhphu.vn/abc"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toMatch(/gần đúng/);
  });

  it('escapes hostile text and drops a non-https source href', () => {
    const html = keyProjectPopupHtml({
      ...base,
      name: '<script>evil()</script>',
      sourceUrl: 'javascript:alert(1)',
    });
    expect(html).not.toContain('<script>evil()');
    expect(html).toContain('&lt;script&gt;evil()');
    expect(html).not.toContain('javascript:alert(1)');
    expect(html).not.toContain('key-project-popup__source');
  });

  it('tolerates missing/garbage properties without throwing', () => {
    expect(() => keyProjectPopupHtml({})).not.toThrow();
    expect(() => keyProjectPopupHtml({ name: 42 as unknown })).not.toThrow();
  });
});
