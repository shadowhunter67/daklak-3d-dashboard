import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/**
 * Bloom nhẹ làm mờ sáng quanh vùng rất sáng (nước đổ, bọt, mặt nước phản chiếu). Chỉ gắn khi máy mạnh
 * và không bật giảm chuyển động (`DioramaCanvas` quyết định). Khi gắn, thành phần này nhận quyền vẽ khung
 * hình (ưu tiên 1 của useFrame) và đưa qua EffectComposer có MSAA; OutputPass lo tone mapping/màu sắc
 * cuối cùng thay cho renderer.
 */
export function Bloom({ strength = 0.18, radius = 0.5, threshold = 1.05 }: BloomProps) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  const composer = useMemo(() => {
    const ratio = gl.getPixelRatio();
    const target = new THREE.WebGLRenderTarget(size.width * ratio, size.height * ratio, {
      type: THREE.HalfFloatType,
      samples: 4,
    });
    const result = new EffectComposer(gl, target);
    result.addPass(new RenderPass(scene, camera));
    result.addPass(
      new UnrealBloomPass(new THREE.Vector2(size.width, size.height), strength, radius, threshold),
    );
    result.addPass(new OutputPass());
    return result;
    // Dựng một lần; kích thước đổi được xử lý riêng trong effect bên dưới.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera]);

  useEffect(() => {
    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(size.width, size.height);
  }, [composer, gl, size.width, size.height]);

  useEffect(() => () => composer.dispose(), [composer]);

  useFrame(() => {
    composer.render();
  }, 1);

  return null;
}

export interface BloomProps {
  strength?: number;
  radius?: number;
  threshold?: number;
}
