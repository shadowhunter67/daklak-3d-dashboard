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
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';
import { DataStatusSummary } from './DataStatusSummary';
import { consumeProvenanceFocusTrigger } from './provenanceFocusTrigger';

const CLASSIFICATION_KEYS: Record<DatasetDescriptor['classification'], MessageKey> = {
  public: 'classification.public',
  internal: 'classification.internal',
  confidential: 'classification.confidential',
  restricted: 'classification.restricted',
};

const AUTHORITY_KEYS: Record<DatasetDescriptor['authority'], MessageKey> = {
  official: 'authority.official',
  'authoritative-third-party': 'authority.authoritative-third-party',
  'open-community': 'authority.open-community',
  illustrative: 'authority.illustrative',
  unknown: 'authority.unknown',
};

const EVIDENCE_LEVEL_KEYS: Record<DocumentEvidenceLevel, MessageKey> = {
  'official-primary-document': 'evidenceLevel.official-primary-document',
  'official-publication-reference': 'evidenceLevel.official-publication-reference',
  'authoritative-secondary-reference': 'evidenceLevel.authoritative-secondary-reference',
  unverified: 'evidenceLevel.unverified',
};

const VERIFICATION_STATUS_KEYS: Record<DocumentReference['verificationStatus'], MessageKey> = {
  verified: 'verificationStatus.verified',
  'research-needed': 'verificationStatus.research-needed',
};

const FRESHNESS_KEYS = {
  current: 'dataStatus.current',
  aging: 'dataStatus.aging',
  stale: 'dataStatus.stale',
  unknown: 'dataStatus.unknown',
} as const satisfies Record<string, MessageKey>;

/** Never render a raw `<a href>` to a non-HTTP(S) scheme (e.g. a fake `internal://` URI) —
 * see `source.repositoryPath` for how in-repo sources are represented instead. */
function isHttpsUrl(url: string): boolean {
  return url.startsWith('https://');
}

function SourceReference({ source }: { source: DatasetDescriptor['source'] }) {
  const { t } = useTranslation();
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
        {t('provenance.repositorySourcePrefix', { organization: source.organization })}{' '}
        <code>{source.repositoryPath}</code>
      </>
    );
  }
  return <>{source.organization}</>;
}

function AuthorityFields({ dataset }: { dataset: DatasetDescriptor }) {
  const { t } = useTranslation();
  if (!dataset.authorityDetail) {
    return (
      <div>
        <dt>{t('provenance.status')}</dt>
        <dd>{t(AUTHORITY_KEYS[dataset.authority])}</dd>
      </div>
    );
  }
  const { identityAuthority, geometryAuthority, metricAuthority } = dataset.authorityDetail;
  return (
    <>
      {identityAuthority && (
        <div>
          <dt>{t('provenance.administrativeNameCode')}</dt>
          <dd>{t(AUTHORITY_KEYS[identityAuthority])}</dd>
        </div>
      )}
      {geometryAuthority && (
        <div>
          <dt>Geometry</dt>
          <dd>
            {t(AUTHORITY_KEYS[geometryAuthority])}
            {dataset.quality.geometryStatus === 'reference'
              ? t('provenance.geometryReferenceNote')
              : ''}
          </dd>
        </div>
      )}
      {metricAuthority && (
        <div>
          <dt>{t('provenance.indicator')}</dt>
          <dd>{t(AUTHORITY_KEYS[metricAuthority])}</dd>
        </div>
      )}
    </>
  );
}

function DatasetCard({ dataset }: { dataset: DatasetDescriptor }) {
  const { t } = useTranslation();
  const freshness = computeFreshness(dataset);
  return (
    <li className="provenance-dataset-card" data-classification={dataset.classification}>
      <h4>{dataset.title}</h4>
      <p>{dataset.description}</p>
      <dl>
        <div>
          <dt>{t('provenance.source')}</dt>
          <dd>
            <SourceReference source={dataset.source} />
          </dd>
        </div>
        {dataset.period && (
          <div>
            <dt>{t('provenance.period')}</dt>
            <dd>{dataset.period.label}</dd>
          </div>
        )}
        {dataset.source.retrievalDate && (
          <div>
            <dt>{t('provenance.retrievalDate')}</dt>
            <dd>{dataset.source.retrievalDate}</dd>
          </div>
        )}
        <AuthorityFields dataset={dataset} />
        <div>
          <dt>{t('provenance.classification')}</dt>
          <dd>{t(CLASSIFICATION_KEYS[dataset.classification])}</dd>
        </div>
        {dataset.source.license && (
          <div>
            <dt>{t('provenance.license')}</dt>
            <dd>{dataset.source.license}</dd>
          </div>
        )}
        {dataset.quality.geometryStatus && (
          <div>
            <dt>{t('provenance.geometryStatus')}</dt>
            <dd>{t(`geometryStatus.${dataset.quality.geometryStatus}` as MessageKey)}</dd>
          </div>
        )}
        <div>
          <dt>{t('provenance.freshness')}</dt>
          <dd>{t(FRESHNESS_KEYS[freshness])}</dd>
        </div>
      </dl>
      {dataset.quality.knownLimitations.length > 0 && (
        <details>
          <summary>
            {t('provenance.knownLimitations', { count: dataset.quality.knownLimitations.length })}
          </summary>
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
  const { t } = useTranslation();
  const evidenceLevel = doc.evidenceLevel ?? 'unverified';
  return (
    <li className="provenance-dataset-card" data-classification="public">
      <h4>{doc.title}</h4>
      <dl>
        <div>
          <dt>{t('provenance.issuingAuthority')}</dt>
          <dd>{doc.issuingAuthority}</dd>
        </div>
        {doc.documentNumber && (
          <div>
            <dt>{t('provenance.documentNumber')}</dt>
            <dd>{doc.documentNumber}</dd>
          </div>
        )}
        {doc.issuedDate && (
          <div>
            <dt>{t('provenance.issuedDate')}</dt>
            <dd>{doc.issuedDate}</dd>
          </div>
        )}
        <div>
          <dt>{t('provenance.verificationStatus')}</dt>
          <dd>{t(VERIFICATION_STATUS_KEYS[doc.verificationStatus])}</dd>
        </div>
        <div>
          <dt>{t('provenance.evidenceLevel')}</dt>
          <dd>{t(EVIDENCE_LEVEL_KEYS[evidenceLevel])}</dd>
        </div>
      </dl>
      <p>{doc.applicability}</p>
      {doc.sourceUrl && isHttpsUrl(doc.sourceUrl) && (
        <p>
          <a href={doc.sourceUrl} target="_blank" rel="noopener noreferrer">
            {t('provenance.viewSourceDocument', { authority: doc.issuingAuthority })}
          </a>
        </p>
      )}
      {doc.note && (
        <details>
          <summary>{t('provenance.note')}</summary>
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
  const { t } = useTranslation();
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
          <h2 id="provenance-panel-title">{t('provenance.panelHeading')}</h2>
          <button
            type="button"
            autoFocus
            onClick={closeProvenancePanel}
            aria-label={t('provenance.closeAria')}
          >
            {t('provenance.close')}
          </button>
        </div>
        <DataStatusSummary counts={counts} />
        <ul className="provenance-dataset-list">
          {DATASET_CATALOG.map((dataset) => (
            <DatasetCard key={dataset.id} dataset={dataset} />
          ))}
        </ul>
        <h3>{t('provenance.referenceDocumentsHeading')}</h3>
        <ul className="provenance-dataset-list">
          {DOCUMENT_REFERENCES.map((doc) => (
            <DocumentReferenceCard key={doc.id} doc={doc} />
          ))}
        </ul>
      </section>
    </div>
  );
}
