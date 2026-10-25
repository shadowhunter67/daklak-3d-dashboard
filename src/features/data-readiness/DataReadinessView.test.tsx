import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import labels from '#province-assets/daklak-labels.json';
import { ADMIN_UNIT_MEDIA } from '../../data/adminUnitMedia';
import { renderWithI18n } from '../../i18n/tests/renderWithI18n';
import { DataReadinessView } from './DataReadinessView';

describe('DataReadinessView', () => {
  afterEach(cleanup);

  it('hiện độ phủ hình ảnh địa phương thật (đếm từ dữ liệu), không bịa 100%', async () => {
    const total = Object.keys(labels).length;
    const verified = new Set(ADMIN_UNIT_MEDIA.map((m) => m.administrativeUnitCode)).size;
    expect(verified).toBeGreaterThan(0);
    expect(verified).toBeLessThan(total);
    renderWithI18n(<DataReadinessView onBackToOverview={vi.fn()} onOpenProject={vi.fn()} />);
    expect(await screen.findByText(`${verified}/${total}`)).toBeTruthy();
    expect(screen.getByText('Độ phủ hình ảnh địa phương')).toBeTruthy();
    expect(screen.getByText(new RegExp(`${total - verified} đơn vị dùng bản đồ GIS`))).toBeTruthy();
  });
});
