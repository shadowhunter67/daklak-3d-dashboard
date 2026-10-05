import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithI18n as render } from '../../i18n/tests/renderWithI18n';
import { verifiedTourismDestinations } from '../../entities/tourism/verifiedTourismDestinations';
import { DIORAMA_BASIS } from './dioramaConfig';

// jsdom không có WebGL: ép nhánh "không hỗ trợ" để test shell (panel, nguồn, cơ sở dựng, chọn điểm).
vi.mock('../../components/map/webglLifecycle', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../components/map/webglLifecycle')>()),
  hasWebGLSupport: () => false,
}));

import { DestinationDioramaView } from './DestinationDioramaView';

describe('DestinationDioramaView', () => {
  afterEach(cleanup);

  it('shows the destination facts, its source link and a labelled basis note', () => {
    render(
      <DestinationDioramaView destinationId="ganh-da-dia" onBack={vi.fn()} onSelect={vi.fn()} />,
    );
    const destination = verifiedTourismDestinations.find((d) => d.id === 'ganh-da-dia')!;
    // Tên xuất hiện cả ở tiêu đề panel lẫn trong ô chọn điểm đến.
    expect(screen.getAllByText(destination.name).length).toBeGreaterThan(1);
    expect(screen.getByRole('link', { name: /nguồn dữ kiện/i })).toHaveAttribute(
      'href',
      destination.sourceUrl,
    );
    expect(screen.getByRole('link', { name: /ảnh thực tế/i })).toHaveAttribute(
      'href',
      destination.imageUrl,
    );
    expect(screen.getByText(/dựng theo ảnh thực tế đã dẫn/i)).toHaveAttribute(
      'data-basis',
      'photo',
    );
  });

  it('says plainly when a scene is built from text only', () => {
    render(
      <DestinationDioramaView destinationId="thac-gia-long" onBack={vi.fn()} onSelect={vi.fn()} />,
    );
    expect(DIORAMA_BASIS['thac-gia-long']).toBe('text');
    expect(screen.getByText(/chưa đối chiếu được ảnh thực tế/i)).toHaveAttribute(
      'data-basis',
      'text',
    );
    expect(screen.queryByRole('link', { name: /ảnh thực tế/i })).not.toBeInTheDocument();
  });

  it('lists every destination in the picker and reports the chosen one', () => {
    const onSelect = vi.fn();
    render(<DestinationDioramaView destinationId="ho-lak" onBack={vi.fn()} onSelect={onSelect} />);
    const picker = screen.getByRole('combobox', { name: /chuyển sang điểm đến khác/i });
    expect(picker.querySelectorAll('option')).toHaveLength(verifiedTourismDestinations.length);
    fireEvent.change(picker, { target: { value: 'thap-nhan' } });
    expect(onSelect).toHaveBeenCalledWith('thap-nhan');
  });

  it('falls back with a way back for an unknown destination', () => {
    const onBack = vi.fn();
    render(<DestinationDioramaView destinationId="khong-co" onBack={onBack} onSelect={vi.fn()} />);
    expect(screen.getByText(/chưa có diorama/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /về tổng quan điều hành/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
