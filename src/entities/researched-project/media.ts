/**
 * Manifest ảnh: mỗi ảnh production phải có license rõ, tác giả (khi license đòi ghi nguồn) và file
 * cục bộ — không hotlink (CSP `img-src` chỉ cho same-origin). Ảnh `reference-only` chỉ lưu URL để
 * tham chiếu trong báo cáo nghiên cứu, không có asset trong repo.
 */
import type { ResearchIssue } from './types';

export type MediaUsage = 'production' | 'reference-only' | 'rejected';

export interface MediaSource {
  id: string;
  subject: string;
  sourceUrl: string;
  provider: string;
  author?: string;
  license: string;
  licenseUrl?: string;
  retrievedAt: string;
  /** Đường dẫn tương đối dưới `public/` — chỉ có khi `usage: 'production'`. */
  localAsset?: string;
  usage: MediaUsage;
  notes?: string;
}

/** License yêu cầu ghi tên tác giả (CC BY*, và các biến thể có "BY"). */
const NEEDS_ATTRIBUTION = /\bBY\b/i;

export function validateMediaManifest(items: readonly MediaSource[]): ResearchIssue[] {
  const issues: ResearchIssue[] = [];
  const add = (rule: string, id: string, message: string) =>
    issues.push({ rule, projectId: id, severity: 'error', message });
  const seen = new Set<string>();

  for (const m of items) {
    if (seen.has(m.id)) add('duplicate-media-id', m.id, `ID ảnh trùng: ${m.id}`);
    seen.add(m.id);
    if (!/^https:\/\//.test(m.sourceUrl)) add('invalid-media-url', m.id, 'sourceUrl phải là https');

    if (m.usage === 'production') {
      if (!m.license.trim()) add('media-missing-license', m.id, 'Ảnh production thiếu license');
      if (!m.localAsset) add('media-production-without-asset', m.id, 'Ảnh production thiếu asset');
      if (NEEDS_ATTRIBUTION.test(m.license) && !m.author?.trim())
        add('media-missing-attribution', m.id, 'License cần ghi tác giả nhưng thiếu author');
    }
    if (m.usage !== 'production' && m.localAsset)
      add('media-reference-has-asset', m.id, 'Ảnh không dùng production không được có asset');
  }
  return issues;
}
