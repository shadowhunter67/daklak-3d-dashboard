import { Suspense, useCallback, useState } from 'react';
import { hasWebGLSupport } from '../../components/map/webglLifecycle';
import { MapErrorBoundary, MapFallback, MapLoading } from '../../components/map/MapFallback';
import { verifiedTourismDestinations } from '../../entities/tourism/verifiedTourismDestinations';
import { useMapStore } from '../../stores/mapStore';
import { useTranslation } from '../../i18n/useTranslation';
import { DIORAMA_BASIS, type CameraPresetId } from './dioramaConfig';
import { destinationPhotoUrl } from './dioramaPhotos';
import { DIORAMA_SCENES } from './dioramaRegistry';

const PRESETS: readonly CameraPresetId[] = ['overview', 'close', 'high'];

/**
 * Diorama 3D minh hoạ cho MỘT điểm đến trong `verifiedTourismDestinations` (`#/diorama/:id`). Cảnh là
 * hình dựng thủ tục mang tính minh hoạ — KHÔNG phải mô hình đo đạc; dữ kiện (tên, mô tả, nguồn) lấy
 * từ dữ liệu điểm đến, và panel nói rõ cảnh dựng theo ảnh thực tế đã dẫn hay chỉ theo mô tả văn bản
 * (`DIORAMA_BASIS`). Không đọc/ghi state của các view khác ngoài `reducedMotion`.
 */
export function DestinationDioramaView({
  destinationId,
  onBack,
  onSelect,
}: {
  destinationId: string;
  onBack: () => void;
  /** Chuyển sang diorama của điểm đến khác (đổi route). */
  onSelect: (destinationId: string) => void;
}) {
  const { t } = useTranslation();
  const reducedMotion = useMapStore((state) => state.reducedMotion);
  const [webGLSupported] = useState(() => hasWebGLSupport());
  const [preset, setPreset] = useState<CameraPresetId>('overview');
  const [contextLost, setContextLost] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const handleLost = useCallback(() => setContextLost(true), []);
  const handleRestored = useCallback(() => setContextLost(false), []);

  const destination = verifiedTourismDestinations.find((item) => item.id === destinationId);
  const Scene = DIORAMA_SCENES[destinationId];

  if (!destination || !Scene) {
    return (
      <section id="destination-diorama" className="destination-diorama" tabIndex={-1}>
        <MapFallback
          reason={t('diorama.notFound')}
          actionLabel={t('diorama.back')}
          onRetry={onBack}
        />
      </section>
    );
  }

  const basis = DIORAMA_BASIS[destinationId] ?? 'text';
  // `text` + có ảnh: ảnh chỉ để đối chiếu, cảnh chưa chỉnh theo ảnh — nói rõ để không gây hiểu nhầm.
  const basisKey =
    basis === 'photo'
      ? 'diorama.basis.photo'
      : destination.imageUrl
        ? 'diorama.basis.textWithPhoto'
        : 'diorama.basis.text';

  return (
    <section
      id="destination-diorama"
      className="map-stage destination-diorama"
      aria-label={t('diorama.aria', { name: destination.name })}
      tabIndex={-1}
    >
      {webGLSupported ? (
        <MapErrorBoundary>
          <Suspense fallback={<MapLoading />}>
            <Scene
              preset={preset}
              reducedMotion={reducedMotion}
              onContextLost={handleLost}
              onContextRestored={handleRestored}
            />
          </Suspense>
        </MapErrorBoundary>
      ) : (
        <MapFallback
          reason={t('worldExploration.webglUnsupportedReason')}
          actionLabel={t('diorama.back')}
          onRetry={onBack}
        />
      )}
      {contextLost && (
        <p className="destination-diorama__lost" role="status">
          {t('diorama.contextLost')}
        </p>
      )}
      <div
        className="illustrative-watermark destination-diorama__badge"
        aria-label={t('diorama.illustrativeAria')}
      >
        {t('diorama.illustrativeBadge')}
      </div>
      {destination.imageUrl && (
        <figure className="destination-diorama__photo" data-open={photoOpen}>
          <button
            type="button"
            className="destination-diorama__photo-toggle"
            aria-expanded={photoOpen}
            aria-label={t(photoOpen ? 'diorama.photo.shrink' : 'diorama.photo.enlarge')}
            onClick={() => setPhotoOpen((open) => !open)}
          >
            <img
              src={destinationPhotoUrl(destination.id)}
              alt={t('diorama.photo.alt', { name: destination.name })}
              loading="lazy"
              decoding="async"
            />
          </button>
          <figcaption>
            <strong>{t('diorama.photo.caption')}</strong> {destination.imageAttribution} ·{' '}
            <a href={destination.imageUrl} target="_blank" rel="noreferrer noopener">
              {t('diorama.photo')}
            </a>{' '}
            ({destination.imageLicense})
          </figcaption>
        </figure>
      )}
      <div className="destination-diorama__panel">
        <span>{destination.name}</span>
        <p>{destination.description}</p>
        <p>
          <a href={destination.sourceUrl} target="_blank" rel="noreferrer noopener">
            {t('diorama.source')}
          </a>
        </p>
        <p className="destination-diorama__basis" data-basis={basis}>
          {t(basisKey)}
        </p>
        <div
          className="destination-diorama__controls"
          role="group"
          aria-label={t('diorama.cameraGroup')}
        >
          {PRESETS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={preset === id}
              onClick={() => setPreset(id)}
            >
              {t(`diorama.preset.${id}`)}
            </button>
          ))}
          <label className="destination-diorama__pick">
            <span className="visually-hidden">{t('diorama.pickAnother')}</span>
            <select
              value={destinationId}
              onChange={(event) => onSelect(event.target.value)}
              aria-label={t('diorama.pickAnother')}
            >
              {verifiedTourismDestinations
                .filter((item) => DIORAMA_SCENES[item.id])
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
          <button type="button" onClick={onBack}>
            {t('diorama.back')}
          </button>
        </div>
      </div>
    </section>
  );
}
