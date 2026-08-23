/**
 * Domain model cho các điểm đến du lịch Đắk Lắk hiển thị trong `?view=world` (Phase T2, xem
 * reports/tourism-digital-twin/phase-status.md). Tách biệt hoàn toàn khỏi `src/entities/project/*`
 * (domain "dự án trọng điểm", xem docs/adr/0001-project-centric-domain.md) — đây là một domain
 * khác (điểm đến du lịch, không phải dự án đầu tư công), dù vay mượn cùng "hình dạng" provenance
 * (sourceUrl/confidence/verificationStatus/dataOwner) cho nhất quán quy ước toàn repo.
 *
 * Tái dùng trực tiếp `DataConfidence`/`VerificationStatus` từ `src/entities/project/types.ts` —
 * hai khái niệm ("độ tin cậy dữ liệu", "trạng thái xác minh") là chung cho mọi domain có provenance
 * trong repo này, tạo union riêng cho tourism sẽ là hai nguồn sự thật cho cùng một khái niệm.
 */
import type { DataConfidence, VerificationStatus } from '../project/types';

export { DATA_CONFIDENCE_LEVELS, VERIFICATION_STATUSES } from '../project/types';
export type { DataConfidence, VerificationStatus } from '../project/types';

/**
 * Đóng, chỉ đủ cho 4 điểm đến đã xác minh nguồn ở T2 — KHÔNG mở rộng suy đoán cho các ứng viên
 * chưa có toạ độ xác minh (xem reports/tourism-digital-twin/phase-status.md, mục "Rejected/deferred
 * candidates"). Mở rộng union này chỉ khi có một điểm đến mới thực sự có nguồn toạ độ xác minh.
 */
export const TOURISM_DESTINATION_CATEGORIES = [
  'lake',
  'national-park',
  'waterfall',
  'cultural-village',
] as const;
export type TourismDestinationCategory = (typeof TOURISM_DESTINATION_CATEGORIES)[number];

/**
 * Giấy phép ảnh minh hoạ — chỉ các giấy phép tự do thực sự đã xác minh trên Wikimedia Commons cho
 * 2/4 điểm đến ở T2 (xem verifiedTourismDestinations.ts). Không có "unknown"/"unlicensed" trong
 * union này một cách cố ý: nếu chưa xác minh giấy phép, field ảnh phải vắng mặt hoàn toàn
 * (`imageUrl` optional), không gán license giả.
 */
export const TOURISM_IMAGE_LICENSES = ['CC BY-SA 3.0', 'GFDL'] as const;
export type TourismImageLicense = (typeof TOURISM_IMAGE_LICENSES)[number];

export interface TourismDestination {
  id: string;
  name: string;
  category: TourismDestinationCategory;
  description: string;
  /** [longitude, latitude], WGS84 — cùng thứ tự với `ProjectPointGeometry.coordinates`
   * (src/entities/project/types.ts) và `projection()` trong src/utils/geo.ts. */
  coordinates: [number, number];
  /** Bắt buộc — https URL trỏ tới nguồn đã xác minh (Wikipedia/Wikidata). Đây là toàn bộ lý do tồn
   * tại của module này: không có nguồn thì không có điểm đến. */
  sourceUrl: string;
  /** Chỉ có mặt cho các điểm đến đã xác minh có ảnh tự do trên Wikimedia Commons — KHÔNG dùng ảnh
   * placeholder khi chưa xác minh (xem phase-status.md). */
  imageUrl?: string;
  imageAttribution?: string;
  imageLicense?: TourismImageLicense;
  confidence: DataConfidence;
  verificationStatus: VerificationStatus;
  dataOwner: string;
}
