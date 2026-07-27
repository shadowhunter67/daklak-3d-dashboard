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
  ProjectPortfolioSourceMetadata,
} from '../../../entities/project/adapters/ProjectPortfolioSource';

/** Metadata dùng khi result là `status: 'error'` (không có `data.metadata` để đọc) hoặc cho
 * `PendingProjectPortfolioSource` (chưa từng resolve). Chỉ dùng trong test — không phải một
 * `sourceKind` thật, không xuất hiện ở bất kỳ build/deployment mode nào. */
const FAKE_SOURCE_FALLBACK_METADATA: ProjectPortfolioSourceMetadata = {
  sourceId: 'fake-test-double',
  sourceKind: 'generated-json',
  displayName: 'Fake test double (no real data)',
  datasetIds: [],
  schemaVersion: null,
  bundleVersion: null,
  asOf: null,
  generatedAt: null,
  isIllustrative: false,
  deploymentCompatibility: [],
};

export class FakeProjectPortfolioSource implements ProjectPortfolioSource {
  constructor(private readonly result: ProjectPortfolioLoadResult) {}

  getMetadata(): ProjectPortfolioSourceMetadata {
    return this.result.status !== 'error'
      ? this.result.data.metadata
      : FAKE_SOURCE_FALLBACK_METADATA;
  }

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
  getMetadata(): ProjectPortfolioSourceMetadata {
    return FAKE_SOURCE_FALLBACK_METADATA;
  }

  loadPortfolio(): Promise<ProjectPortfolioLoadResult> {
    return new Promise(() => {});
  }
}
