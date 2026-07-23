/**
 * Test double cho `ProjectPortfolioSource` — mô phỏng `degraded`/`error`/độ trễ mà
 * `BundledProjectPortfolioSource` (luôn `ok`, không có network) không thể tự nhiên tạo ra. Theo
 * đúng pattern `FakeMapProvider.ts` (`src/components/detail-map/FakeMapProvider.ts`) đã dùng cho
 * detail map. Chỉ dùng trong test/story, không import từ đường dẫn tới `main.tsx`.
 */
import type {
  ProjectDataErrorKind,
  ProjectPortfolio,
  ProjectPortfolioLoadResult,
  ProjectPortfolioSource,
} from '../../../entities/project/adapters/ProjectPortfolioSource';

export class FakeProjectPortfolioSource implements ProjectPortfolioSource {
  constructor(private readonly result: ProjectPortfolioLoadResult) {}

  async loadPortfolio(signal?: AbortSignal): Promise<ProjectPortfolioLoadResult> {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return this.result;
  }

  static ok(data: ProjectPortfolio): FakeProjectPortfolioSource {
    return new FakeProjectPortfolioSource({ status: 'ok', data });
  }

  static degraded(data: ProjectPortfolio, issues: string[]): FakeProjectPortfolioSource {
    return new FakeProjectPortfolioSource({ status: 'degraded', data, issues });
  }

  static error(
    message: string,
    kind: ProjectDataErrorKind = 'unknown',
  ): FakeProjectPortfolioSource {
    return new FakeProjectPortfolioSource({ status: 'error', error: { kind, message } });
  }
}

/** Không bao giờ resolve — dùng để test trạng thái loading. Tách khỏi `FakeProjectPortfolioSource`
 * vì nó không có một `ProjectPortfolioLoadResult` cụ thể nào để giữ. */
export class PendingProjectPortfolioSource implements ProjectPortfolioSource {
  loadPortfolio(): Promise<ProjectPortfolioLoadResult> {
    return new Promise(() => {});
  }
}
