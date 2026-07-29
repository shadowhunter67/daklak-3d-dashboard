// Phase 6 (A4) — unit tests cho hàm THUẦN evaluateFindings/detectPresentSourceKinds, không cần
// `vite build` thật cho mỗi test case. Bao phủ chính xác các test case yêu cầu ở spec Phase 6 §A4.
import { describe, expect, it } from 'vitest';
import { detectPresentSourceKinds, evaluateFindings } from './validate_portfolio_data_mode.mjs';

const DEMO_POLICY = {
  allowedSourceModules: ['./src/data/activePortfolioSource.demo.ts'],
  allowedSourceKinds: ['illustrative'],
  forbiddenSourceKinds: ['generated-json', 'public-projected'],
  requirePublicProjectionManifest: false,
};

const INTERNAL_STATIC_POLICY = {
  allowedSourceModules: ['./src/data/activePortfolioSource.generatedJson.ts'],
  allowedSourceKinds: ['generated-json'],
  forbiddenSourceKinds: ['illustrative', 'public-projected'],
  requirePublicProjectionManifest: false,
};

const PUBLIC_STATIC_POLICY = {
  allowedSourceModules: ['./src/data/activePortfolioSource.publicProjected.ts'],
  allowedSourceKinds: ['public-projected'],
  forbiddenSourceKinds: ['illustrative', 'generated-json'],
  requirePublicProjectionManifest: true,
};

function bundleWithKinds(...kinds) {
  return kinds.map((k) => `"sourceKind":"${k}"`).join('\n');
}

describe('detectPresentSourceKinds', () => {
  it('finds sourceKind contract literals, not arbitrary data IDs', () => {
    const bundle = bundleWithKinds('illustrative');
    expect(detectPresentSourceKinds(bundle)).toEqual(new Set(['illustrative']));
  });

  it('a demo project ID equal to the OLD fixed marker (prj-001/gen-fixture-001) has zero effect', () => {
    // Trước Phase 6, marker cũ là chuỗi ID 'prj-001'/'gen-fixture-001' — bundle chứa các chuỗi này
    // (ví dụ trùng tên một project thật) không còn ảnh hưởng gì tới kết quả, vì script không còn
    // tìm chúng nữa.
    const bundle = `${bundleWithKinds('generated-json')}\n"id":"prj-001"\n"id":"gen-fixture-001"`;
    expect(detectPresentSourceKinds(bundle)).toEqual(new Set(['generated-json']));
  });

  it('matches real esbuild/rollup minifier output — unquoted key + backtick string value', () => {
    // Xác nhận thật từ npm run build: minifier bỏ quote quanh key hợp lệ và dùng template-literal
    // (backtick) cho string value, vd `sourceId:\`illustrative\`,sourceKind:\`illustrative\`,...`.
    const bundle = 'sourceId:`illustrative`,sourceKind:`illustrative`,displayName:`Dữ liệu`';
    expect(detectPresentSourceKinds(bundle)).toEqual(new Set(['illustrative']));
  });
});

describe('evaluateFindings', () => {
  it('demo passes when build-info + bundle match policy', () => {
    const findings = evaluateFindings({
      expectedMode: 'demo',
      policy: DEMO_POLICY,
      buildInfo: {
        portfolioDataMode: 'demo',
        activePortfolioSourceModule: './src/data/activePortfolioSource.demo.ts',
      },
      presentKinds: new Set(['illustrative']),
      bundleContent: bundleWithKinds('illustrative'),
    });
    expect(findings).toEqual([]);
  });

  it('a project ID trùng marker cũ vẫn build internal-static bình thường (không fail)', () => {
    const bundleContent = `${bundleWithKinds('generated-json')}\n"id":"prj-001"`;
    const findings = evaluateFindings({
      expectedMode: 'internal-static',
      policy: INTERNAL_STATIC_POLICY,
      buildInfo: {
        portfolioDataMode: 'internal-static',
        activePortfolioSourceModule: './src/data/activePortfolioSource.generatedJson.ts',
      },
      presentKinds: detectPresentSourceKinds(bundleContent),
      bundleContent,
    });
    expect(findings).toEqual([]);
  });

  it('fails when portfolioDataMode in build-info does not match expected', () => {
    const findings = evaluateFindings({
      expectedMode: 'demo',
      policy: DEMO_POLICY,
      buildInfo: {
        portfolioDataMode: 'internal-static',
        activePortfolioSourceModule: './src/data/activePortfolioSource.demo.ts',
      },
      presentKinds: new Set(['illustrative']),
      bundleContent: bundleWithKinds('illustrative'),
    });
    expect(findings.some((f) => f.includes('portfolioDataMode'))).toBe(true);
  });

  it('fails when activePortfolioSourceModule is not in the mode allowlist', () => {
    const findings = evaluateFindings({
      expectedMode: 'internal-static',
      policy: INTERNAL_STATIC_POLICY,
      buildInfo: {
        portfolioDataMode: 'internal-static',
        activePortfolioSourceModule: './src/data/activePortfolioSource.demo.ts',
      },
      presentKinds: new Set(['generated-json']),
      bundleContent: bundleWithKinds('generated-json'),
    });
    expect(findings.some((f) => f.includes('activePortfolioSourceModule'))).toBe(true);
  });

  it('leak: internal-static bundle containing forbidden illustrative sourceKind fails', () => {
    const bundleContent = bundleWithKinds('generated-json', 'illustrative');
    const findings = evaluateFindings({
      expectedMode: 'internal-static',
      policy: INTERNAL_STATIC_POLICY,
      buildInfo: {
        portfolioDataMode: 'internal-static',
        activePortfolioSourceModule: './src/data/activePortfolioSource.generatedJson.ts',
      },
      presentKinds: detectPresentSourceKinds(bundleContent),
      bundleContent,
    });
    expect(findings.some((f) => f.startsWith('RÒ RỈ'))).toBe(true);
  });

  it('fails when demo bundle is vacuous (illustrative marker absent — sanity check)', () => {
    const findings = evaluateFindings({
      expectedMode: 'demo',
      policy: DEMO_POLICY,
      buildInfo: {
        portfolioDataMode: 'demo',
        activePortfolioSourceModule: './src/data/activePortfolioSource.demo.ts',
      },
      presentKinds: new Set(),
      bundleContent: '',
    });
    expect(findings.some((f) => f.includes("sourceKind='illustrative'"))).toBe(true);
  });

  it('public-static requires a projection manifest embedded in the bundle', () => {
    const bundleContent = bundleWithKinds('public-projected');
    const findings = evaluateFindings({
      expectedMode: 'public-static',
      policy: PUBLIC_STATIC_POLICY,
      buildInfo: {
        portfolioDataMode: 'public-static',
        activePortfolioSourceModule: './src/data/activePortfolioSource.publicProjected.ts',
      },
      presentKinds: detectPresentSourceKinds(bundleContent),
      bundleContent,
    });
    expect(findings.some((f) => f.includes('projectionVersion'))).toBe(true);
  });

  it('public-static passes when projection manifest is present and no forbidden kinds leak', () => {
    const bundleContent = `${bundleWithKinds('public-projected')}\n"projectionVersion":"1.0.0"`;
    const findings = evaluateFindings({
      expectedMode: 'public-static',
      policy: PUBLIC_STATIC_POLICY,
      buildInfo: {
        portfolioDataMode: 'public-static',
        activePortfolioSourceModule: './src/data/activePortfolioSource.publicProjected.ts',
      },
      presentKinds: detectPresentSourceKinds(bundleContent),
      bundleContent,
    });
    expect(findings).toEqual([]);
  });

  it('public-static bundle containing generated-json (unfiltered internal source) leaks', () => {
    const bundleContent = `${bundleWithKinds('public-projected', 'generated-json')}\n"projectionVersion":"1.0.0"`;
    const findings = evaluateFindings({
      expectedMode: 'public-static',
      policy: PUBLIC_STATIC_POLICY,
      buildInfo: {
        portfolioDataMode: 'public-static',
        activePortfolioSourceModule: './src/data/activePortfolioSource.publicProjected.ts',
      },
      presentKinds: detectPresentSourceKinds(bundleContent),
      bundleContent,
    });
    expect(findings.some((f) => f.startsWith('RÒ RỈ'))).toBe(true);
  });
});
