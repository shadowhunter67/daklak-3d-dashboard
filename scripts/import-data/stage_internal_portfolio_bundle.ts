#!/usr/bin/env -S node
/**
 * `npm run stage:internal-portfolio -- --bundle <path>` — Phase 4 (ADR 0007). Tách RIÊNG khỏi
 * `import:data`: import sinh ra một canonical bundle đã validate trong `generated-data/`; staging là
 * bước THỦ CÔNG thứ hai đưa bundle đó vào vị trí `build:internal-static` thật sự đọc
 * (`src/assets/data/project-portfolio.generated-fixture-demo.json` — tên file kế thừa từ Phase 2/3,
 * xem ghi chú trong ADR 0007 "Nợ đặt tên"; đổi tên là backlog Phase 5, không làm ở đây để tránh
 * động lại checksum/config Phase 3 ngoài phạm vi). KHÔNG tự commit — chỉ ghi file, người vận hành
 * review + `git add`/`git commit` thủ công.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSupportedCanonicalSchemaVersion } from '../../src/entities/project/canonicalBundle';
import {
  compileCanonicalBundleValidator,
  validateAgainstCanonicalSchema,
} from './schemaValidation';

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const TARGET_PATH = resolve(
  repoRoot,
  'src',
  'assets',
  'data',
  'project-portfolio.generated-fixture-demo.json',
);

export async function main(argv: readonly string[]): Promise<number> {
  const bundleFlagIndex = argv.indexOf('--bundle');
  const bundlePath = bundleFlagIndex >= 0 ? argv[bundleFlagIndex + 1] : undefined;
  if (!bundlePath) {
    console.error(
      'Usage: npm run stage:internal-portfolio -- --bundle <path to project-portfolio.bundle.json>',
    );
    return 2;
  }
  const resolvedBundlePath = resolve(bundlePath);
  if (!existsSync(resolvedBundlePath)) {
    console.error(`Không tìm thấy bundle: ${resolvedBundlePath}`);
    return 2;
  }

  const content = readFileSync(resolvedBundlePath, 'utf8');
  let bundle: { schemaVersion?: string };
  try {
    bundle = JSON.parse(content) as { schemaVersion?: string };
  } catch (error) {
    console.error(
      `Bundle không phải JSON hợp lệ: ${error instanceof Error ? error.message : error}`,
    );
    return 1;
  }

  if (!bundle.schemaVersion || !isSupportedCanonicalSchemaVersion(bundle.schemaVersion)) {
    console.error(`schemaVersion không hợp lệ hoặc không được hỗ trợ: ${bundle.schemaVersion}`);
    return 1;
  }

  const validate = compileCanonicalBundleValidator(repoRoot);
  const schemaIssues = validateAgainstCanonicalSchema(validate, bundle);
  if (schemaIssues.length > 0) {
    console.error(`Bundle không pass JSON Schema (${schemaIssues.length} lỗi):`);
    for (const issue of schemaIssues) console.error(`  - ${issue.fieldPath}: ${issue.message}`);
    return 1;
  }

  writeFileSync(TARGET_PATH, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
  console.log(`Đã ghi ${TARGET_PATH}`);
  console.log(
    'LƯU Ý: file này KHÔNG được tự động commit — review rồi `git add`/`git commit` thủ công.',
  );
  console.log('Bước tiếp theo: npm run build:internal-static');
  return 0;
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error('Lỗi nội bộ không mong đợi:', error);
      process.exitCode = 3;
    });
}
