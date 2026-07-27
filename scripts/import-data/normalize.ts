/**
 * CSV cell → typed value normalization — Phase 4 importer (ADR 0007, docs/project-data-import/
 * csv-contract.md). Mỗi hàm ở đây từ chối tường minh thay vì đoán ("Không tự sửa lỗi nghiệp vụ âm
 * thầm", "Không dùng fuzzy matching mặc định") — trả `{ok:false, code, message}` thay vì throw, để
 * caller gom lỗi theo file/row/column mà không phải bọc try/catch quanh từng ô.
 */
import { isValidVndAmount } from '../../src/entities/project/validation/validateProject';
import type { ImporterErrorCode } from './errorCodes';

export type NormalizeResult<T> =
  { ok: true; value: T } | { ok: false; code: ImporterErrorCode; message: string };

function ok<T>(value: T): NormalizeResult<T> {
  return { ok: true, value };
}
function fail<T>(code: ImporterErrorCode, message: string): NormalizeResult<T> {
  return { ok: false, code, message };
}

/** Loại bỏ BOM (đã được xử lý ở tầng đọc file, nhưng giữ ở đây cho an toàn khi cell chứa BOM lạc) +
 * Unicode NFC + trim hai đầu. Đây là 3 normalization AN TOÀN duy nhất áp dụng cho MỌI cell chuỗi,
 * trước khi field-specific parsing chạy. */
export function normalizeRawCell(raw: string): string {
  return raw
    .replace(/^\uFEFF/, '')
    .normalize('NFC')
    .trim();
}

/** Cell rỗng sau khi trim → "absent" (field optional bị omit) — KHÔNG phải chuỗi rỗng, KHÔNG phải
 * lỗi, trừ khi field đó bắt buộc (caller kiểm tra required riêng). */
export function isEmptyCell(normalized: string): boolean {
  return normalized.length === 0;
}

const NON_EMPTY_STRING_PATTERN = /\S/;

export function parseNonEmptyString(normalized: string): NormalizeResult<string> {
  if (!NON_EMPTY_STRING_PATTERN.test(normalized))
    return fail('field-required', 'Chuỗi rỗng không hợp lệ cho field bắt buộc non-empty.');
  return ok(normalized);
}

/**
 * VND: CHỈ chấp nhận biểu diễn thập phân canonical — chữ số, có thể có dấu trừ ở đầu (bị từ chối vì
 * âm không hợp lệ nhưng phải phân biệt được với lỗi "không phải số"), KHÔNG dấu phân cách hàng nghìn,
 * KHÔNG dấu phẩy thập phân. `1,000,000`/`1.000.000`/`1 tỷ`/`1,5` đều bị từ chối tường minh — không có
 * bảng chuyển đổi "tỷ đồng" mặc định (spec "Không tự chuyển tỷ đồng nếu không có mapping config rõ").
 */
const CANONICAL_INTEGER_PATTERN = /^-?\d+$/;

export function parseVndAmount(normalized: string): NormalizeResult<number> {
  if (!CANONICAL_INTEGER_PATTERN.test(normalized))
    return fail(
      'field-invalid-vnd',
      `Giá trị VND phải là số nguyên thập phân thuần (không dấu phân cách, không thập phân): "${normalized}"`,
    );
  const value = Number(normalized);
  if (!isValidVndAmount(value))
    return fail(
      'field-invalid-vnd',
      `Giá trị VND ngoài phạm vi hợp lệ (không âm, ≤ Number.MAX_SAFE_INTEGER): "${normalized}"`,
    );
  return ok(value);
}

export function parsePercentage(normalized: string): NormalizeResult<number> {
  if (!/^-?\d+(\.\d+)?$/.test(normalized))
    return fail('field-invalid-type', `Giá trị phần trăm không phải số hợp lệ: "${normalized}"`);
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0 || value > 100)
    return fail('field-invalid-type', `Giá trị phần trăm ngoài khoảng 0-100: "${normalized}"`);
  return ok(value);
}

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/** Từ chối `01/02/2026`, `02-01-2026`, `today`, thiếu timezone trên datetime — không tự gắn
 * timezone máy chạy importer (spec "Không tự gắn timezone cho datetime thiếu timezone"). */
export function parseIsoDateOnly(normalized: string): NormalizeResult<string> {
  if (!ISO_DATE_ONLY.test(normalized) || Number.isNaN(new Date(normalized).getTime()))
    return fail(
      'field-invalid-date',
      `Field này cần định dạng ngày YYYY-MM-DD, nhận được: "${normalized}"`,
    );
  return ok(normalized);
}

export function parseIsoDateTime(normalized: string): NormalizeResult<string> {
  if (!ISO_DATE_TIME.test(normalized) || Number.isNaN(new Date(normalized).getTime()))
    return fail(
      'field-invalid-date',
      `Field này cần định dạng ISO 8601 đầy đủ có timezone (vd 2026-07-27T00:00:00.000Z), nhận được: "${normalized}"`,
    );
  return ok(normalized);
}

const TRUE_VALUES = new Set(['true']);
const FALSE_VALUES = new Set(['false']);

export function parseBoolean(normalized: string): NormalizeResult<boolean> {
  const lower = normalized.toLowerCase();
  if (TRUE_VALUES.has(lower)) return ok(true);
  if (FALSE_VALUES.has(lower)) return ok(false);
  return fail(
    'field-invalid-type',
    `Giá trị boolean chỉ chấp nhận "true"/"false" (không phân biệt hoa thường), nhận được: "${normalized}"`,
  );
}

export function parseEnum<T extends string>(
  normalized: string,
  allowed: readonly T[],
): NormalizeResult<T> {
  if ((allowed as readonly string[]).includes(normalized)) return ok(normalized as T);
  return fail(
    'field-invalid-enum',
    `Giá trị không nằm trong enum hợp lệ (${allowed.join('|')}): "${normalized}"`,
  );
}

/** `;`-delimited array — CHỈ áp dụng cho các cột đã tài liệu hoá rõ (administrative_area_codes,
 * evidence_ids) — không tự split MỌI chuỗi có dấu `;` (spec). Rỗng → mảng rỗng, không phải lỗi. */
export function parseSemicolonArray(normalized: string): string[] {
  if (isEmptyCell(normalized)) return [];
  return normalized
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}
