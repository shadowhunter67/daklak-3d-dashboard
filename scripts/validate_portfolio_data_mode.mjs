// Boundary/leakage check cho data mode project-portfolio (Phase 2 —
// docs/project-data-import/04-deployment-profiles-design.md), KHÔNG thay thế
// scripts/validate_public_build.mjs (mục đích khác — public vs internal/confidential/restricted,
// trục "auth"). Script này kiểm tra một trục KHÁC: dữ liệu minh hoạ có lọt vào build
// internal-static/public-static hay không, và ngược lại demo build có thực sự dùng nguồn minh hoạ
// hay không (sanity — nếu marker minh hoạ không bao giờ xuất hiện kể cả ở demo, phép quét này vô
// nghĩa/vacuous).
//
// Yêu cầu: `dist/` đã được build cho ĐÚNG mode cần kiểm tra trước khi chạy (npm run build /
// build:internal-static / build:public-static) — script không tự build.
//
// Dùng: node scripts/validate_portfolio_data_mode.mjs --expected-mode=<demo|internal-static|public-static>
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');
const assetsDir = join(distDir, 'assets');

const expectedMode = (process.argv.find((arg) => arg.startsWith('--expected-mode=')) ?? '').split(
  '=',
)[1];

const VALID_MODES = ['demo', 'internal-static', 'public-static'];
if (!VALID_MODES.includes(expectedMode)) {
  console.error(
    `validate_portfolio_data_mode.mjs: --expected-mode bắt buộc, một trong ${VALID_MODES.join(', ')}. Nhận: '${expectedMode}'.`,
  );
  process.exit(1);
}

// Marker là STRING VALUE trong dữ liệu (không phải tên biến/hàm — minifier đổi tên identifier nhưng
// không đổi nội dung string literal), nên vẫn tìm thấy được trong bundle đã minify.
const ILLUSTRATIVE_MARKER = 'prj-001'; // id dự án minh hoạ đầu tiên trong illustrativeProjectPortfolio.ts
const GENERATED_FIXTURE_MARKER = 'gen-fixture-001'; // id dự án trong project-portfolio.generated-fixture-demo.json

function readBuildInfo() {
  const raw = readFileSync(join(distDir, 'build-info.json'), 'utf8');
  return JSON.parse(raw);
}

function readAllAssetJsContent() {
  const files = readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
  return files.map((f) => readFileSync(join(assetsDir, f), 'utf8')).join('\n');
}

function main() {
  const findings = [];

  const buildInfo = readBuildInfo();
  if (buildInfo.portfolioDataMode !== expectedMode) {
    findings.push(
      `dist/build-info.json.portfolioDataMode = '${buildInfo.portfolioDataMode}', mong đợi '${expectedMode}' — build có thể đã chạy sai --mode.`,
    );
  }

  const bundleContent = readAllAssetJsContent();
  const hasIllustrativeMarker = bundleContent.includes(ILLUSTRATIVE_MARKER);
  const hasGeneratedFixtureMarker = bundleContent.includes(GENERATED_FIXTURE_MARKER);

  if (expectedMode === 'demo') {
    if (!hasIllustrativeMarker) {
      findings.push(
        `Mode 'demo' nhưng KHÔNG tìm thấy marker dữ liệu minh hoạ ('${ILLUSTRATIVE_MARKER}') trong dist/assets/*.js — phép quét này có thể đã vô nghĩa (marker đổi tên/xoá mà script chưa cập nhật), hoặc demo build không thực sự dùng IllustrativeProjectPortfolioSource.`,
      );
    }
    if (hasGeneratedFixtureMarker) {
      findings.push(
        `Mode 'demo' nhưng lại tìm thấy marker generated-json fixture ('${GENERATED_FIXTURE_MARKER}') trong bundle — không mong đợi ở build demo.`,
      );
    }
  } else {
    // internal-static, public-static
    if (hasIllustrativeMarker) {
      findings.push(
        `RÒ RỈ: mode '${expectedMode}' nhưng vẫn tìm thấy marker dữ liệu minh hoạ ('${ILLUSTRATIVE_MARKER}') trong dist/assets/*.js — illustrativeProjectPortfolio.ts đã lọt vào bundle này. Kiểm tra resolve.alias trong vite.config.ts và #active-portfolio-source.`,
      );
    }
    if (!hasGeneratedFixtureMarker) {
      findings.push(
        `Mode '${expectedMode}' nhưng KHÔNG tìm thấy marker generated-json fixture ('${GENERATED_FIXTURE_MARKER}') — build này có thể không thực sự dùng GeneratedJsonProjectPortfolioSource.`,
      );
    }
  }

  if (findings.length > 0) {
    console.error(`validate_portfolio_data_mode.mjs (--expected-mode=${expectedMode}) THẤT BẠI:`);
    for (const finding of findings) console.error(`  - ${finding}`);
    process.exit(1);
  }

  console.log(`validate_portfolio_data_mode.mjs (--expected-mode=${expectedMode}) passed.`);
}

main();
