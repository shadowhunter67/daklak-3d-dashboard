/**
 * Report-output secret redaction — Phase 4 importer (ADR 0007). Ruleset nhỏ, thích ứng từ
 * `scripts/check_secrets.mjs` (không copy toàn bộ file — chỉ các pattern áp dụng được cho một chuỗi
 * message/excerpt đơn lẻ, không phải quét toàn repo). KHÔNG tuyên bố đây là bảo đảm — chỉ phát hiện
 * pattern giới hạn (xem docs/project-data-import/importer-security-notes.md).
 */
const SECRET_PATTERNS: RegExp[] = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  /\bghp_[A-Za-z0-9]{30,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  /\bBearer [A-Za-z0-9._~+/-]{20,}={0,2}\b/g,
];

export function redactSecrets(text: string): string {
  let result = text;
  for (const pattern of SECRET_PATTERNS) result = result.replace(pattern, '«redacted»');
  return result;
}

export function truncateForReport(text: string, maxLength = 300): string {
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

export function sanitizeForReport(text: string): string {
  return truncateForReport(redactSecrets(text));
}
