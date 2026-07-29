/**
 * Di chuyển sang `src/entities/project/publicProjection/deterministicChecksum.ts` ở Phase 6 (để
 * public projection engine dùng được mà không tạo phụ thuộc ngược `src/ -> scripts/`) — file này chỉ
 * re-export nguyên vẹn để không phá call site cũ (`pipeline.ts`, `fileReading.ts`, `atomicOutput.ts`,
 * `administrativeCodes.ts`, `checksum.test.ts`).
 */
export {
  sha256Hex,
  computeInputPackageChecksum,
  stableStringify,
  computeNormalizedContentChecksum,
  type ChecksummedSourceFile,
} from '../../src/entities/project/publicProjection/deterministicChecksum';
