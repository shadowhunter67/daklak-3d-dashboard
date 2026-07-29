#!/usr/bin/env -S node
/**
 * `npm run project:public-data -- --input <canonical bundle path> --output <dir>` — Phase 6.
 * Chạy public projection engine (`src/entities/project/publicProjection/projectPublicBundle.ts`)
 * TRÊN MỘT bundle canonical internal, rồi re-validate output qua JSON Schema (Layer 1) và referential
 * integrity (Layer đã dùng bởi importer) TRƯỚC KHI ghi bất kỳ file nào — fail-closed: nếu bundle
 * public không pass, KHÔNG file nào được ghi (không để lại output nửa vời).
 *
 * Ghi ba file vào `--output`:
 *   project-portfolio.public.bundle.json    — bundle canonical đã lọc, sẵn sàng cho stage:public-portfolio
 *   public-projection-manifest.json         — xem ProjectionManifest (checksums, counts, versions)
 *   public-projection-report.json           — xem ProjectionReport (field/record đã loại + lý do,
 *                                              KHÔNG ghi giá trị nhạy cảm đã bị loại — chỉ tên field/lý do)
 *
 * TÁCH RIÊNG khỏi `stage:public-portfolio` (script kế tiếp) — cùng triết lý với
 * `import:data` → `stage:internal-portfolio` (ADR 0007): projection sinh output đã validate trong một
 * thư mục scratch; staging là bước thủ công thứ hai đưa nó vào vị trí `build:public-static` thật đọc.
 * KHÔNG tự commit.
 *
 * Phase 7 (ADR 0010) — hai flag tuỳ chọn thêm publication-decision fail-closed:
 *   --publication-decisions <path>     Đọc một PublicationDecisionSet (JSON) và truyền vào engine —
 *                                      quyết định trong file này được ƯU TIÊN trên recordClassification
 *                                      tự khai của record.
 *   --require-publication-decisions    Bật requirePublicationDecisions: record KHÔNG có quyết định
 *                                      trong file trên bị LOẠI (fail-closed) thay vì mặc định public.
 *                                      Bắt buộc cho một public release THẬT — xem
 *                                      docs/project-data-import/public-release-runbook.md.
 * Không truyền hai flag này giữ nguyên hành vi Phase 6 (mọi record mặc định public trừ khi tự khai
 * recordClassification) — không phá quy trình demo/fixture hiện có.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PublicProjectionRefusedError,
  projectCanonicalBundleToPublic,
} from '../../src/entities/project/publicProjection/projectPublicBundle';
import { parsePublicFieldAllowlist } from '../../src/entities/project/publicProjection/publicFieldAllowlist';
import {
  parsePublicationDecisionSet,
  type PublicationDecisionSet,
} from '../../src/entities/project/publicProjection/publicationDecision';
import { isSupportedCanonicalSchemaVersion } from '../../src/entities/project/canonicalBundle';
import {
  compileCanonicalBundleValidator,
  validateAgainstCanonicalSchema,
} from '../import-data/schemaValidation';
import { validateCanonicalReferentialIntegrity } from '../import-data/canonicalIntegrity';

function resolveRepoRoot(): string {
  try {
    return resolve(fileURLToPath(new URL('../..', import.meta.url)));
  } catch {
    return process.cwd();
  }
}
const repoRoot = resolveRepoRoot();

const KNOWN_FLAGS = new Set([
  '--input',
  '--output',
  '--publication-decisions',
  '--require-publication-decisions',
]);
const VALUE_FLAGS = new Set(['--input', '--output', '--publication-decisions']);

interface ParsedArgs {
  input?: string;
  output?: string;
  publicationDecisions?: string;
  requirePublicationDecisions: boolean;
  errors: string[];
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const errors: string[] = [];
  const result: ParsedArgs = { requirePublicationDecisions: false, errors };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!KNOWN_FLAGS.has(token)) {
      errors.push(`Tham số không xác định: ${token}`);
      continue;
    }
    if (token === '--require-publication-decisions') {
      result.requirePublicationDecisions = true;
      continue;
    }
    const value = argv[i + 1];
    if (token === '--input') result.input = value;
    if (token === '--output') result.output = value;
    if (token === '--publication-decisions') result.publicationDecisions = value;
    if (VALUE_FLAGS.has(token)) i += 1;
  }
  return result;
}

export async function main(argv: readonly string[]): Promise<number> {
  const {
    input,
    output,
    publicationDecisions: publicationDecisionsPath,
    requirePublicationDecisions,
    errors,
  } = parseArgs(argv);
  if (errors.length > 0) {
    for (const e of errors) console.error(e);
    return 2;
  }
  if (!input || !output) {
    console.error(
      'Usage: npm run project:public-data -- --input <canonical bundle path> --output <output dir> ' +
        '[--publication-decisions <path>] [--require-publication-decisions]',
    );
    return 2;
  }
  if (requirePublicationDecisions && !publicationDecisionsPath) {
    console.error(
      '--require-publication-decisions cần --publication-decisions <path> — nếu không MỌI record sẽ bị loại (không có quyết định nào để tra cứu).',
    );
    return 2;
  }

  let publicationDecisions: PublicationDecisionSet | undefined;
  if (publicationDecisionsPath) {
    const resolvedDecisionsPath = resolve(publicationDecisionsPath);
    if (!existsSync(resolvedDecisionsPath)) {
      console.error(`Không tìm thấy publication decision set: ${resolvedDecisionsPath}`);
      return 2;
    }
    try {
      publicationDecisions = parsePublicationDecisionSet(
        JSON.parse(readFileSync(resolvedDecisionsPath, 'utf8')),
      );
    } catch (error) {
      console.error(
        `Publication decision set không hợp lệ: ${error instanceof Error ? error.message : error}`,
      );
      return 1;
    }
  }

  const inputPath = resolve(input);
  if (!existsSync(inputPath)) {
    console.error(`Không tìm thấy input bundle: ${inputPath}`);
    return 2;
  }

  let sourceBundle: { schemaVersion?: string };
  try {
    sourceBundle = JSON.parse(readFileSync(inputPath, 'utf8'));
  } catch (error) {
    console.error(
      `Input không phải JSON hợp lệ: ${error instanceof Error ? error.message : error}`,
    );
    return 1;
  }
  if (
    !sourceBundle.schemaVersion ||
    !isSupportedCanonicalSchemaVersion(sourceBundle.schemaVersion)
  ) {
    console.error(
      `schemaVersion không hợp lệ hoặc không được hỗ trợ: ${sourceBundle.schemaVersion}`,
    );
    return 1;
  }

  const allowlistPath = join(repoRoot, 'config', 'public-project-fields.json');
  const fieldAllowlist = parsePublicFieldAllowlist(JSON.parse(readFileSync(allowlistPath, 'utf8')));

  let result;
  try {
    result = projectCanonicalBundleToPublic(sourceBundle as never, {
      fieldAllowlist,
      generatedAt: new Date().toISOString(),
      producer: 'phase6-public-projection-engine@1.0.0',
      publicationDecisions,
      requirePublicationDecisions,
    });
  } catch (error) {
    if (error instanceof PublicProjectionRefusedError) {
      console.error(`Projection bị từ chối: ${error.message}`);
      return 1;
    }
    throw error;
  }

  // B9 — re-validate SAU projection, trước khi ghi bất kỳ file nào (fail-closed).
  const validate = compileCanonicalBundleValidator(repoRoot);
  const schemaIssues = validateAgainstCanonicalSchema(validate, result.bundle);
  if (schemaIssues.length > 0) {
    console.error(
      `Bundle public không pass JSON Schema (${schemaIssues.length} lỗi) — KHÔNG ghi output:`,
    );
    for (const issue of schemaIssues) console.error(`  - ${issue.fieldPath}: ${issue.message}`);
    return 1;
  }
  const integrityIssues = validateCanonicalReferentialIntegrity(result.bundle.datasets).filter(
    (i) => i.severity === 'error',
  );
  if (integrityIssues.length > 0) {
    console.error(
      `Bundle public có ${integrityIssues.length} lỗi referential-integrity — KHÔNG ghi output:`,
    );
    for (const issue of integrityIssues)
      console.error(`  - ${issue.dataset}/${issue.recordId}: ${issue.message}`);
    return 1;
  }

  const outputDir = resolve(output);
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(
    join(outputDir, 'project-portfolio.public.bundle.json'),
    `${JSON.stringify(result.bundle, null, 2)}\n`,
  );
  writeFileSync(
    join(outputDir, 'public-projection-manifest.json'),
    `${JSON.stringify(result.manifest, null, 2)}\n`,
  );
  writeFileSync(
    join(outputDir, 'public-projection-report.json'),
    `${JSON.stringify(result.report, null, 2)}\n`,
  );

  console.log(`Đã ghi public projection vào ${outputDir}`);
  console.log(
    `  projectionVersion=${result.manifest.projectionVersion} allowedFieldPolicyVersion=${result.manifest.allowedFieldPolicyVersion}`,
  );
  console.log(
    `  record counts: ${Object.entries(result.manifest.recordCountsAfter)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')}`,
  );
  console.log('Bước tiếp theo: npm run stage:public-portfolio -- --input ' + outputDir);
  return 0;
}

function isRunningAsScript(): boolean {
  try {
    return Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}
if (isRunningAsScript()) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error('Lỗi nội bộ không mong đợi:', error);
      process.exitCode = 3;
    });
}
