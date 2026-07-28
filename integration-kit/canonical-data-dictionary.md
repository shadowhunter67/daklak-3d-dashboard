# Canonical data dictionary (tóm tắt)

Danh sách đầy đủ, chính xác từng field/enum/layer: xem
[docs/project-data-import/canonical-data-dictionary.md](../docs/project-data-import/canonical-data-dictionary.md)
(nguồn thật là `src/entities/project/types.ts`). File này chỉ tóm tắt 10 nhóm dữ liệu để tra nhanh.

| Dataset             | File CSV                      | Bắt buộc | Field khoá                                                                    |
| ------------------- | ----------------------------- | -------- | ----------------------------------------------------------------------------- |
| Agencies            | `agencies.csv`                | Không    | `id`, `name`, `type`                                                          |
| Contractors         | `contractors.csv`             | Không    | `id`, `name`                                                                  |
| Projects            | `projects.csv`                | **Có**   | `id`, `code`, `sector`, `status`, `approvedBudget`, `administrativeAreaCodes` |
| Work packages       | `work-packages.csv`           | Không    | `id`, `projectId`, `plannedStart/End`, `budget`                               |
| Milestones          | `milestones.csv`              | Không    | `id`, `projectId`, `plannedDate`                                              |
| Project issues      | `project-issues.csv`          | Không    | `id`, `projectId`, `category`, `severity`                                     |
| Progress snapshots  | `progress-snapshots.csv`      | Không    | `projectId`, `observedAt`, `sourceDatasetId` (identity, không có `id` riêng)  |
| Evidence            | `evidence.csv`                | Không    | `id`, `title`, `kind`                                                         |
| Reference documents | `reference-documents.csv`     | Không    | `id`, `title`, `issuingAuthority`, `legalStatus`                              |
| Audit events        | `audit-events.csv` (deferred) | Không    | KHÔNG ingest ở Phase 4/5 — xem ADR 0006/0007                                  |

Đơn vị tiền tệ: mọi field `*_vnd` là VND nguyên. Ngày: `*_date` = `YYYY-MM-DD`; `*_at` = ISO 8601 đầy
đủ có timezone. Geometry: chỉ qua JSON mode (CSV chưa hỗ trợ).
