import { useEffect, useRef, useState } from 'react';
import { DATASET_CATALOG } from '../../data-platform/catalog/datasets';
import { DOCUMENT_REFERENCES } from '../../data-platform/catalog/documents';
import { computeFreshness, summarizeDataStatus } from '../../data-platform/catalog/freshness';
import type { DatasetDescriptor, DocumentReference } from '../../data-platform/schemas/dataset';
import { useMapStore } from '../../stores/mapStore';
import { DataStatusSummary } from './DataStatusSummary';

const CLASSIFICATION_LABELS: Record<DatasetDescriptor['classification'], string> = {
  public: 'Công khai',
  internal: 'Nội bộ',
  confidential: 'Bảo mật',
  restricted: 'Hạn chế',
};

const AUTHORITY_LABELS: Record<DatasetDescriptor['authority'], string> = {
  official: 'Chính thức',
  'authoritative-third-party': 'Bên thứ ba có thẩm quyền',
  'open-community': 'Cộng đồng mở',
  illustrative: 'Minh họa',
  unknown: 'Chưa xác định',
};

const FRESHNESS_LABELS = {
  current: 'Còn mới',
  aging: 'Sắp cũ',
  stale: 'Đã cũ',
  unknown: 'Chưa rõ',
} as const;

function DatasetCard({ dataset }: { dataset: DatasetDescriptor }) {
  const freshness = computeFreshness(dataset);
  return (
    <li className="provenance-dataset-card" data-classification={dataset.classification}>
      <h4>{dataset.title}</h4>
      <p>{dataset.description}</p>
      <dl>
        <div>
          <dt>Nguồn</dt>
          <dd>
            {dataset.source.sourceUrl ? (
              <a href={dataset.source.sourceUrl} target="_blank" rel="noopener noreferrer">
                {dataset.source.organization}
              </a>
            ) : (
              dataset.source.organization
            )}
          </dd>
        </div>
        {dataset.period && (
          <div>
            <dt>Kỳ dữ liệu</dt>
            <dd>{dataset.period.label}</dd>
          </div>
        )}
        {dataset.source.retrievalDate && (
          <div>
            <dt>Ngày truy xuất</dt>
            <dd>{dataset.source.retrievalDate}</dd>
          </div>
        )}
        <div>
          <dt>Trạng thái</dt>
          <dd>{AUTHORITY_LABELS[dataset.authority]}</dd>
        </div>
        <div>
          <dt>Phân loại</dt>
          <dd>{CLASSIFICATION_LABELS[dataset.classification]}</dd>
        </div>
        {dataset.source.license && (
          <div>
            <dt>Giấy phép</dt>
            <dd>{dataset.source.license}</dd>
          </div>
        )}
        {dataset.quality.geometryStatus && (
          <div>
            <dt>Trạng thái geometry</dt>
            <dd>{dataset.quality.geometryStatus}</dd>
          </div>
        )}
        <div>
          <dt>Độ mới</dt>
          <dd>{FRESHNESS_LABELS[freshness]}</dd>
        </div>
      </dl>
      {dataset.quality.knownLimitations.length > 0 && (
        <details>
          <summary>Giới hạn đã biết ({dataset.quality.knownLimitations.length})</summary>
          <ul>
            {dataset.quality.knownLimitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

function DocumentReferenceCard({ doc }: { doc: DocumentReference }) {
  return (
    <li className="provenance-dataset-card" data-classification="public">
      <h4>{doc.title}</h4>
      <dl>
        <div>
          <dt>Cơ quan ban hành</dt>
          <dd>{doc.issuingAuthority}</dd>
        </div>
        {doc.documentNumber && (
          <div>
            <dt>Số văn bản</dt>
            <dd>{doc.documentNumber}</dd>
          </div>
        )}
        {doc.issuedDate && (
          <div>
            <dt>Ngày ban hành</dt>
            <dd>{doc.issuedDate}</dd>
          </div>
        )}
        <div>
          <dt>Xác minh</dt>
          <dd>{doc.verificationStatus === 'verified' ? 'Đã xác minh' : 'Cần xác minh thêm'}</dd>
        </div>
      </dl>
      <p>{doc.applicability}</p>
      {doc.sourceUrl && (
        <p>
          <a href={doc.sourceUrl} target="_blank" rel="noopener noreferrer">
            Nguồn
          </a>
        </p>
      )}
      {doc.note && (
        <details>
          <summary>Ghi chú</summary>
          <ul>
            <li>{doc.note}</li>
          </ul>
        </details>
      )}
    </li>
  );
}

export function DataProvenancePanel() {
  const [open, setOpen] = useState(false);
  const previousFocus = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const provenancePanelSignal = useMapStore((state) => state.provenancePanelSignal);
  const previousSignal = useRef(provenancePanelSignal);

  const dismiss = () => {
    setOpen(false);
    requestAnimationFrame(() => {
      const target = previousFocus.current?.isConnected
        ? previousFocus.current
        : document.getElementById('open-data-provenance-panel');
      target?.focus();
    });
  };

  useEffect(() => {
    if (previousSignal.current === provenancePanelSignal) return;
    previousSignal.current = provenancePanelSignal;
    previousFocus.current = document.activeElement as HTMLElement | null;
    setOpen(true);
  }, [provenancePanelSignal]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;

  const counts = summarizeDataStatus(DATASET_CATALOG);

  return (
    <div className="provenance-panel-backdrop" role="presentation">
      <section
        className="provenance-panel-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="provenance-panel-title"
        ref={panelRef}
      >
        <div className="provenance-panel-header">
          <h2 id="provenance-panel-title">Nguồn và chất lượng dữ liệu</h2>
          <button type="button" autoFocus onClick={dismiss} aria-label="Đóng bảng nguồn dữ liệu">
            Đóng
          </button>
        </div>
        <DataStatusSummary counts={counts} />
        <ul className="provenance-dataset-list">
          {DATASET_CATALOG.map((dataset) => (
            <DatasetCard key={dataset.id} dataset={dataset} />
          ))}
        </ul>
        <h3>Văn bản quy hoạch tham chiếu</h3>
        <ul className="provenance-dataset-list">
          {DOCUMENT_REFERENCES.map((doc) => (
            <DocumentReferenceCard key={doc.id} doc={doc} />
          ))}
        </ul>
      </section>
    </div>
  );
}
