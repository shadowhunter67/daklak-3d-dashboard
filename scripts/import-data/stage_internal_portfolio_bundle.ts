#!/usr/bin/env -S node
/**
 * `npm run stage:internal-portfolio -- --bundle <path>` — Phase 4 (ADR 0007), hardened Phase 5
 * (ADR 0008 §A1). Tách RIÊNG khỏi `import:data`: import sinh ra một canonical bundle đã validate
 * trong `generated-data/`; staging là bước THỦ CÔNG thứ hai đưa bundle đó vào vị trí
 * `build:internal-static` thật sự đọc (`src/assets/data/project-portfolio.generated-fixture-demo.json`
 * — tên file kế thừa từ Phase 2/3, xem ghi chú trong ADR 0007 "Nợ đặt tên"; đổi tên là backlog Phase
 * 6, không làm ở đây để tránh động lại checksum/config Phase 3 ngoài phạm vi). KHÔNG tự commit — chỉ
 * ghi file, người vận hành review + `git add`/`git commit` thủ công. KHÔNG tự chạy git command nào.
 *
 * `STAGE_TARGET_PATH_OVERRIDE` (biến môi trường, KHÔNG phải CLI flag công khai) chỉ dùng cho test
 * tự động (`stage_internal_portfolio_bundle.test.ts`) — trỏ target ghi tới một thư mục tạm thay vì
 * fixture Phase 3 thật, để test không phải dọn dẹp/khôi phục file thật sau mỗi lần chạy. Không tài
 * liệu hoá trong runbook vận hành thật vì KHÔNG có script thứ hai nào (public-static) cần override
 * này — chỉ có MỘT target hợp lệ trong vận hành thật (internal-static).
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSupportedCanonicalSchemaVersion } from '../../src/entities/project/canonicalBundle';
import {
  compileCanonicalBundleValidator,
  validateAgainstCanonicalSchema,
} from './schemaValidation';

function resolveRepoRoot(): string {
  try {
    return resolve(fileURLToPath(new URL('../..', import.meta.url)));
  } catch {
    return process.cwd();
  }
}
const repoRoot = resolveRepoRoot();

function resolveTargetPath(): string {
  if (process.env.STAGE_TARGET_PATH_OVERRIDE)
    return resolve(process.env.STAGE_TARGET_PATH_OVERRIDE);
  return resolve(
    repoRoot,
    'src',
    'assets',
    'data',
    'project-portfolio.generated-fixture-demo.json',
  );
}

const KNOWN_FLAGS = new Set(['--bundle']);

/** Ghi atomic một file đơn: temp file cùng thư mục cha rồi `renameSync` đè — không để lại target ở
 * trạng thái dở dang nếu process chết giữa chừng (rename trong cùng filesystem là atomic). */
function writeFileAtomically(targetPath: string, content: string): void {
  mkdirSync(dirname(targetPath), { recursive: true });
  const tempPath = mkdtempSync(`${dirname(targetPath)}/.stage-tmp-`) + '/bundle.json';
  try {
    writeFileSync(tempPath, content, 'utf8');
    renameSync(tempPath, targetPath);
  } finally {
    rmSync(dirname(tempPath), { recursive: true, force: true });
  }
}

export async function main(argv: readonly string[]): Promise<number> {
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      console.error(`Tham số không hợp lệ: ${token}`);
      return 2;
    }
    if (!KNOWN_FLAGS.has(token)) {
      console.error(`Tham số không xác định: ${token}`);
      return 2;
    }
    if (token === '--bundle') i += 1;
  }

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

  const targetPath = resolveTargetPath();
  if (resolvedBundlePath === targetPath) {
    console.error(
      `--bundle trùng với vị trí target (${targetPath}) — không có gì để stage. Trỏ --bundle tới output của npm run import:data.`,
    );
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

  // Chỉ ghi SAU KHI mọi validation đã pass — target hiện tại (nếu có) không hề bị chạm tới nếu bất
  // kỳ bước validate nào ở trên fail (spec "Validation fail không làm thay đổi target hiện tại").
  writeFileAtomically(targetPath, `${JSON.stringify(bundle, null, 2)}\n`);
  console.log(`Đã ghi ${targetPath}`);
  console.log(
    'LƯU Ý: file này KHÔNG được tự động commit — review rồi `git add`/`git commit` thủ công.',
  );
  console.log('Bước tiếp theo: npm run build:internal-static');
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
