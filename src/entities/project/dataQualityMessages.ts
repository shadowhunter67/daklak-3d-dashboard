/**
 * Nhân hoá `DataQualityIssue.rule` (slug kỹ thuật như "multiple-verification-stage-records",
 * "unknown-managing-authority") thành nhãn tiếng Việt/Anh dễ hiểu — dùng ở mọi nơi hiển thị cho
 * người không phải lập trình viên (Executive Overview's AlertList, Data Readiness). `rule` bản
 * thân nó là contract nội bộ ổn định (dùng để nhóm/lọc issue), không phải copy hiển thị được;
 * chuỗi `message` gốc trong `dataQualityRules.ts` giữ nguyên vì vẫn hữu ích cho người kiểm tra kỹ
 * hơn (thường đi kèm entity id cụ thể) — hàm này chỉ thay THẾ nhãn ngắn đứng trước nó, không xoá
 * thông tin.
 */
import type { MessageKey } from '../../i18n/messages';

const DATA_QUALITY_RULE_LABEL_KEY: Record<string, MessageKey> = {
  'duplicate-primary-key': 'dataQuality.rule.duplicatePrimaryKey',
  'unmapped-administrative-code': 'dataQuality.rule.unmappedAdministrativeCode',
  'unknown-managing-authority': 'dataQuality.rule.unknownManagingAuthority',
  'unknown-investor': 'dataQuality.rule.unknownInvestor',
  'unknown-contractor': 'dataQuality.rule.unknownContractor',
  'unknown-evidence': 'dataQuality.rule.unknownReference',
  'dangling-project-reference': 'dataQuality.rule.unknownReference',
  'dangling-work-package-reference': 'dataQuality.rule.unknownReference',
  'stale-data': 'dataQuality.rule.staleData',
  'multiple-verification-stage-records': 'dataQuality.rule.multipleVerificationStageRecords',
};

/** Trả về message key cho nhãn dễ hiểu của một `rule` — key generic khi gặp rule mới/lạ không có
 * trong bảng trên, để không lộ slug kỹ thuật ra UI ngay cả khi ai đó thêm rule mới mà quên cập
 * nhật bảng này. */
/** Chi tiết đứng sau nhãn ngắn của một issue. `message` gốc do tầng quy tắc sinh ra bằng tiếng Việt
 * cố định (kèm số liệu/ID) nên chỉ hiện ở locale `vi`; ở locale khác dùng mã đối tượng để vẫn truy
 * vết được mà không lẫn chuỗi tiếng Việt vào giao diện tiếng Anh. */
export function dataQualityIssueDetail(
  issue: { message: string; entityId: string },
  locale: string,
): string {
  return locale === 'vi' ? issue.message : issue.entityId;
}

export function dataQualityRuleLabelKey(rule: string): MessageKey {
  return DATA_QUALITY_RULE_LABEL_KEY[rule] ?? 'dataQuality.rule.generic';
}
