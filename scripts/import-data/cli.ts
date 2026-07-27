#!/usr/bin/env -S node
/**
 * `npm run import:data` — offline project-data importer CLI, Phase 4 (docs/project-data-import/,
 * ADR 0007). Chạy qua `tsx` (xem package.json) — TypeScript trực tiếp, không cần build step riêng,
 * tái sử dụng nguyên vẹn mapper/domain validator/quality rule của `src/entities/project/`.
 *
 * Exit codes: 0 success · 1 validation/import failure (blocking issues, không phải crash) ·
 * 2 CLI/configuration error · 3 unexpected internal error.
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runImportPipeline, PipelineConfigError, type PipelineOptions } from './pipeline';
import {
  buildManifest,
  buildQualityReport,
  buildRejectedRecords,
  buildSummaryMarkdown,
  buildValidationReport,
} from './reports';
import {
  isNoChangeAgainstLastKnownGood,
  writeOutputAtomically,
  type StagedFile,
} from './atomicOutput';

const USAGE = `Usage: npm run import:data -- --input <path> --output <path> --as-of <ISO datetime> [options]

Required:
  --input <path>              Canonical JSON bundle file OR CSV directory
  --output <path>              Output directory (generated-data/)
  --as-of <ISO datetime>       Business anchor date, e.g. 2026-07-27T00:00:00.000Z

Options:
  --format <auto|json|csv>     Default: auto (inferred from filesystem entry type)
  --dry-run                    Validate + write reports, never write the bundle file
  --strict                     Unknown columns / unresolved dataset ids become blocking errors
  --last-known-good <path>     Directory with a previous import-manifest.json for no-change detection
  --administrative-codes <path> Default: src/assets/maps/daklak/daklak-labels.json
  --source-registry <path>     Optional JSON array of extra known sourceDatasetId values
  --help                       Show this message
`;

/**
 * `fileURLToPath` throws under Vitest's SSR module loader (`import.meta.url` there is not a
 * `file:` URL) — chỉ xảy ra khi file này được import bởi test, không phải khi chạy CLI thật qua
 * `tsx`. Fallback về `process.cwd()` (đúng với cách gọi thật: `npm run import:data` luôn chạy từ
 * thư mục gốc repo).
 */
function resolveRepoRoot(): string {
  try {
    return resolve(fileURLToPath(new URL('../..', import.meta.url)));
  } catch {
    return process.cwd();
  }
}
const repoRoot = resolveRepoRoot();

interface CliArgs {
  input?: string;
  output?: string;
  asOf?: string;
  format: 'auto' | 'json' | 'csv';
  dryRun: boolean;
  strict: boolean;
  lastKnownGood?: string;
  administrativeCodes: string;
  sourceRegistry?: string;
  help: boolean;
}

const KNOWN_FLAGS = new Set([
  '--input',
  '--output',
  '--as-of',
  '--format',
  '--dry-run',
  '--strict',
  '--last-known-good',
  '--administrative-codes',
  '--source-registry',
  '--help',
]);

class CliArgError extends Error {}

export function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = {
    format: 'auto',
    dryRun: false,
    strict: false,
    administrativeCodes: join(repoRoot, 'src', 'assets', 'maps', 'daklak', 'daklak-labels.json'),
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--'))
      throw new CliArgError(`Tham số không hợp lệ (thiếu "--"): ${token}`);
    if (!KNOWN_FLAGS.has(token)) throw new CliArgError(`Tham số không xác định: ${token}`);
    switch (token) {
      case '--help':
        args.help = true;
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--strict':
        args.strict = true;
        break;
      case '--input':
        args.input = argv[(i += 1)];
        break;
      case '--output':
        args.output = argv[(i += 1)];
        break;
      case '--as-of':
        args.asOf = argv[(i += 1)];
        break;
      case '--format': {
        const value = argv[(i += 1)];
        if (value !== 'auto' && value !== 'json' && value !== 'csv')
          throw new CliArgError(`--format phải là auto|json|csv, nhận được: ${value}`);
        args.format = value;
        break;
      }
      case '--last-known-good':
        args.lastKnownGood = argv[(i += 1)];
        break;
      case '--administrative-codes':
        args.administrativeCodes = resolve(argv[(i += 1)]);
        break;
      case '--source-registry':
        args.sourceRegistry = argv[(i += 1)];
        break;
    }
  }
  return args;
}

function readImporterVersion(): string {
  const packageJson = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as {
    version: string;
  };
  return packageJson.version;
}

const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export async function main(argv: readonly string[]): Promise<number> {
  let args: CliArgs;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(USAGE);
    return 2;
  }

  if (args.help) {
    console.log(USAGE);
    return 0;
  }

  if (!args.input || !args.output || !args.asOf) {
    console.error('Thiếu tham số bắt buộc: --input, --output, --as-of.');
    console.error(USAGE);
    return 2;
  }
  if (!ISO_DATE_TIME.test(args.asOf)) {
    console.error(`--as-of phải là ISO 8601 datetime đầy đủ có timezone, nhận được: ${args.asOf}`);
    return 2;
  }

  const importerVersion = readImporterVersion();
  const generatedAt = new Date().toISOString();

  const pipelineOptions: PipelineOptions = {
    repoRoot,
    inputPath: resolve(args.input),
    format: args.format,
    asOf: args.asOf,
    strict: args.strict,
    administrativeCodesPath: args.administrativeCodes,
    sourceRegistryPath: args.sourceRegistry ? resolve(args.sourceRegistry) : undefined,
    importerVersion,
  };

  let result;
  try {
    result = runImportPipeline(pipelineOptions);
  } catch (error) {
    if (error instanceof PipelineConfigError) {
      console.error(error.message);
      return 2;
    }
    throw error;
  }

  const noChange = isNoChangeAgainstLastKnownGood(
    args.lastKnownGood,
    result.normalizedContentChecksum,
  );
  const validationReport = buildValidationReport(result, args.asOf);
  const qualityReport = buildQualityReport(result);
  const rejectedRecords = buildRejectedRecords(result);

  const outputFiles = [
    'import-manifest.json',
    'validation-report.json',
    'quality-report.json',
    'rejected-records.json',
    'import-summary.md',
  ];
  const willWriteBundle = !result.blocking && !args.dryRun;
  if (willWriteBundle) outputFiles.push('project-portfolio.bundle.json');

  const manifest = buildManifest({
    result,
    importerVersion,
    asOf: args.asOf,
    generatedAt,
    inputFormat: result.resolvedFormat,
    outputFiles,
    noChange,
    strictMode: args.strict,
  });

  const summaryMarkdown = buildSummaryMarkdown({
    result,
    manifest,
    validationReport,
    inputPath: args.input,
    outputPath: join(args.output, 'project-portfolio.bundle.json'),
    noChange,
  });

  const staged: StagedFile[] = [
    { fileName: 'import-manifest.json', content: `${JSON.stringify(manifest, null, 2)}\n` },
    {
      fileName: 'validation-report.json',
      content: `${JSON.stringify(validationReport, null, 2)}\n`,
    },
    { fileName: 'quality-report.json', content: `${JSON.stringify(qualityReport, null, 2)}\n` },
    { fileName: 'rejected-records.json', content: `${JSON.stringify(rejectedRecords, null, 2)}\n` },
    { fileName: 'import-summary.md', content: summaryMarkdown },
  ];
  if (willWriteBundle && result.canonicalBundle)
    staged.push({
      fileName: 'project-portfolio.bundle.json',
      content: `${JSON.stringify(result.canonicalBundle, null, 2)}\n`,
    });

  try {
    writeOutputAtomically(resolve(args.output), staged);
  } catch (error) {
    console.error(`output-write-failed: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  console.log(summaryMarkdown);
  return result.blocking ? 1 : 0;
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
