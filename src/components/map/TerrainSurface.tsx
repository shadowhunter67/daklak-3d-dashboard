import { useTexture } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useCallback, useEffect, useRef } from 'react';
import { useMapStore } from '../../stores/mapStore';
import { projection } from '../../utils/geo';
import { featureAt } from './geometryHitTest';
import {
  displacementBias,
  displacementScale,
  terrainCenter,
  terrainColorUrl,
  terrainHeight,
  terrainHeightUrl,
  terrainMaskUrl,
  terrainNorthWest,
  terrainNormalUrl,
  terrainSegments,
  terrainSouthEast,
  terrainWidth,
} from './terrainConfig';

function codeFromUv(uv: { x: number; y: number } | undefined) {
  if (!uv || !projection.invert) return null;
  const projectedX = terrainNorthWest[0] + uv.x * terrainWidth;
  const projectedY = terrainSouthEast[1] - uv.y * terrainHeight;
  const coordinate = projection.invert([projectedX, projectedY]);
  return coordinate ? (featureAt(coordinate)?.properties.code ?? null) : null;
}

export function TerrainSurface() {
  const [colorMap, heightMap, normalMap, alphaMap] = useTexture([
    terrainColorUrl,
    terrainHeightUrl,
    terrainNormalUrl,
    terrainMaskUrl,
  ]);
  const setHovered = useMapStore((state) => state.setHovered);
  const select = useMapStore((state) => state.select);
  const pendingUv = useRef<{ x: number; y: number } | null>(null);
  const animationFrame = useRef<number | null>(null);

  const flushHover = useCallback(() => {
    animationFrame.current = null;
    const code = codeFromUv(pendingUv.current ?? undefined);
    if (useMapStore.getState().hoveredCode !== code) setHovered(code);
    document.body.style.cursor = code ? 'pointer' : 'default';
  }, [setHovered]);

  useEffect(
    () => () => {
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
      document.body.style.cursor = 'default';
    },
    [],
  );

  return (
    <mesh
      position={terrainCenter}
      onPointerMove={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        if (!event.uv) return;
        pendingUv.current = { x: event.uv.x, y: event.uv.y };
        if (animationFrame.current === null)
          animationFrame.current = requestAnimationFrame(flushHover);
      }}
      onPointerOut={() => {
        pendingUv.current = null;
        if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
        animationFrame.current = null;
        setHovered(null);
        document.body.style.cursor = 'default';
      }}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        const code = codeFromUv(event.uv);
        if (code) select(useMapStore.getState().selectedCode === code ? null : code);
      }}
    >
      <planeGeometry args={[terrainWidth, terrainHeight, ...terrainSegments]} />
      <meshStandardMaterial
        map={colorMap}
        normalMap={normalMap}
        displacementMap={heightMap}
        displacementScale={displacementScale}
        displacementBias={displacementBias}
        alphaMap={alphaMap}
        alphaTest={0.25}
        roughness={0.82}
        metalness={0.02}
      />
    </mesh>
  );
}
