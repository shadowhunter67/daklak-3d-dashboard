/**
 * Text-only planning/administrative document references (spec §2.3, §9) — no spatial geometry is
 * derived from these; a PDF/announcement never becomes a polygon just because it mentions an
 * area. See docs/public-data-sources.md for how each entry's verification status was determined.
 */
import type { DocumentReference } from '../schemas/dataset';

export const DOCUMENT_REFERENCES: readonly DocumentReference[] = [
  {
    id: 'quyhoach-daklak-goc-2023',
    title: 'Phê duyệt Quy hoạch tỉnh Đắk Lắk thời kỳ 2021-2030, tầm nhìn đến năm 2050',
    issuingAuthority: 'Thủ tướng Chính phủ',
    documentNumber: '1747/QĐ-TTg',
    issuedDate: '2023-12-30',
    legalStatus: 'in-effect',
    applicability: 'Toàn tỉnh Đắk Lắk — quyết định phê duyệt quy hoạch tỉnh lần đầu.',
    sourceUrl: 'https://vanban.chinhphu.vn/?pageid=27160&docid=209350&classid=0',
    verificationStatus: 'verified',
    evidenceLevel: 'official-primary-document',
    note: 'Xác nhận trực tiếp trên Cổng Thông tin điện tử Chính phủ (vanban.chinhphu.vn), có file văn bản gốc đính kèm; người ký: Trần Hồng Hà. Kiểm tra ngày 2026-07-22.',
  },
  {
    id: 'quyhoach-daklak-dieu-chinh-2026',
    title: 'Điều chỉnh Quy hoạch tỉnh Đắk Lắk thời kỳ 2021-2030, tầm nhìn đến năm 2050',
    issuingAuthority: 'Chủ tịch UBND tỉnh Đắk Lắk',
    documentNumber: '1589/QĐ-UBND',
    issuedDate: '2026-05-29',
    legalStatus: 'in-effect',
    applicability:
      'Áp dụng toàn tỉnh Đắk Lắk — điều chỉnh nội dung Quy hoạch tỉnh thời kỳ 2021-2030, tầm nhìn đến năm 2050 đã được phê duyệt trước đó (xem quyhoach-daklak-goc-2023).',
    sourceUrl:
      'https://daklak.gov.vn/-/-ak-lak-cong-bo-ieu-chinh-quy-hoach-tinh-thoi-ky-2021-2030-tam-nhin-en-nam-2050',
    verificationStatus: 'verified',
    evidenceLevel: 'official-publication-reference',
    note: 'Xác nhận sự tồn tại và metadata (số hiệu/ngày/cơ quan) qua bài công bố chính thức trên Cổng thông tin điện tử tỉnh Đắk Lắk (daklak.gov.vn), tự tải trang ngày 2026-07-22. Chưa có link tới văn bản gốc/file ký số của quyết định này — vì vậy evidenceLevel là publication-reference, không phải primary-document.',
  },
];

export function getDocumentReference(id: string): DocumentReference | undefined {
  return DOCUMENT_REFERENCES.find((doc) => doc.id === id);
}
