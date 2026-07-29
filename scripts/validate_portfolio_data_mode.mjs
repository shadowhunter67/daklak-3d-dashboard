// Boundary/leakage check cho data mode project-portfolio (Phase 2 —
// docs/project-data-import/04-deployment-profiles-design.md), KHÔNG thay thế
// scripts/validate_public_build.mjs (mục đích khác — public vs internal/confidential/restricted,
// trục "auth"). Script này kiểm tra một trục KHÁC: dữ liệu minh hoạ có lọt vào build
// internal-static/public-static hay không, và ngược lại demo build có thực sự dùng nguồn minh hoạ
// hay không.
//
// PHASE 6 REWRITE (docs/adr/0009-public-projection-and-ui-review-gate.md): trước đây script này
// grep một ID DỮ LIỆU cố định ('prj-001'/'gen-fixture-001') trong dist/assets/*.js — dễ false
// positive (dữ liệu import thật vô tình trùng ID) và false negative (fixture đổi ID mà script không
// cập nhật), vì kiểm tra NỘI DUNG DỮ LIỆU thay vì CONTRACT. Từ Phase 6, nguồn xác thực chính là:
//   1. `dist/build-info.json.activePortfolioSourceModule` — module Vite đã alias
//      `#active-portfolio-source` tới lúc build (quyết định CẤU HÌNH, không phụ thuộc nội dung).
//   2. `sourceKind` — literal string ổn định của TypeScript contract (PortfolioSourceKind), scan
//      trong dist/assets/*.js dưới dạng `"sourceKind":"<kind>"` — KHÔNG phải ID dữ liệu tuỳ ý, chỉ
//      đổi khi contract đổi (có test coverage riêng).
// Xem src/app/portfolioModePolicy.ts cho policy đầy đủ theo từng mode. `evaluateFindings` bên dưới
// là hàm THUẦN (không đọc filesystem) — tách riêng để unit-test được (xem
// validate_portfolio_data_mode.test.mjs) mà không cần một `vite build` thật cho mỗi test case.
//
// Yêu cầu: `dist/` đã được build cho ĐÚNG mode cần kiểm tra trước khi chạy (npm run build /
// build:internal-static / build:public-static) — script không tự build.
//
// Dùng: node scripts/validate_portfolio_data_mode.mjs --expected-mode=<demo|internal-static|public-static>
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'vite';

export const VALID_PORTFOLIO_DATA_MODES = ['demo', 'internal-static', 'public-static'];

/** Minifier có thể bỏ quote quanh key hợp lệ (`sourceKind:`) và dùng template-literal string
 * (backtick) thay vì double-quote cho value (`` `illustrative` ``) — xem findings thật từ
 * `npm run build` trước khi chốt regex này. Chấp nhận cả ba kiểu quote (`"`, `'`, backtick) cho cả
 * key lẫn value, không phụ thuộc một kiểu quoting cụ thể của một phiên bản minifier. */
export function sourceKindMarkerPattern(kind) {
  return new RegExp(`sourceKind["'\`]?\\s*:\\s*["'\`]${kind}["'\`]`);
}

export function detectPresentSourceKinds(bundleContent) {
  return new Set(
    ['illustrative', 'generated-json', 'public-projected'].filter((kind) =>
      sourceKindMarkerPattern(kind).test(bundleContent),
    ),
  );
}

/** Hàm THUẦN — không đọc filesystem/network. `presentKinds` là kết quả của
 * `detectPresentSourceKinds(bundleContent)`. */
export function evaluateFindings({ expectedMode, policy, buildInfo, presentKinds, bundleContent }) {
  const findings = [];

  if (buildInfo.portfolioDataMode !== expectedMode) {
    findings.push(
      `dist/build-info.json.portfolioDataMode = '${buildInfo.portfolioDataMode}', mong đợi '${expectedMode}' — build có thể đã chạy sai --mode.`,
    );
  }

  if (!policy.allowedSourceModules.includes(buildInfo.activePortfolioSourceModule)) {
    findings.push(
      `dist/build-info.json.activePortfolioSourceModule = '${buildInfo.activePortfolioSourceModule}', không nằm trong allowedSourceModules của mode '${expectedMode}' (${policy.allowedSourceModules.join(', ')}) — kiểm tra resolveActivePortfolioSourceModule.ts/vite.config.ts.`,
    );
  }

  for (const forbiddenKind of policy.forbiddenSourceKinds) {
    if (presentKinds.has(forbiddenKind)) {
      findings.push(
        `RÒ RỈ: mode '${expectedMode}' nhưng dist/assets/*.js chứa sourceKind='${forbiddenKind}' (bị cấm ở mode này) — kiểm tra resolve.alias trong vite.config.ts và #active-portfolio-source.`,
      );
    }
  }

  for (const allowedKind of policy.allowedSourceKinds) {
    if (!presentKinds.has(allowedKind)) {
      findings.push(
        `Mode '${expectedMode}' nhưng KHÔNG tìm thấy sourceKind='${allowedKind}' trong dist/assets/*.js — build này có thể không thực sự dùng nguồn mong đợi, hoặc phép quét đã vô nghĩa (contract literal đổi mà script chưa cập nhật).`,
      );
    }
  }

  if (
    policy.requirePublicProjectionManifest &&
    !/projectionVersion["'`]?\s*:/.test(bundleContent)
  ) {
    findings.push(
      `Mode '${expectedMode}' bắt buộc public projection manifest nhưng dist/assets/*.js không chứa field 'projectionVersion' — build có thể chưa chạy npm run project:public-data / stage:public-portfolio trước khi stage bundle.`,
    );
  }

  return findings;
}

async function loadPortfolioModePolicies(root) {
  const server = await createServer({
    root,
    logLevel: 'error',
    server: { middlewareMode: true, hmr: false, watch: null },
  });
  try {
    const mod = await server.ssrLoadModule('/src/app/portfolioModePolicy.ts');
    return mod.PORTFOLIO_MODE_POLICIES;
  } finally {
    await server.close();
  }
}

function readBuildInfo(distDir) {
  return JSON.parse(readFileSync(join(distDir, 'build-info.json'), 'utf8'));
}

function readAllAssetJsContent(assetsDir) {
  const files = readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
  return files.map((f) => readFileSync(join(assetsDir, f), 'utf8')).join('\n');
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const distDir = join(root, 'dist');
  const assetsDir = join(distDir, 'assets');

  const expectedMode = (process.argv.find((arg) => arg.startsWith('--expected-mode=')) ?? '').split(
    '=',
  )[1];
  if (!VALID_PORTFOLIO_DATA_MODES.includes(expectedMode)) {
    console.error(
      `validate_portfolio_data_mode.mjs: --expected-mode bắt buộc, một trong ${VALID_PORTFOLIO_DATA_MODES.join(', ')}. Nhận: '${expectedMode}'.`,
    );
    process.exitCode = 1;
    return;
  }

  const policies = await loadPortfolioModePolicies(root);
  const policy = policies[expectedMode];
  const buildInfo = readBuildInfo(distDir);
  const bundleContent = readAllAssetJsContent(assetsDir);
  const presentKinds = detectPresentSourceKinds(bundleContent);

  const findings = evaluateFindings({
    expectedMode,
    policy,
    buildInfo,
    presentKinds,
    bundleContent,
  });

  if (findings.length > 0) {
    console.error(`validate_portfolio_data_mode.mjs (--expected-mode=${expectedMode}) THẤT BẠI:`);
    for (const finding of findings) console.error(`  - ${finding}`);
    process.exitCode = 1;
    return;
  }

  console.log(`validate_portfolio_data_mode.mjs (--expected-mode=${expectedMode}) passed.`);
}

const isRunningAsScript =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isRunningAsScript) await main();
