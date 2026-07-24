/**
 * Nhãn tiếng Việt cho các giá trị taxonomy của domain Project — dùng chung giữa Executive Overview
 * (Phase 2A) và Project Portfolio/Detail (Phase 2B1) để không có hai bộ nhãn lệch nhau cho cùng một
 * giá trị enum. Thuần dữ liệu, không phụ thuộc React/GIS/store — tuân thủ cùng import boundary với
 * phần còn lại của `src/entities/project/` (xem `importBoundary.test.ts`).
 */
import type { ProjectSector, ProjectStatus } from './types';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  proposed: 'Đề xuất',
  preparing: 'Đang chuẩn bị',
  approved: 'Đã phê duyệt',
  procurement: 'Đang đấu thầu',
  active: 'Đang triển khai',
  'at-risk': 'Có nguy cơ chậm',
  delayed: 'Chậm tiến độ',
  suspended: 'Tạm dừng',
  completed: 'Hoàn thành',
  cancelled: 'Đã huỷ',
  unknown: 'Chưa xác định',
};

export const PROJECT_SECTOR_LABELS: Record<ProjectSector, string> = {
  transport: 'Giao thông',
  energy: 'Năng lượng',
  irrigation: 'Thuỷ lợi',
  health: 'Y tế',
  education: 'Giáo dục',
  'urban-development': 'Đô thị',
  'digital-transformation': 'Chuyển đổi số',
};
