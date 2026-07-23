import { useEffect, useRef } from 'react';
import { DATASET_CATALOG } from '../../data-platform/catalog/datasets';
import { DOCUMENT_REFERENCES } from '../../data-platform/catalog/documents';
import { computeFreshness, summarizeDataStatus } from '../../data-platform/catalog/freshness';
import type {
  DatasetDescriptor,
  DocumentEvidenceLevel,
  DocumentReference,
} from '../../data-platform/schemas/dataset';
import { useMapStore } from '../../stores/mapStore';
import { DataStatusSummary } from './DataStatusSummary';
import { consumeProvenanceFocusTrigger } from './provenanceFocusTrigger';

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

const EVIDENCE_LEVEL_LABELS: Record<DocumentEvidenceLevel, string> = {
  'official-primary-document': 'Văn bản gốc chính thức',
  'official-publication-reference': 'Bài công bố chính thức',
  'authoritative-secondary-reference': 'Nguồn tham chiếu có thẩm quyền',
  unverified: 'Chưa xác minh',
};

const VERIFICATION_STATUS_LABELS: Record<DocumentReference['verificationStatus'], string> = {
  verified: 'Đã xác minh',
  'research-needed': 'Cần xác minh thêm',
};

const FRESHNESS_LABELS = {
  current: 'Còn mới',
  aging: 'Sắp cũ',
  stale: 'Đã cũ',
  unknown: 'Chưa rõ',
} as const;

/** Never render a raw `<a href>` to a non-HTTP(S) scheme (e.g. a fake `internal://` URI) —
 * see `source.repositoryPath` for how in-repo sources are represented instead. */
function isHttpsUrl(url: string): boolean {
  return url.startsWith('https://');
}

function SourceReference({ source }: { source: DatasetDescriptor['source'] }) {
  if (source.sourceUrl && isHttpsUrl(source.sourceUrl)) {
    return (
      <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer">
        {source.organization}
      </a>
    );
  }
  if (source.repositoryPath) {
    return (
      <>
        {source.organization} — nguồn trong repository: <code>{source.repositoryPath}</code>
      </>
    );
  }
  return <>{source.organization}</>;
}

function AuthorityFields({ dataset }: { dataset: DatasetDescriptor }) {
  if (!dataset.authorityDetail) {
    return (
      <div>
        <dt>Trạng thái</dt>
        <dd>{AUTHORITY_LABELS[dataset.authority]}</dd>
      </div>
    );
  }
  const { identityAuthority, geometryAuthority, metricAuthority } = dataset.authorityDetail;
  return (
    <>
      {identityAuthority && (
        <div>
          <dt>Tên/mã hành chính</dt>
          <dd>{AUTHORITY_LABELS[identityAuthority]}</dd>
        </div>
      )}
      {geometryAuthority && (
        <div>
          <dt>Geometry</dt>
          <dd>
            {AUTHORITY_LABELS[geometryAuthority]}
            {dataset.quality.geometryStatus === 'reference'
              ? ' — dữ liệu tham khảo, không phải địa giới pháp lý'
              : ''}
          </dd>
        </div>
      )}
      {metricAuthority && (
        <div>
          <dt>Chỉ số</dt>
          <dd>{AUTHORITY_LABELS[metricAuthority]}</dd>
        </div>
      )}
    </>
  );
}

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
            <SourceReference source={dataset.source} />
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
        <AuthorityFields dataset={dataset} />
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
  const evidenceLevel = doc.evidenceLevel ?? 'unverified';
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
          <dt>Trạng thái xác minh</dt>
          <dd>{VERIFICATION_STATUS_LABELS[doc.verificationStatus]}</dd>
        </div>
        <div>
          <dt>Mức bằng chứng</dt>
          <dd>{EVIDENCE_LEVEL_LABELS[evidenceLevel]}</dd>
        </div>
      </dl>
      <p>{doc.applicability}</p>
      {doc.sourceUrl && isHttpsUrl(doc.sourceUrl) && (
        <p>
          <a href={doc.sourceUrl} target="_blank" rel="noopener noreferrer">
            Xem văn bản trên nguồn: {doc.issuingAuthority}
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

/** In DOM order: the close button (autoFocus'd on mount), dataset/document source links, and
 * `<summary>` disclosure toggles — the only things a keyboard user can reach inside this dialog. */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/**
 * Mounted by App.tsx only while `provenancePanelOpen` is true (see mapStore.ts) — this component
 * has no internal open/closed state of its own; mount IS open, unmount IS closed. That's what lets
 * it be a real React.lazy boundary without racing a click that fires before the chunk resolves:
 * the boolean lives in the always-loaded store, not in a ref inside this component.
 */
export function DataProvenancePanel() {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeProvenancePanel = useMapStore((state) => state.closeProvenancePanel);

  // Focus return: the trigger element is captured by the caller's click handler (before this
  // dialog mounts and autoFocuses its own close button — see provenanceFocusTrigger.ts for why
  // `document.activeElement` can't be read reliably in here), then restored on unmount.
  useEffect(() => {
    const previouslyFocused = consumeProvenanceFocusTrigger();
    return () => {
      const target = previouslyFocused?.isConnected
        ? previouslyFocused
        : document.getElementById('open-data-provenance-panel');
      target?.focus();
    };
  }, []);

  // Body scroll lock while the dialog is open, restored to whatever it was before on close.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Escape closes; Tab/Shift+Tab wrap focus inside the dialog instead of escaping to the page
  // behind it (a real focus trap, not just an initial autoFocus).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeProvenancePanel();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeProvenancePanel]);

  const counts = summarizeDataStatus(DATASET_CATALOG);

  return (
    <div
      className="provenance-panel-backdrop"
      role="presentation"
      onClick={(event) => {
        // Only a direct click on the backdrop itself closes — a click that bubbled up from
        // something inside the dialog must not (event.target !== event.currentTarget then).
        if (event.target === event.currentTarget) closeProvenancePanel();
      }}
    >
      <section
        className="provenance-panel-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="provenance-panel-title"
        ref={panelRef}
      >
        <div className="provenance-panel-header">
          <h2 id="provenance-panel-title">Nguồn và chất lượng dữ liệu</h2>
          <button
            type="button"
            autoFocus
            onClick={closeProvenancePanel}
            aria-label="Đóng bảng nguồn dữ liệu"
          >
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
