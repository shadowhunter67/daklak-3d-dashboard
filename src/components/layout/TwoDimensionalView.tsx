import { useState } from 'react';
import { AccessibleDirectory } from '../dashboard/AccessibleDirectory';
import { AdministrativeMap2D } from '../map/AdministrativeMap2D';

export function TwoDimensionalView() {
  const [mobilePane, setMobilePane] = useState<'map' | 'directory'>('map');
  return (
    <div className={`two-dimensional-view two-dimensional-view--${mobilePane}`}>
      <div className="two-dimensional-view__switch" role="group" aria-label="Nội dung bản đồ 2D">
        <button
          type="button"
          aria-pressed={mobilePane === 'map'}
          onClick={() => setMobilePane('map')}
        >
          Bản đồ
        </button>
        <button
          type="button"
          aria-pressed={mobilePane === 'directory'}
          onClick={() => setMobilePane('directory')}
        >
          Danh sách
        </button>
      </div>
      <AdministrativeMap2D />
      <AccessibleDirectory />
    </div>
  );
}
