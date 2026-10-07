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
    expect(screen.getByText(/dựng theo ảnh thực tế \(xem ảnh đối chiếu\)/i)).toHaveAttribute(
      'data-basis',
      'photo',
    );
  });

  it('shows the real photo next to the scene with attribution and licence, and lets it be enlarged', () => {
    render(
      <DestinationDioramaView destinationId="ganh-da-dia" onBack={vi.fn()} onSelect={vi.fn()} />,
    );
    const destination = verifiedTourismDestinations.find((d) => d.id === 'ganh-da-dia')!;
    const image = screen.getByRole('img', { name: /ảnh thực tế của gành đá đĩa/i });
    expect(image).toHaveAttribute(
      'src',
      expect.stringContaining('images/destinations/ganh-da-dia.jpg'),
    );
    expect(screen.getByText(destination.imageAttribution!, { exact: false })).toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: /phóng to ảnh thực tế/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: /thu nhỏ ảnh thực tế/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('says plainly when a scene is built from text only and has no photo to compare', () => {
    render(
      <DestinationDioramaView destinationId="thac-thuy-tien" onBack={vi.fn()} onSelect={vi.fn()} />,
    );
    expect(DIORAMA_BASIS['thac-thuy-tien']).toBe('text');
    expect(screen.getByText(/chưa đối chiếu được ảnh thực tế/i)).toHaveAttribute(
      'data-basis',
      'text',
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /ảnh thực tế/i })).not.toBeInTheDocument();
  });

  it('says the scene was not adjusted to the photo when a text-built scene has a comparison photo', () => {
    render(
      <DestinationDioramaView destinationId="thac-gia-long" onBack={vi.fn()} onSelect={vi.fn()} />,
    );
    expect(DIORAMA_BASIS['thac-gia-long']).toBe('text');
    expect(screen.getByText(/chưa được chỉnh theo ảnh này/i)).toHaveAttribute('data-basis', 'text');
    expect(screen.getByRole('img', { name: /ảnh thực tế của thác gia long/i })).toBeInTheDocument();
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
