import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../i18n/tests/renderWithI18n';
import { DataReadinessView } from './DataReadinessView';

describe('DataReadinessView', () => {
  afterEach(cleanup);

  it('hiện độ phủ hình ảnh địa phương thật: 0/102 có ảnh đã xác minh, không bịa 100%', async () => {
    renderWithI18n(<DataReadinessView onBackToOverview={vi.fn()} onOpenProject={vi.fn()} />);
    expect(await screen.findByText('0/102')).toBeTruthy();
    expect(screen.getByText('Độ phủ hình ảnh địa phương')).toBeTruthy();
    expect(screen.getByText(/102 đơn vị dùng bản đồ GIS/)).toBeTruthy();
  });
});
