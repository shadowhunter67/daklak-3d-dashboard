/**
 * Text-only planning/administrative document references (spec §2.3, §9) — no spatial geometry is
 * derived from these; a PDF/announcement never becomes a polygon just because it mentions an
 * area. See docs/public-data-sources.md for how each entry's verification status was determined.
 */
import type { DocumentReference } from '../schemas/dataset';

export const DOCUMENT_REFERENCES: readonly DocumentReference[] = [
  {
    id: 'quyhoach-daklak-dieu-chinh-2026',
    title: 'Điều chỉnh Quy hoạch tỉnh Đắk Lắk thời kỳ 2021-2030, tầm nhìn đến năm 2050',
    issuingAuthority: 'Chủ tịch UBND tỉnh Đắk Lắk',
    documentNumber: '1589/QĐ-UBND',
    issuedDate: '2026-05-29',
    legalStatus: 'in-effect',
    applicability:
      'Áp dụng toàn tỉnh Đắk Lắk — điều chỉnh nội dung Quy hoạch tỉnh thời kỳ 2021-2030, tầm nhìn đến năm 2050 đã được phê duyệt trước đó.',
    sourceUrl:
      'https://daklak.gov.vn/-/-ak-lak-cong-bo-ieu-chinh-quy-hoach-tinh-thoi-ky-2021-2030-tam-nhin-en-nam-2050',
    verificationStatus: 'verified',
    note: 'Xác nhận trực tiếp qua Cổng thông tin điện tử tỉnh Đắk Lắk (daklak.gov.vn) ngày 2026-07-22.',
  },
  {
    id: 'quyhoach-daklak-goc-2023',
    title: 'Quy hoạch tỉnh Đắk Lắk thời kỳ 2021-2030, tầm nhìn đến năm 2050 (quyết định gốc)',
    issuingAuthority: 'Thủ tướng Chính phủ',
    documentNumber: '1747/QĐ-TTg (chưa xác minh trực tiếp)',
    issuedDate: '2023-12-30',
    legalStatus: 'unknown',
    applicability: 'Toàn tỉnh Đắk Lắk (quyết định phê duyệt quy hoạch tỉnh lần đầu).',
    verificationStatus: 'research-needed',
    note: 'Chỉ biết qua kết quả tìm kiếm/tóm tắt của công cụ tìm kiếm, chưa tự xác nhận trực tiếp bằng cách tải trang nguồn (thuvienphapluat.vn trả về 403, chưa thử cổng công báo chính phủ). Cần một người xác minh số hiệu/ngày trước khi dùng làm căn cứ pháp lý.',
  },
];

export function getDocumentReference(id: string): DocumentReference | undefined {
  return DOCUMENT_REFERENCES.find((doc) => doc.id === id);
}
