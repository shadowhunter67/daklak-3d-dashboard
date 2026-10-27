import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../i18n/tests/renderWithI18n';

vi.mock('../../data/loadResearchedProjects', () => ({
  loadResearchedProjects: () =>
    Promise.resolve({
      schemaVersion: 1,
      generatedAt: '2026-09-29T00:00:00.000Z',
      sources: [],
      projects: [{ id: 'qd1985-pl1-001', name: 'Nhà máy điện gió thử nghiệm' }],
    }),
}));

import { PlanningHubView } from './PlanningHubView';

afterEach(cleanup);

function renderHub() {
  const handlers = { onBack: vi.fn(), onOpenCatalog: vi.fn(), onOpenOverlay: vi.fn() };
  renderWithI18n(<PlanningHubView {...handlers} />);
  return handlers;
}

describe('PlanningHubView', () => {
  it('nói rõ đây là văn bản được trích dẫn, không phải kết luận pháp lý', () => {
    renderHub();
    expect(screen.getByRole('heading', { level: 1, name: 'Trung tâm quy hoạch' })).toBeTruthy();
    expect(screen.getByText(/không phải kết luận về mức độ phù hợp quy hoạch/)).toBeTruthy();
  });

  it('bảng văn bản có số hiệu, cơ quan ban hành và số dự án trích dẫn', () => {
    renderHub();
    const table = screen.getByRole('table', { name: 'Văn bản quy hoạch được trích dẫn' });
    expect(within(table).getByText('768/QĐ-TTg')).toBeTruthy();
    expect(within(table).getAllByText('Thủ tướng Chính phủ').length).toBeGreaterThan(0);
  });

  it('lọc theo số hiệu, mở danh sách dự án trích dẫn và sang danh mục theo tên dự án', async () => {
    const { onOpenCatalog } = renderHub();
    fireEvent.change(screen.getByLabelText('Tìm số hiệu văn bản'), { target: { value: '768' } });
    const table = screen.getByRole('table', { name: 'Văn bản quy hoạch được trích dẫn' });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    fireEvent.click(within(table).getByRole('button', { name: /dự án/ }));
    fireEvent.click(
      await within(table).findByRole('button', { name: 'Nhà máy điện gió thử nghiệm' }),
    );
    expect(onOpenCatalog).toHaveBeenCalledWith('Nhà máy điện gió thử nghiệm');
  });

  it('lớp bản đồ quy hoạch được gắn nhãn minh họa và có nút mở', () => {
    const { onOpenOverlay } = renderHub();
    const region = screen.getByRole('region', { name: 'Lớp quy hoạch trên bản đồ' });
    expect(region).toHaveTextContent(/minh họa/);
    fireEvent.click(within(region).getByRole('button'));
    expect(onOpenOverlay).toHaveBeenCalled();
  });

  it('mục cần rà soát dùng ngôn ngữ trung tính, không nói xung đột pháp lý', () => {
    renderHub();
    const region = screen.getByRole('region', { name: 'Dự án cần rà soát quy hoạch' });
    expect(region).toHaveTextContent(/không phải kết luận xung đột pháp lý/);
  });

  it('số hiệu đã chuẩn hóa vẫn ghi lại cách nguồn viết, không tự khẳng định đúng pháp lý', () => {
    renderHub();
    fireEvent.change(screen.getByLabelText('Tìm số hiệu văn bản'), { target: { value: '945' } });
    expect(screen.getByText('nguồn ghi: 945/DQQ-UBND')).toBeTruthy();
  });

  it('có bảng thuật ngữ: Thông tin tham khảo / Nguồn trích dẫn / Cần rà soát / Chưa có ranh giới chính thức', () => {
    renderHub();
    const terms = screen.getByRole('region', { name: 'Cách đọc trang này' });
    for (const term of [
      'Thông tin tham khảo',
      'Nguồn trích dẫn',
      'Cần rà soát',
      'Chưa có ranh giới chính thức',
    ]) {
      expect(within(terms).getByText(term)).toBeTruthy();
    }
  });

  it('ranh giới quy hoạch: nói thẳng chưa có và không đưa kết luận phù hợp/xung đột', () => {
    renderHub();
    const region = screen.getByRole('region', { name: 'Ranh giới quy hoạch' });
    expect(region).toHaveTextContent('Chưa có ranh giới chính thức');
    expect(region).toHaveTextContent(/không đưa ra kết luận phù hợp hay xung đột/);
  });

  it('không dùng ngôn ngữ pháp lý: vi phạm, xung đột pháp lý, không phù hợp quy hoạch chỉ xuất hiện trong câu phủ định', () => {
    const { container } = renderWithI18n(
      <PlanningHubView onBack={vi.fn()} onOpenCatalog={vi.fn()} onOpenOverlay={vi.fn()} />,
    );
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/vi phạm quy hoạch/i);
    expect(text).not.toMatch(/không phù hợp quy hoạch/i);
  });
});
