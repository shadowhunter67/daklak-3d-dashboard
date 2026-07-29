/**
 * Loader thuần cho `config/public-project-fields.json` — không phải import trực tiếp JSON vào
 * `projectPublicBundle.ts` để cả CLI (Node, đọc filesystem) lẫn test (import tĩnh) đều dùng chung một
 * đường xác thực shape, thay vì tin JSON đúng hình dạng một cách mù quáng.
 */
import { CANONICAL_ENTITY_KINDS, type CanonicalEntityKind } from '../canonicalBundle';
import type { PublicFieldAllowlist } from './publicProjectionTypes';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class InvalidPublicFieldAllowlistError extends Error {}

/** Xác thực hình dạng thô (thường đọc từ JSON.parse) thành `PublicFieldAllowlist` — throw
 * `InvalidPublicFieldAllowlistError` với message cụ thể nếu thiếu entity hoặc field không phải string.
 * Không âm thầm bỏ qua entity thiếu (một entity vắng mặt nghĩa là "không có field nào được public" —
 * phải khai báo tường minh mảng rỗng `[]`, không phải bỏ hẳn key). */
export function parsePublicFieldAllowlist(raw: unknown): PublicFieldAllowlist {
  if (!isPlainObject(raw)) throw new InvalidPublicFieldAllowlistError('Allowlist phải là object.');
  const { policyVersion, entities } = raw;
  if (typeof policyVersion !== 'string' || policyVersion.length === 0) {
    throw new InvalidPublicFieldAllowlistError('Thiếu hoặc sai kiểu policyVersion (string).');
  }
  if (!isPlainObject(entities)) {
    throw new InvalidPublicFieldAllowlistError('Thiếu hoặc sai kiểu entities (object).');
  }
  const result = {} as Record<CanonicalEntityKind, readonly string[]>;
  for (const entityKind of CANONICAL_ENTITY_KINDS) {
    const fields = entities[entityKind];
    if (!Array.isArray(fields) || fields.some((f) => typeof f !== 'string')) {
      throw new InvalidPublicFieldAllowlistError(
        `entities.${entityKind} phải là mảng string (danh sách field được phép public); dùng [] nếu không field nào được public.`,
      );
    }
    result[entityKind] = fields as string[];
  }
  return { policyVersion, entities: result };
}
