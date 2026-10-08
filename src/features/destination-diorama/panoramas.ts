/**
 * Ảnh 360° (equirectangular) THẬT của từng điểm đến, xem được trong diorama bằng bộ xem toàn cảnh.
 * Đây là đường duy nhất cho cảnh "đúng từng chi tiết theo mọi hướng": cảnh dựng thủ tục không đạt được.
 *
 * Mỗi mục là một file trong `public/panoramas/` (cùng origin, hợp CSP `img-src 'self'`). Khi chưa có
 * ảnh 360° giấy phép tự do cho một điểm đến thì KHÔNG có mục — giao diện không hiện nút 360°, không
 * dựng ảnh giả. Cách thêm: docs/destination-diorama.md ("Thêm ảnh 360°").
 */
export interface PanoramaSource {
  /** Tên file trong `public/panoramas/` (tỉ lệ 2:1, ≤ 4096 px chiều ngang, JPEG). */
  file: string;
  /** Tác giả/đơn vị chụp, hiện ngay trong bộ xem. */
  attribution: string;
  /** Giấy phép (vd "CC BY-SA 4.0") hoặc "Được phép sử dụng" kèm ghi chú nguồn cấp phép. */
  license: string;
  /** Trang gốc của ảnh để bên thứ ba kiểm chứng. */
  sourceUrl: string;
}

export const DESTINATION_PANORAMAS: Record<string, PanoramaSource> = {};

export function destinationPanorama(id: string): PanoramaSource | undefined {
  return DESTINATION_PANORAMAS[id];
}

export function panoramaUrl(file: string): string {
  return `${import.meta.env.BASE_URL}panoramas/${file}`;
}
