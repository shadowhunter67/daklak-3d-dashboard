/**
 * `HttpProjectPortfolioSourceContract` — Phase 2 (docs/project-data-import/01-target-architecture.md
 * §2.3). CHỈ LÀ INTERFACE + TÀI LIỆU. Không có implementation, không gọi network giả, không mô
 * phỏng backend. Rule bắt buộc: không xây thay đổi lớn chỉ để chuẩn bị cho một backend chưa tồn tại
 * — file này tồn tại vì tài liệu Phase 1 đã cam kết một chỗ đặt tên rõ ràng cho contract tương lai,
 * không phải vì Phase 2 cần dùng nó.
 *
 * Khi một nguồn HTTP thật được xây (không thuộc phạm vi Phase 2-6 hiện tại, không có lịch trình cụ
 * thể), implementation phải theo đúng convention `PublicHttpAdapter`/`ProtectedApiAdapter`
 * (`src/data-platform/adapters/`) đã có: HTTPS-only, timeout + `AbortSignal`, không retry lỗi 4xx,
 * schema-validate response trước khi map sang domain type, trả `ProjectPortfolioLoadResult` (tagged
 * union) thay vì ném exception.
 *
 * "API contract gate" (docs/domain-model.md, §"Phase 3 — API contract gate", nhắc lại nguyên văn,
 * không thêm điều kiện mới) — bắt buộc phải có TRƯỚC KHI bất kỳ implementation thật nào của
 * interface này tồn tại:
 *
 * 1. Một API DTO schema có version rõ ràng (JSON Schema hoặc tương đương, theo pattern
 *    `data-templates/schemas/*.schema.json` đã có cho data-platform).
 * 2. Một mapper DTO → domain type tường minh (không dùng `Project`/`ProjectBundle`/... trực tiếp
 *    làm response shape — domain type trong `src/entities/project/types.ts` không được mặc định
 *    trở thành wire contract).
 * 3. Contract test đối chiếu DTO schema với dữ liệu mock/thật.
 *
 * Không có điều kiện nào trong ba điều trên được thoả mãn ở Phase 2 — vì vậy file này dừng lại ở
 * interface, không có class nào `implements` nó.
 */
import type { ProjectPortfolioSource } from './ProjectPortfolioSource';

/** Cấu hình tối thiểu một implementation tương lai cần — liệt kê ở đây để không phải đoán lại khi
 * Phase đó thực sự bắt đầu, không phải để dùng ngay. */
export interface HttpProjectPortfolioSourceOptions {
  /** URL HTTPS-only — implementation thật phải từ chối `http://` (cùng rule với `PublicHttpAdapter`). */
  url: string;
  /** Timeout tường minh, không dựa vào giá trị mặc định trình duyệt. */
  timeoutMs: number;
}

/**
 * Contract cho một nguồn portfolio qua HTTP thật trong tương lai. Cùng interface
 * `ProjectPortfolioSource` — không phải một interface cạnh tranh — để composition root
 * (`src/app/createProjectPortfolioSource.ts`) có thể trả về implementation này mà không đổi chữ ký
 * gọi ở bất kỳ view nào, đúng nguyên tắc "component/KPI/domain không biết nguồn dữ liệu cụ thể".
 */
export type HttpProjectPortfolioSourceContract = ProjectPortfolioSource;
