/**
 * Public approval receipt — Phase 7. Artifact tĩnh, ký/ghi THỦ CÔNG bởi người có thẩm quyền phê
 * duyệt xuất bản (KHÔNG phải server phê duyệt runtime — vẫn kiến trúc "không backend"), buộc chặt vào
 * checksum CHÍNH XÁC của output projection đã được duyệt. `stage_public_portfolio_bundle.ts` so khớp
 * receipt với manifest trước khi stage khi `--require-approval-receipt` được bật — nếu bundle được
 * regenerate (checksum đổi) sau khi receipt được ký, receipt cũ không còn khớp và việc stage bị chặn
 * cho tới khi có receipt mới. Giải quyết F-005 trong bản review Phase 7: "public approval is
 * documented but not cryptographically tied to staged output".
 */

export interface PublicApprovalReceipt {
  receiptVersion: string;
  /** Phải khớp `ProjectionManifest.sourceNormalizedContentChecksum`. */
  sourceNormalizedContentChecksum: string;
  /** Phải khớp `ProjectionManifest.projectedContentChecksum` — đây là ràng buộc chính: receipt chỉ
   * hợp lệ cho ĐÚNG MỘT nội dung output đã được duyệt. */
  projectedContentChecksum: string;
  /** Phải khớp `ProjectionManifest.allowedFieldPolicyVersion`. */
  allowedFieldPolicyVersion: string;
  /** Phải khớp `ProjectionManifest.publicationDecisionSetChecksum`. `null` khi projection không dùng
   * publication-decision set (vd. demo/fixture) — receipt cho trường hợp đó cũng phải có giá trị
   * `null` tường minh, không phải field vắng mặt (tránh nhầm "chưa điền" với "cố ý không dùng"). */
  publicationDecisionSetChecksum: string | null;
  reviewer: string;
  decidedAt: string;
  referenceId?: string;
}

export class InvalidPublicApprovalReceiptError extends Error {}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parsePublicApprovalReceipt(raw: unknown): PublicApprovalReceipt {
  if (!isPlainObject(raw)) {
    throw new InvalidPublicApprovalReceiptError('Approval receipt phải là object.');
  }
  const {
    receiptVersion,
    sourceNormalizedContentChecksum,
    projectedContentChecksum,
    allowedFieldPolicyVersion,
    publicationDecisionSetChecksum,
    reviewer,
    decidedAt,
    referenceId,
  } = raw;

  const requireNonEmptyString = (value: unknown, field: string): string => {
    if (typeof value !== 'string' || value.length === 0) {
      throw new InvalidPublicApprovalReceiptError(
        `Thiếu hoặc sai kiểu ${field} (string khác rỗng).`,
      );
    }
    return value;
  };

  const parsed: PublicApprovalReceipt = {
    receiptVersion: requireNonEmptyString(receiptVersion, 'receiptVersion'),
    sourceNormalizedContentChecksum: requireNonEmptyString(
      sourceNormalizedContentChecksum,
      'sourceNormalizedContentChecksum',
    ),
    projectedContentChecksum: requireNonEmptyString(
      projectedContentChecksum,
      'projectedContentChecksum',
    ),
    allowedFieldPolicyVersion: requireNonEmptyString(
      allowedFieldPolicyVersion,
      'allowedFieldPolicyVersion',
    ),
    publicationDecisionSetChecksum:
      publicationDecisionSetChecksum === null
        ? null
        : requireNonEmptyString(publicationDecisionSetChecksum, 'publicationDecisionSetChecksum'),
    reviewer: requireNonEmptyString(reviewer, 'reviewer'),
    decidedAt: requireNonEmptyString(decidedAt, 'decidedAt'),
  };
  if (referenceId !== undefined)
    parsed.referenceId = requireNonEmptyString(referenceId, 'referenceId');
  if (publicationDecisionSetChecksum === undefined) {
    throw new InvalidPublicApprovalReceiptError(
      'Thiếu publicationDecisionSetChecksum — dùng null tường minh nếu projection không dùng publication-decision set.',
    );
  }
  return parsed;
}

export interface ManifestForReceiptCheck {
  sourceNormalizedContentChecksum: string;
  projectedContentChecksum: string;
  allowedFieldPolicyVersion: string;
  publicationDecisionSetChecksum?: string | null;
}

export interface ReceiptValidationResult {
  valid: boolean;
  reasons: readonly string[];
}

/** So khớp receipt với manifest thật của output đang được stage — mọi field ràng buộc phải khớp
 * TUYỆT ĐỐI (không "gần đúng"/"đủ mới"). Trả về mọi lý do không khớp thay vì dừng ở lý do đầu tiên,
 * để người vận hành sửa một lần thay vì chạy lại nhiều lần từng phát hiện một lỗi. */
export function validateReceiptMatchesManifest(
  receipt: PublicApprovalReceipt,
  manifest: ManifestForReceiptCheck,
): ReceiptValidationResult {
  const reasons: string[] = [];
  if (receipt.sourceNormalizedContentChecksum !== manifest.sourceNormalizedContentChecksum) {
    reasons.push(
      `sourceNormalizedContentChecksum không khớp (receipt='${receipt.sourceNormalizedContentChecksum}', manifest='${manifest.sourceNormalizedContentChecksum}').`,
    );
  }
  if (receipt.projectedContentChecksum !== manifest.projectedContentChecksum) {
    reasons.push(
      `projectedContentChecksum không khớp (receipt='${receipt.projectedContentChecksum}', manifest='${manifest.projectedContentChecksum}') — output đã bị regenerate sau khi duyệt, cần receipt mới.`,
    );
  }
  if (receipt.allowedFieldPolicyVersion !== manifest.allowedFieldPolicyVersion) {
    reasons.push(
      `allowedFieldPolicyVersion không khớp (receipt='${receipt.allowedFieldPolicyVersion}', manifest='${manifest.allowedFieldPolicyVersion}').`,
    );
  }
  const manifestDecisionChecksum = manifest.publicationDecisionSetChecksum ?? null;
  if (receipt.publicationDecisionSetChecksum !== manifestDecisionChecksum) {
    reasons.push(
      `publicationDecisionSetChecksum không khớp (receipt='${receipt.publicationDecisionSetChecksum}', manifest='${manifestDecisionChecksum}').`,
    );
  }
  return { valid: reasons.length === 0, reasons };
}
