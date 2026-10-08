import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useShadows } from './dioramaContext';
import { REAL_FOOTPRINTS } from './realFootprints';

/**
 * Khối nhà đùn lên từ đa giác mặt bằng THẬT (OpenStreetMap, xem realFootprints.ts). Mặt bằng đúng theo mét;
 * chiều cao là ước lượng (số tầng × 3,5 m khi OSM có `building:levels`, nếu không là giá trị mặc định) nên chỉ là khối đại diện.
 */
export function FootprintBuilding({
  site,
  metersPerUnit,
  heightMeters,
  color = '#d8cdb0',
}: {
  site: string;
  metersPerUnit: number;
  heightMeters: number;
  color?: string;
}) {
  const shadows = useShadows();
  const geometry = useMemo(() => {
    const polygon = REAL_FOOTPRINTS[site];
    const shape = new THREE.Shape(
      polygon.map(([x, y]) => new THREE.Vector2(x / metersPerUnit, y / metersPerUnit)),
    );
    const result = new THREE.ExtrudeGeometry(shape, {
      depth: heightMeters / metersPerUnit,
      bevelEnabled: false,
    });
    // Shape nằm trong mặt (x, y) và đùn theo +z: xoay để y → -z (bắc = -z), đùn lên +y.
    result.rotateX(-Math.PI / 2);
    return result;
  }, [site, metersPerUnit, heightMeters]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} castShadow={shadows} receiveShadow={shadows}>
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}
