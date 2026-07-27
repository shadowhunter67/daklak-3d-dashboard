# Canonical data dictionary — project portfolio

Phase 3. Nguồn sự thật là `src/entities/project/types.ts` (TypeScript) +
`data-templates/schemas/definitions/*.schema.json` (JSON Schema mirror, kiểm tra đồng thuận bằng
`src/entities/project/validation/projectSchemaDriftGuard.test.ts`). Bảng dưới đây là tài liệu tham
khảo — nếu có khác biệt, `types.ts` là nguồn thật.

Ký hiệu: **R** = required, **O** = optional. Cột "Layer" ghi lớp nào validate field đó ngoài JSON
Schema (Layer 1 luôn áp dụng cho mọi field có mặt trong schema).

## `agencies` (`Agency`)

| Field           | R/O | Kiểu              | Enum/ghi chú                                                 |
| --------------- | --- | ----------------- | ------------------------------------------------------------ |
| id              | R   | string, non-empty |                                                              |
| name            | R   | string, non-empty |                                                              |
| type            | R   | enum              | `managing-authority`\|`line-department`\|`investor`\|`other` |
| sourceDatasetId | O   | string            | Phase 3 additive                                             |
| dataOwner       | O   | string            | Phase 3 additive                                             |

## `contractors` (`Contractor`)

| Field           | R/O | Kiểu              | Ghi chú          |
| --------------- | --- | ----------------- | ---------------- |
| id              | R   | string, non-empty |                  |
| name            | R   | string, non-empty |                  |
| taxCode         | O   | string            |                  |
| sourceDatasetId | O   | string            | Phase 3 additive |
| dataOwner       | O   | string            | Phase 3 additive |

## `projects` (`Project`)

| Field                                                                          | R/O | Kiểu                       | Enum/ghi chú                                      | Layer khác                                                    |
| ------------------------------------------------------------------------------ | --- | -------------------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| id, code, name                                                                 | R   | string, non-empty          |                                                   |                                                               |
| description                                                                    | R   | string                     |                                                   |                                                               |
| sector                                                                         | R   | enum                       | 7 giá trị — xem `PROJECT_SECTORS`                 |                                                               |
| status                                                                         | R   | enum                       | 11 giá trị — xem `PROJECT_STATUSES`               |                                                               |
| priority                                                                       | R   | enum                       | `critical`\|`high`\|`medium`\|`low`               |                                                               |
| managingAuthorityId, investorId                                                | R   | string                     | Không FK-check ở Layer 1/2 — Layer 3 (Phase 4)    |                                                               |
| projectManagerId, approvalDecision                                             | O   | string                     |                                                   |                                                               |
| startDate, plannedCompletionDate, forecastCompletionDate, actualCompletionDate | O   | date (YYYY-MM-DD)          |                                                   | Layer 2: `plannedCompletionDate` không được trước `startDate` |
| approvedBudget                                                                 | R   | VND integer                |                                                   | Layer 2: `isValidVndAmount`                                   |
| adjustedBudget                                                                 | O   | VND integer                |                                                   | Layer 2                                                       |
| disbursedAmount                                                                | R   | VND integer                |                                                   | Layer 2: không vượt `adjustedBudget ?? approvedBudget`        |
| overallProgress, plannedProgress, financialProgress                            | R   | 0-100                      |                                                   |                                                               |
| administrativeAreaCodes                                                        | R   | string[], ≥1 phần tử       | Layer 3: phải resolve qua `daklak-labels.json`    |                                                               |
| geometry                                                                       | O   | Point\|LineString\|Polygon | Xem geometry-contract.md                          | Layer 2                                                       |
| geometryMetadata                                                               | O   | object                     | Chỉ hợp lệ khi có `geometry`                      | Layer 2                                                       |
| dataUpdatedAt                                                                  | R   | date-time                  |                                                   |                                                               |
| dataOwner, sourceDatasetId                                                     | R   | string, non-empty          | sourceDatasetId nên resolve qua `DATASET_CATALOG` |                                                               |
| confidence                                                                     | R   | enum                       | `verified`\|`high`\|`medium`\|`low`\|`unknown`    |                                                               |
| verificationStatus                                                             | R   | enum                       | 7 giá trị — xem `VERIFICATION_STATUSES`           |                                                               |

## `work-packages` (`WorkPackage`)

| Field                                                                                  | R/O | Kiểu              | Ghi chú                                        |
| -------------------------------------------------------------------------------------- | --- | ----------------- | ---------------------------------------------- |
| id, projectId, code, name                                                              | R   | string, non-empty |                                                |
| contractorId                                                                           | O   | string            |                                                |
| plannedStart, plannedEnd                                                               | R   | date              | Layer 2: end không trước start                 |
| actualStart, actualEnd                                                                 | O   | date              | Layer 2: end không trước start                 |
| plannedProgress, actualProgress                                                        | R   | 0-100             |                                                |
| budget, paidAmount                                                                     | R   | VND integer       | Layer 2: paidAmount không vượt budget          |
| status                                                                                 | R   | enum              | 9 giá trị — `WORK_PACKAGE_STATUSES`            |
| sourceDatasetId, sourceRecordId, observedAt, verificationStatus, confidence, dataOwner | O   | —                 | Phase 3 additive — xem 00-gap-analysis.md §3.1 |

## `milestones` (`Milestone`)

| Field                                                                                  | R/O | Kiểu              | Ghi chú                          |
| -------------------------------------------------------------------------------------- | --- | ----------------- | -------------------------------- |
| id, projectId, name                                                                    | R   | string, non-empty |                                  |
| workPackageId                                                                          | O   | string            |                                  |
| plannedDate                                                                            | R   | date              |                                  |
| forecastDate, actualDate                                                               | O   | date              |                                  |
| critical                                                                               | R   | boolean           |                                  |
| status                                                                                 | R   | enum              | 7 giá trị — `MILESTONE_STATUSES` |
| sourceDatasetId, sourceRecordId, observedAt, verificationStatus, confidence, dataOwner | O   | —                 | Phase 3 additive                 |

## `project-issues` (`ProjectIssue`)

| Field                                     | R/O | Kiểu                       | Ghi chú                                                                               |
| ----------------------------------------- | --- | -------------------------- | ------------------------------------------------------------------------------------- |
| id, projectId, title, description         | R   | string                     |                                                                                       |
| category                                  | R   | enum                       | 10 giá trị — `ISSUE_CATEGORIES`                                                       |
| severity                                  | R   | enum                       | `low`\|`medium`\|`high`\|`critical`                                                   |
| ownerAgencyId, ownerUserId                | O   | string                     |                                                                                       |
| openedAt                                  | R   | date-time                  |                                                                                       |
| dueAt, resolvedAt                         | O   | date-time                  | Layer 2: dueAt không trước openedAt; resolvedAt chỉ hợp lệ khi status resolved/closed |
| status                                    | R   | enum                       | 6 giá trị — `ISSUE_STATUSES`                                                          |
| relatedGeometry                           | O   | Point\|LineString\|Polygon |                                                                                       |
| evidenceIds                               | R   | string[] (có thể rỗng)     |                                                                                       |
| sourceDatasetId                           | R   | string, non-empty          |                                                                                       |
| verificationStatus, confidence, dataOwner | O   | —                          | Phase 3 additive                                                                      |

## `progress-snapshots` (`ProgressSnapshot`)

| Field                                                        | R/O | Kiểu              | Ghi chú                                                                                                                                                 |
| ------------------------------------------------------------ | --- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| projectId                                                    | R   | string, non-empty |                                                                                                                                                         |
| observedAt                                                   | R   | date-time         | Cùng identity với sourceDatasetId (`projectId+observedAt+sourceDatasetId`) — xem `progressSnapshotSelection.ts`                                         |
| plannedPhysicalProgress, physicalProgress, financialProgress | R   | 0-100             |                                                                                                                                                         |
| disbursedAmount                                              | R   | VND integer       |                                                                                                                                                         |
| sourceDatasetId, sourceRecordId                              | R   | string, non-empty |                                                                                                                                                         |
| importedAt                                                   | R   | date-time         |                                                                                                                                                         |
| verificationStatus                                           | R   | enum              | Dùng bởi `selectAuthoritativeSnapshot()` (approved > reviewed > submitted > validated-automatically > raw; superseded/rejected không bao giờ được chọn) |
| confidence, dataOwner                                        | O   | —                 | Phase 3 additive                                                                                                                                        |

## `evidence` (`Evidence`)

| Field                            | R/O | Kiểu              | Ghi chú                                               |
| -------------------------------- | --- | ----------------- | ----------------------------------------------------- |
| id, title                        | R   | string, non-empty |                                                       |
| kind                             | R   | enum              | `document`\|`photo`\|`report`\|`measurement`\|`other` |
| capturedAt                       | O   | date-time         |                                                       |
| sourceDatasetId, note, dataOwner | O   | string            |                                                       |

## `reference-documents` (`ReferenceDocument`)

| Field                               | R/O | Kiểu              | Ghi chú                                                                                                                                    |
| ----------------------------------- | --- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| id, title, issuingAuthority         | R   | string, non-empty |                                                                                                                                            |
| documentNumber                      | O   | string            |                                                                                                                                            |
| issuedDate                          | O   | date              |                                                                                                                                            |
| legalStatus                         | R   | enum              | `draft`\|`in-effect`\|`superseded`\|`unknown`                                                                                              |
| sourceUrl                           | O   | string (uri)      |                                                                                                                                            |
| sourceDatasetId, verificationStatus | O   | —                 | Phase 3 additive; `verificationStatus` ĐỘC LẬP với `legalStatus` (xem docs/data-classification.md "Evidence level vs verification status") |

## `project-audit-events-demo` (`ProjectAuditEvent`) — deferred/optional

| Field                                                                                 | R/O | Kiểu              | Ghi chú                                                                                                                          |
| ------------------------------------------------------------------------------------- | --- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| eventId, requestId                                                                    | R   | string, non-empty |                                                                                                                                  |
| eventType, action                                                                     | R   | enum              | 8 giá trị — `AuditAction`. `eventType`/`action` cùng enum, hiện trùng giá trị (ghi cả hai để khớp shape `ProjectAuditEvent` gốc) |
| result                                                                                | R   | enum              | `success`\|`denied`\|`error`                                                                                                     |
| occurredAt                                                                            | R   | date-time         |                                                                                                                                  |
| actorId, actorAgencyId, datasetId, projectId, resourceType, resourceId, purpose, note | O   | string            | Không ghi PII vào `note`                                                                                                         |

Không có emitter thật trong repo — dataset này tồn tại để canonical schema đầy đủ theo phạm vi yêu
cầu, không phải vì có use case tiêu thụ ngay. Xem ADR 0006 "auditEvents deferred".

## Tiền tệ (mọi field VND)

`type: integer`, `minimum: 0`, `maximum: 9007199254740991` (`Number.MAX_SAFE_INTEGER`) — đúng 4 điều
kiện của `isValidVndAmount()` (`src/entities/project/validation/validateProject.ts`, exported từ
Phase 3). Không có khái niệm hào/xu ở quy mô ngân sách dự án — số thập phân luôn là lỗi dữ liệu.

## Ngày/giờ

- `date` (YYYY-MM-DD): field chỉ có ý nghĩa "ngày", không có giờ — `startDate`,
  `plannedCompletionDate`, `plannedStart`, `plannedDate`, `issuedDate`...
- `date-time` (ISO 8601 đầy đủ, có timezone): field có ý nghĩa "thời điểm" — `dataUpdatedAt`,
  `observedAt`, `openedAt`, `occurredAt`, `importedAt`, `capturedAt`...
- Không có field nào chấp nhận cả hai định dạng tuỳ ý — importer (Phase 4) phải biết trước field nào
  cần định dạng nào, từ chối nếu sai (không tự suy đoán).
