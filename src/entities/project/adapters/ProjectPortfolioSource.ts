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

export interface ProjectPortfolio {
  bundles: readonly ProjectBundle[];
  /** Mã hành chính hợp lệ tại thời điểm load — cần cho `DataQualityContext`, nguồn từ
   * layer GIS/administrative-units, không phải thứ `ProjectPortfolioSource` tự biết cách tạo ra;
   * adapter cụ thể (ví dụ `BundledProjectPortfolioSource`) chịu trách nhiệm cung cấp giá trị này. */
  validAdministrativeCodes: ReadonlySet<string>;
  provenance: ProjectPortfolioProvenance;
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
}
