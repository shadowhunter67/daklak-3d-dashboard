#!/usr/bin/env -S node
/**
 * `npm run stage:public-portfolio -- --input <dir sinh bởi project:public-data>` — Phase 6.
 * Tách RIÊNG khỏi `project:public-data`, cùng triết lý `stage:internal-portfolio` (ADR 0007): stage
 * là bước THỦ CÔNG thứ hai đưa output đã validate vào vị trí `build:public-static` thật sự đọc
 * (`src/assets/data/project-portfolio.public-projected.json` +
 * `src/assets/data/project-portfolio.public-projection-manifest.json`). KHÔNG tự commit.
 *
 * Kiểm tra TRƯỚC khi ghi (fail-closed, target hiện tại không đổi nếu bất kỳ bước nào fail):
 *   - `project-portfolio.public.bundle.json` và `public-projection-manifest.json` cùng tồn tại trong `--input`.
 *   - Bundle có `schemaVersion` được hỗ trợ và pass JSON Schema.
 *   - Bundle có `metadata.classification === 'public'` — KHÔNG stage một bundle chưa thực sự là public
 *     projection output (an toàn kép, độc lập với việc `project:public-data` đã đặt giá trị này).
 *   - Manifest có `projectionVersion` (tối thiểu, không parse toàn bộ shape ở đây — CLI đã kiểm khi sinh).
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
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSupportedCanonicalSchemaVersion } from '../../src/entities/project/canonicalBundle';
import {
  compileCanonicalBundleValidator,
  validateAgainstCanonicalSchema,
} from '../import-data/schemaValidation';

function resolveRepoRoot(): string {
  try {
    return resolve(fileURLToPath(new URL('../..', import.meta.url)));
  } catch {
    return process.cwd();
  }
}
const repoRoot = resolveRepoRoot();

function resolveBundleTargetPath(): string {
  if (process.env.STAGE_PUBLIC_TARGET_PATH_OVERRIDE)
    return resolve(process.env.STAGE_PUBLIC_TARGET_PATH_OVERRIDE);
  return resolve(repoRoot, 'src', 'assets', 'data', 'project-portfolio.public-projected.json');
}

function resolveManifestTargetPath(): string {
  if (process.env.STAGE_PUBLIC_MANIFEST_TARGET_PATH_OVERRIDE)
    return resolve(process.env.STAGE_PUBLIC_MANIFEST_TARGET_PATH_OVERRIDE);
  return resolve(
    repoRoot,
    'src',
    'assets',
    'data',
    'project-portfolio.public-projection-manifest.json',
  );
}

function writeFileAtomically(targetPath: string, content: string): void {
  mkdirSync(dirname(targetPath), { recursive: true });
  const tempPath = mkdtempSync(`${dirname(targetPath)}/.stage-tmp-`) + '/f.json';
  try {
    writeFileSync(tempPath, content, 'utf8');
    renameSync(tempPath, targetPath);
  } finally {
    rmSync(dirname(tempPath), { recursive: true, force: true });
  }
}

const KNOWN_FLAGS = new Set(['--input']);

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
    if (token === '--input') i += 1;
  }

  const inputFlagIndex = argv.indexOf('--input');
  const inputDir = inputFlagIndex >= 0 ? argv[inputFlagIndex + 1] : undefined;
  if (!inputDir) {
    console.error(
      'Usage: npm run stage:public-portfolio -- --input <dir sinh bởi project:public-data>',
    );
    return 2;
  }
  const resolvedInputDir = resolve(inputDir);
  const bundleSourcePath = join(resolvedInputDir, 'project-portfolio.public.bundle.json');
  const manifestSourcePath = join(resolvedInputDir, 'public-projection-manifest.json');

  if (!existsSync(bundleSourcePath)) {
    console.error(`Không tìm thấy ${bundleSourcePath} — chạy npm run project:public-data trước.`);
    return 2;
  }
  if (!existsSync(manifestSourcePath)) {
    console.error(`Không tìm thấy ${manifestSourcePath} — chạy npm run project:public-data trước.`);
    return 2;
  }

  const bundleContent = readFileSync(bundleSourcePath, 'utf8');
  let bundle: { schemaVersion?: string; metadata?: { classification?: string } };
  try {
    bundle = JSON.parse(bundleContent);
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
  if (bundle.metadata?.classification !== 'public') {
    console.error(
      `metadata.classification='${bundle.metadata?.classification}' — chỉ được stage bundle có classification 'public' (output thật của public projection engine) vào vị trí public-static.`,
    );
    return 1;
  }

  const validate = compileCanonicalBundleValidator(repoRoot);
  const schemaIssues = validateAgainstCanonicalSchema(validate, bundle);
  if (schemaIssues.length > 0) {
    console.error(`Bundle không pass JSON Schema (${schemaIssues.length} lỗi):`);
    for (const issue of schemaIssues) console.error(`  - ${issue.fieldPath}: ${issue.message}`);
    return 1;
  }

  const manifestContent = readFileSync(manifestSourcePath, 'utf8');
  let manifest: { projectionVersion?: string };
  try {
    manifest = JSON.parse(manifestContent);
  } catch (error) {
    console.error(
      `Manifest không phải JSON hợp lệ: ${error instanceof Error ? error.message : error}`,
    );
    return 1;
  }
  if (!manifest.projectionVersion) {
    console.error(
      "Manifest thiếu 'projectionVersion' — không phải output hợp lệ của project:public-data.",
    );
    return 1;
  }

  // Chỉ ghi SAU KHI mọi validation đã pass.
  writeFileAtomically(resolveBundleTargetPath(), bundleContent);
  writeFileAtomically(resolveManifestTargetPath(), manifestContent);
  console.log(`Đã ghi ${resolveBundleTargetPath()}`);
  console.log(`Đã ghi ${resolveManifestTargetPath()}`);
  console.log(
    'LƯU Ý: các file này KHÔNG được tự động commit — review rồi git add/commit thủ công.',
  );
  console.log('Bước tiếp theo: npm run build:public-static');
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
