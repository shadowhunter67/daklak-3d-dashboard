import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useTranslation } from '../../i18n/useTranslation';
import { panoramaUrl, type PanoramaSource } from './panoramas';

/** Quả cầu nhìn từ bên trong, dán ảnh equirectangular; kéo để xoay, không zoom/pan. */
function PanoramaSphere({ url, onError }: { url: string; onError: () => void }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let disposed = false;
    let loaded: THREE.Texture | null = null;
    new THREE.TextureLoader().load(
      url,
      (tex) => {
        if (disposed) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        loaded = tex;
        setTexture(tex);
      },
      undefined,
      onError,
    );
    return () => {
      disposed = true;
      loaded?.dispose();
    };
  }, [url, onError]);
  if (!texture) return null;
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[50, 64, 40]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  );
}

export function PanoramaViewer({
  panorama,
  name,
  onClose,
}: {
  panorama: PanoramaSource;
  name: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  return (
    <div
      className="destination-diorama__pano"
      role="dialog"
      aria-label={t('diorama.pano.aria', { name })}
    >
      {failed ? (
        <p role="alert">{t('diorama.pano.failed')}</p>
      ) : (
        <Canvas camera={{ fov: 75, position: [0, 0, 0.01], near: 0.1, far: 200 }}>
          <PanoramaSphere url={panoramaUrl(panorama.file)} onError={() => setFailed(true)} />
          <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={-0.35} enableDamping />
        </Canvas>
      )}
      <div className="destination-diorama__pano-bar">
        <span>
          {t('diorama.pano.hint')} · {panorama.attribution} ·{' '}
          <a href={panorama.sourceUrl} target="_blank" rel="noreferrer noopener">
            {t('diorama.pano.source')}
          </a>{' '}
          ({panorama.license})
        </span>
        <button type="button" onClick={onClose}>
          {t('diorama.pano.close')}
        </button>
      </div>
    </div>
  );
}
