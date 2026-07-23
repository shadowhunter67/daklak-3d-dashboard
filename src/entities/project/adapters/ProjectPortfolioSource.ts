/**
 * Data-access boundary cho project domain (Phase 2A — spec "Data access boundary"). Không component
 * nào được import `mockPortfolio.ts` trực tiếp; mọi thứ đi qua một
 * `ProjectPortfolioSource`. Interface trả `Promise` dù nguồn hiện tại (Phase 2A) là bundled/sync,
 * để không khoá kiến trúc vào static fixture — khi có API thật (Phase 3), chỉ cần một implementation
 * mới cùng interface này, không đổi chữ ký gọi ở call site.
 */
import type { ProjectBundle } from '../types';

export interface ProjectPortfolio {
  bundles: readonly ProjectBundle[];
  /** Mã hành chính hợp lệ tại thời điểm load — cần cho `DataQualityContext`, nguồn từ
   * layer GIS/administrative-units, không phải thứ `ProjectPortfolioSource` tự biết cách tạo ra;
   * adapter cụ thể (ví dụ `BundledProjectPortfolioSource`) chịu trách nhiệm cung cấp giá trị này. */
  validAdministrativeCodes: ReadonlySet<string>;
  loadedAt: string;
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
