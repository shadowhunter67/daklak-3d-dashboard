/**
 * Data-access boundary cho project domain (Phase 2A — spec "Data access boundary"). Không component
 * nào được import `illustrativeProjectPortfolio.ts` trực tiếp; mọi thứ đi qua một
 * `ProjectPortfolioSource`. Interface trả `Promise` dù nguồn hiện tại (Phase 2A) là bundled/sync,
 * để không khoá kiến trúc vào static fixture — khi có API thật (Phase 3), chỉ cần một implementation
 * mới cùng interface này, không đổi chữ ký gọi ở call site.
 */
import type { ProjectBundle } from '../types';

/**
 * Năm mốc thời gian tách biệt của một portfolio snapshot — thay cho `loadedAt` cũ vốn bị dùng lẫn
 * lộn như thể là "dữ liệu vừa được cập nhật" trong khi nó chỉ là thời điểm trình duyệt gọi
 * `loadPortfolio()`. Component không được coi bất kỳ trường nào trong số bốn trường dữ liệu dưới
 * đây là "cập nhật hôm nay" chỉ vì phiên trình duyệt hiện tại mới mở — bốn trường đó phải đến từ
 * manifest/snapshot deterministic, không phải `new Date()` tại thời điểm render.
 */
export interface ProjectPortfolioProvenance {
  /** Dữ liệu có hiệu lực tại thời điểm nào (điểm neo nghiệp vụ của snapshot — vd. "số liệu tính đến
   * ngày X"). Deterministic, đến từ snapshot, không phải giờ hệ thống. */
  effectiveAt: string;
  /** Nguồn gốc (cơ quan/bộ dữ liệu) công bố dữ liệu vào thời điểm nào. Deterministic. */
  sourcePublishedAt: string;
  /** Hệ thống (pipeline/tác giả fixture) thu thập/đóng gói dữ liệu vào thời điểm nào. Deterministic. */
  retrievedAt: string;
  /** Snapshot được publish lên dashboard (build/release) vào thời điểm nào. Deterministic. */
  publishedToDashboardAt: string;
  /** Trình duyệt hiện tại nạp xong dữ liệu vào lúc nào — trường DUY NHẤT hợp lệ để là `new Date()`
   * tại runtime, vì đây đúng là một sự kiện runtime, không phải thuộc tính của dữ liệu. */
  loadedInBrowserAt: string;
}

/** Loại nguồn cụ thể đang cung cấp portfolio — chỉ dùng để hiển thị (Data Readiness UI), KHÔNG được
 * dùng để rẽ nhánh logic nghiệp vụ/KPI/validation (xem docs/project-data-import/01-target-architecture.md
 * §4). `'http'` cố tình có mặt trong union dù chưa implementation nào tồn tại — xem
 * `HttpProjectPortfolioSourceContract.ts`. */
export type PortfolioSourceKind = 'illustrative' | 'generated-json' | 'http';

/** Ba data mode tĩnh (build-time) mà một nguồn có thể tương thích — trục KHÁC với "public"/"secure"
 * của docs/deployment-profiles.md (trục auth). Xem docs/project-data-import/04-deployment-profiles-design.md. */
export type PortfolioDeploymentMode = 'demo' | 'internal-static' | 'public-static';

/**
 * Metadata mô tả CHÍNH nguồn (identity) — không phải một dự án/bản ghi cụ thể. Trả đồng bộ qua
 * `ProjectPortfolioSource.getMetadata()` (không cần `await loadPortfolio()` trước) vì cả hai
 * implementation hiện có (Phase 2: illustrative, generated-json) đều 100% static/không network —
 * không có rủi ro "mô tả một lần load khác" mà một nguồn HTTP thật trong tương lai mới gặp phải (xem
 * ghi chú trong docs/project-data-import/01-target-architecture.md về quyết định này). Cũng là field
 * DUY NHẤT còn dùng được khi `loadPortfolio()` trả `status: 'error'` (không có `data` để đọc).
 *
 * Không bắt buộc mọi field phải có giá trị cụ thể — dùng `null` khi nguồn chưa/không xác định được
 * (ví dụ một nguồn tương lai chưa load lần nào có thể chưa biết `bundleVersion` thật), không dùng
 * chuỗi rỗng hay giá trị giả để lấp chỗ trống.
 */
export interface ProjectPortfolioSourceMetadata {
  /** Định danh ổn định của CHÍNH instance nguồn này (không phải của bundle) — vd 'illustrative',
   * 'generated-json'. Hai instance cùng loại (vd hai file generated JSON khác nhau) có thể khác
   * `sourceId` dù cùng `sourceKind`. */
  sourceId: string;
  sourceKind: PortfolioSourceKind;
  /** Tên hiển thị cho Data Readiness UI, đã qua i18n key hoặc chuỗi tiếng Việt sẵn sàng hiển thị. */
  displayName: string;
  /** Dataset id (resolve qua `src/data-platform/catalog/datasets.ts`) đã góp phần vào bundle này. */
  datasetIds: readonly string[];
  /** Version của CẤU TRÚC wire-format bundle — khác `DatasetDescriptor.version` (version của từng
   * dataset). `null` nếu nguồn không có khái niệm bundle version (chưa xảy ra ở Phase 2). */
  schemaVersion: string | null;
  /** Tăng mỗi lần bundle được sinh/ghi lại — khác `schemaVersion` (chỉ đổi khi cấu trúc đổi). */
  bundleVersion: string | null;
  /** Điểm neo nghiệp vụ "số liệu tính đến ngày nào" — deterministic, không phải `Date.now()`. */
  asOf: string | null;
  /** Thời điểm bundle được sinh ra (importer chạy, hoặc thời điểm fixture được viết) — khác `asOf`. */
  generatedAt: string | null;
  /** `true` khi và chỉ khi `sourceKind === 'illustrative'` — tách field riêng (thay vì suy ra tại
   * nơi dùng) để Data Readiness UI không phải biết quy tắc suy luận này. */
  isIllustrative: boolean;
  /** Data mode nào nguồn này được thiết kế để phục vụ — xem `PortfolioDeploymentMode`. Một nguồn
   * generated-json cụ thể có thể CHỈ tương thích `internal-static` (bundle chưa lọc public) dù class
   * adapter giống hệt một bundle khác đã lọc và tương thích `public-static`. */
  deploymentCompatibility: readonly PortfolioDeploymentMode[];
}

export interface ProjectPortfolio {
  bundles: readonly ProjectBundle[];
  /** Mã hành chính hợp lệ tại thời điểm load — cần cho `DataQualityContext`, nguồn từ
   * layer GIS/administrative-units, không phải thứ `ProjectPortfolioSource` tự biết cách tạo ra;
   * adapter cụ thể (ví dụ `IllustrativeProjectPortfolioSource`) chịu trách nhiệm cung cấp giá trị này. */
  validAdministrativeCodes: ReadonlySet<string>;
  provenance: ProjectPortfolioProvenance;
  /** Bằng đúng giá trị `getMetadata()` trả tại thời điểm load này thành công — cho phép UI đọc
   * metadata từ một kết quả `loadPortfolio()` đã có trong tay mà không cần gọi lại `getMetadata()`. */
  metadata: ProjectPortfolioSourceMetadata;
}

export type ProjectDataErrorKind =
  | 'unauthorized'
  | 'forbidden'
  | 'network'
  | 'timeout'
  | 'schema-invalid'
  | 'source-unavailable'
  | 'rate-limited'
  | 'unknown';

export interface ProjectDataError {
  kind: ProjectDataErrorKind;
  message: string;
  requestId?: string;
}

export type ProjectPortfolioLoadResult =
  | { status: 'ok'; data: ProjectPortfolio }
  | { status: 'degraded'; data: ProjectPortfolio; issues: string[] }
  | { status: 'error'; error: ProjectDataError };

export interface ProjectPortfolioSource {
  loadPortfolio(signal?: AbortSignal): Promise<ProjectPortfolioLoadResult>;
  /** Đồng bộ — xem JSDoc của `ProjectPortfolioSourceMetadata` về lý do không phải `Promise`. */
  getMetadata(): ProjectPortfolioSourceMetadata;
}
