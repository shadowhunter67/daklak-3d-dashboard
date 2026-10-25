import { describe, expect, it } from 'vitest';
import { tourismPopupHtml } from './tourismPopup';

describe('tourismPopupHtml', () => {
  it('hiện tên, loại hình và link nguồn https, escape HTML', () => {
    const html = tourismPopupHtml({
      name: 'Hồ <Lắk>',
      category: 'lake',
      sourceUrl: 'https://vi.wikipedia.org/wiki/H%E1%BB%93_L%E1%BA%AFk',
    });
    expect(html).toContain('Hồ &lt;Lắk&gt;');
    expect(html).toContain('href="https://vi.wikipedia.org/wiki/H%E1%BB%93_L%E1%BA%AFk"');
    expect(html).toContain('noopener noreferrer');
  });

  it('không tạo link khi nguồn không phải https và không bịa lượt khách', () => {
    const html = tourismPopupHtml({ name: 'A', category: 'waterfall', sourceUrl: 'javascript:x' });
    expect(html).not.toContain('href=');
    expect(html).toContain('Chưa có số liệu lượt khách');
  });
});
