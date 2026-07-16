import { datasetManifest, formatSnapshotDate } from '../../data/datasetManifest';
import { useMapStore } from '../../stores/mapStore';

export function DatasetFooter() {
  const dataMode = useMapStore((state) => state.dataMode);
  return (
    <footer>
      <span title="Contains modified Copernicus Sentinel data 2016">SENTINEL-2 · EOX</span>
      <p>
        {dataMode === 'overview' ? (
          <>
            Chỉ tiêu cấp tỉnh:{' '}
            <a href={datasetManifest.sourceUrl} target="_blank" rel="noopener noreferrer">
              nguồn công bố {datasetManifest.sourceVersion}
            </a>{' '}
            · Chỉ tiêu cấp xã: dữ liệu minh họa.
          </>
        ) : (
          'Lớp chuyên đề đang dùng dữ liệu minh họa có seed cố định.'
        )}
      </p>
      <span title={`Phiên bản cache ${datasetManifest.cacheVersion}`}>
        SNAPSHOT {formatSnapshotDate(datasetManifest.snapshotDate)}
      </span>
    </footer>
  );
}
