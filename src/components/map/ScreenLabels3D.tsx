import { Html, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Vector3, type Group } from 'three';
import labels from '#province-assets/daklak-labels.json';
import { useMapStore } from '../../stores/mapStore';
import { projection } from '../../utils/geo';
import {
  displacementBias,
  displacementScale,
  terrainHeight,
  terrainHeightUrl,
  terrainNorthWest,
  terrainWidth,
} from './terrainConfig';
import { layoutScreenLabels, type ScreenLabelAnchor } from './screenLabelLayout';

type LabelEntry = { name: string; longitude: number; latitude: number; priority: number };
const entries = Object.entries(labels as Record<string, LabelEntry>);

/** Lift above the terrain surface so a label anchor never sinks into a ridge. */
const ANCHOR_LIFT = 0.03;
const BASE_FONT_PX = 14;

/** Bilinear-free nearest sample of the terrain height texture, 0..1, for each label anchor. Done
 * once: the CPU needs the elevation only to place the anchor above the displaced terrain, exactly
 * where the shader draws it. */
function sampleElevations(image: CanvasImageSource & { width: number; height: number }): number[] {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return entries.map(() => 0);
  context.drawImage(image, 0, 0);
  return entries.map(([, label]) => {
    const point = projection([label.longitude, label.latitude]);
    if (!point) return 0;
    const u = (point[0] - terrainNorthWest[0]) / terrainWidth;
    const v = (point[1] - terrainNorthWest[1]) / terrainHeight;
    const px = Math.min(Math.max(Math.round(u * (canvas.width - 1)), 0), canvas.width - 1);
    const py = Math.min(Math.max(Math.round(v * (canvas.height - 1)), 0), canvas.height - 1);
    return context.getImageData(px, py, 1, 1).data[0] / 255;
  });
}

/**
 * All 102 ward/commune names for the 3D map, drawn as horizontal screen-space labels (never
 * painted into the terrain texture). Each frame in which the camera, viewport, selection or text
 * scale changed, the 3D anchors are projected to pixels, `layoutScreenLabels` resolves collisions
 * (displacing a label and drawing a leader line, never hiding one), and the result is written
 * straight to the DOM — no React re-render per frame. The overlay is `aria-hidden`: the ward
 * directory is the accessible path to the same information.
 */
export function ScreenLabels3D() {
  const selectedCode = useMapStore((state) => state.selectedCode);
  const heightMap = useTexture(terrainHeightUrl);
  const groupRef = useRef<Group>(null);
  const labelRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const lineRefs = useRef<Array<SVGLineElement | null>>([]);
  const lastKey = useRef('');
  const scratch = useMemo(() => new Vector3(), []);
  const localAnchors = useMemo(() => {
    const elevations = sampleElevations(heightMap.image as HTMLImageElement);
    return entries.map(([code, label], index) => {
      const point = projection([label.longitude, label.latitude])!;
      return {
        code,
        label,
        local: new Vector3(
          point[0],
          -point[1],
          elevations[index] * displacementScale + displacementBias + ANCHOR_LIFT,
        ),
      };
    });
  }, [heightMap]);

  useFrame(({ camera, size }) => {
    const group = groupRef.current;
    // The Html portal mounts after the first frames; wait until the label nodes exist so the key
    // below is not "consumed" by a frame that had nothing to write to.
    if (!group || !labelRefs.current[entries.length - 1]) return;
    const scale =
      Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--user-font-scale'),
      ) || 1;
    const key = [
      camera.matrixWorld.elements.join(','),
      camera.zoom,
      size.width,
      size.height,
      selectedCode,
      scale,
    ].join('|');
    if (key === lastKey.current) return;
    lastKey.current = key;

    group.updateWorldMatrix(true, false);
    const anchors: ScreenLabelAnchor[] = localAnchors.map(({ code, label, local }) => {
      scratch.copy(local);
      group.localToWorld(scratch);
      scratch.project(camera);
      return {
        code,
        name: label.name.normalize('NFC'),
        x: (scratch.x * 0.5 + 0.5) * size.width,
        y: (-scratch.y * 0.5 + 0.5) * size.height,
        priority: label.priority,
        emphasized: code === selectedCode,
      };
    });
    const placed = layoutScreenLabels(
      anchors,
      { width: size.width, height: size.height },
      { fontSize: BASE_FONT_PX * scale },
    );
    placed.forEach((label, index) => {
      const element = labelRefs.current[index];
      if (element) {
        element.style.transform = `translate(${label.x.toFixed(1)}px, ${label.y.toFixed(1)}px) translate(-50%, -50%)`;
        element.dataset.selected = label.code === selectedCode ? 'true' : 'false';
        element.dataset.displaced = String(label.displaced);
      }
      const line = lineRefs.current[index];
      if (line) {
        if (label.displaced) {
          line.setAttribute('x1', label.anchorX.toFixed(1));
          line.setAttribute('y1', label.anchorY.toFixed(1));
          line.setAttribute('x2', label.x.toFixed(1));
          line.setAttribute('y2', label.y.toFixed(1));
          line.style.display = '';
        } else {
          line.style.display = 'none';
        }
      }
    });
  });

  return (
    <group ref={groupRef}>
      <Html fullscreen zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <div className="screen-labels" aria-hidden="true" data-testid="screen-labels-3d">
          <svg className="screen-labels__leaders">
            {entries.map(([code], index) => (
              <line
                key={code}
                ref={(node) => {
                  lineRefs.current[index] = node;
                }}
                style={{ display: 'none' }}
              />
            ))}
          </svg>
          {entries.map(([code, label], index) => (
            <span
              key={code}
              ref={(node) => {
                labelRefs.current[index] = node;
              }}
              className="screen-labels__label"
              data-code={code}
            >
              {label.name.normalize('NFC')}
            </span>
          ))}
        </div>
      </Html>
    </group>
  );
}
