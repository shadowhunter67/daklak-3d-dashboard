import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/** Đốm tròn mềm (gradient xuyên tâm) dùng làm sprite cho sương, bọt, hạt bụi. */
export function useSoftSpot(): THREE.CanvasTexture {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    if (context) {
      const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.5, 'rgba(255,255,255,0.45)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
