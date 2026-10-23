import type { UnitMedia } from '../features/unit-profile/model/unitProfileModel';

/**
 * Ảnh đại diện từng xã/phường. HIỆN RỖNG có chủ đích: chưa có ảnh nào vừa (a) nêu rõ đúng địa danh
 * trong mô tả/danh mục của nguồn, (b) có license dùng lại được và (c) có file cục bộ (CSP chỉ cho
 * `img-src 'self'`). Ứng viên chưa đủ điều kiện được ghi ở `reports/research/administrative-unit-media.*`
 * với `usage: 'reference-only'` hoặc `'rejected'`, KHÔNG đưa vào đây. Khi chưa có ảnh, giao diện dùng
 * hình dạng ranh giới từ bản đồ GIS và nói rõ điều đó.
 */
export const ADMIN_UNIT_MEDIA: readonly UnitMedia[] = [];
