import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import labels from '#province-assets/daklak-labels.json';
import { ADMIN_UNIT_MEDIA } from '../../data/adminUnitMedia';
import {
  PLANNING_DOCUMENTS,
  PLANNING_REVIEW_PROJECT_IDS,
  PLANNING_TOTAL_PROJECTS,
  PLANNING_UNCITED_PROJECT_IDS,
} from '../../data/planningCitations';
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

  it('mặc định chế độ Đơn giản: 4 con số về nguồn đếm từ dữ liệu thật, chưa hiện bảng kỹ thuật', async () => {
    renderWithI18n(<DataReadinessView onBackToOverview={vi.fn()} onOpenProject={vi.fn()} />);
    const region = await screen.findByRole('region', {
      name: /Nguồn của \d+ dự án thu hút đầu tư/,
    });
    const cited = new Set(PLANNING_DOCUMENTS.flatMap((d) => d.projectIds)).size;
    expect(within(region).getByText('Đã có nguồn').closest('li')).toHaveTextContent(String(cited));
    expect(within(region).getByText('Cần xác minh').closest('li')).toHaveTextContent(
      String(PLANNING_REVIEW_PROJECT_IDS.length),
    );
    expect(within(region).getByText('Thiếu nguồn').closest('li')).toHaveTextContent(
      String(PLANNING_UNCITED_PROJECT_IDS.length),
    );
    expect(PLANNING_TOTAL_PROJECTS).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Đơn giản' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.queryByText('Danh mục nguồn')).toBeNull();
  });

  it('chế độ Kỹ thuật mở danh mục nguồn, bảng cảnh báo và chi tiết truy xuất', async () => {
    renderWithI18n(<DataReadinessView onBackToOverview={vi.fn()} onOpenProject={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Kỹ thuật' }));
    expect(screen.getByRole('button', { name: 'Kỹ thuật' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('Danh mục nguồn')).toBeTruthy();
  });
});
