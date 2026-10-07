import { useMemo } from 'react';
import * as THREE from 'three';
import type { Placement } from './dioramaGeometry';

/**
 * Trả về hàm gán ma trận + màu từng thể hiện cho một InstancedMesh từ danh sách `Placement`.
 * Dùng chung cho đá, tán cây, cỏ… (tách khỏi `dioramaKit.tsx` vì lint chỉ cho file component xuất component).
 */
export function useMatrixSetter(placements: Placement[]) {
  return useMemo(() => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    return (mesh: THREE.InstancedMesh | null, base: string) => {
      // Chỉ áp ma trận cho InstancedMesh thật (ref là null khi unmount; trong test jsdom là phần tử DOM).
      if (!(mesh instanceof THREE.InstancedMesh)) return;
      placements.forEach((placement, index) => {
        dummy.position.set(...placement.position);
        dummy.rotation.set(0, placement.rotationY, 0);
        dummy.scale.set(...placement.scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        color.set(base).offsetHSL(0, 0, placement.hue);
        mesh.setColorAt(index, color);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };
  }, [placements]);
}
