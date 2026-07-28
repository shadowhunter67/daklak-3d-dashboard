import { describe, expect, it } from 'vitest';
import { runBenchmarkForSize } from './run_benchmark';
import { generateSyntheticDatasets } from './generateSyntheticDataset';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function resolveRepoRoot(): string {
  try {
    return resolve(fileURLToPath(new URL('../../..', import.meta.url)));
  } catch {
    return process.cwd();
  }
}
const repoRoot = resolveRepoRoot();

describe('generateSyntheticDatasets', () => {
  it('is deterministic — same projectCount produces byte-identical output', () => {
    const a = generateSyntheticDatasets(25);
    const b = generateSyntheticDatasets(25);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('scales child record counts linearly with projectCount', () => {
    const { sizeReport } = generateSyntheticDatasets(25);
    expect(sizeReport.projectCount).toBe(25);
    expect(sizeReport.workPackageCount).toBe(25 * 3);
    expect(sizeReport.milestoneCount).toBe(25 * 2);
  });
});

describe('runBenchmarkForSize (smoke + complexity guard, no absolute-ms threshold)', () => {
  it('completes for 25 projects and reports sane counts', () => {
    const result = runBenchmarkForSize(25, repoRoot);
    expect(result.projectCount).toBe(25);
    expect(result.sizeReport.workPackageCount).toBeGreaterThan(0);
    expect(result.bundleBytes).toBeGreaterThan(0);
    expect(result.timingsMs.total).toBeGreaterThan(0);
  });

  // Ratio-based guard thay vì ngưỡng ms tuyệt đối (spec: "không đặt ngưỡng thời gian CI dễ flaky").
  // 250 projects = 10x record count so với 25 — nếu code là O(n) hoặc O(n log n) (Map/Set lookups,
  // đúng như canonicalIntegrity.ts/dataQualityRules.ts đã dùng), thời gian tăng gần tuyến tính. Một
  // hệ số 40x cho phép nhiều dư địa nhiễu (máy chậm/CI noisy) trong khi vẫn bắt được một regression
  // O(n²) thật (sẽ cho hệ số ~100x giữa 25 và 250 projects).
  it('does not show catastrophic O(n^2) scaling between 25 and 250 projects', () => {
    const small = runBenchmarkForSize(25, repoRoot);
    const large = runBenchmarkForSize(250, repoRoot);
    const ratio = large.timingsMs.total / Math.max(small.timingsMs.total, 0.1);
    expect(ratio).toBeLessThan(40);
  });
}, 30_000);
