import { OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useRef } from 'react';
import { OrthographicCamera, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import labels from '../../assets/maps/daklak/daklak-labels.json';
import { useMapStore } from '../../stores/mapStore';
import { projection } from '../../utils/geo';
import { shouldHandleCameraKey } from './cameraKeyboard';
import {
  areInsetsEqual,
  calculateInsetDelta,
  calculateRelativeZoom,
  clampZoom,
  getCorrectionToSafeRect,
  getSafeViewportRect,
  measureViewportInsets,
  type Point2D,
  type ViewportInsets,
} from './viewportInsets';

export type CameraAdjustmentReason =
  'initial-fit' | 'viewport-resize' | 'sheet-inset-change' | 'selection-change' | 'manual-reset';

interface CameraSnapshot {
  zoom: number;
  position: Vector3;
  target: Vector3;
}

type LabelMap = Record<string, { longitude: number; latitude: number }>;

const BASE_ZOOM = 246;
const MIN_ZOOM = 60;
const MAX_ZOOM = 340;
const EMPTY_INSETS: ViewportInsets = { top: 0, right: 0, bottom: 0, left: 0 };

function snapshotCamera(camera: OrthographicCamera, controls: OrbitControlsImpl): CameraSnapshot {
  return { zoom: camera.zoom, position: camera.position.clone(), target: controls.target.clone() };
}

export function CameraControls() {
  const autoRotate = useMapStore((state) => state.autoRotate);
  const selectedCode = useMapStore((state) => state.selectedCode);
  const controls = useRef<OrbitControlsImpl>(null);
  const pressed = useRef(new Set<string>());
  const previousInsets = useRef(EMPTY_INSETS);
  const previousSize = useRef({ width: 0, height: 0 });
  const initialized = useRef(false);
  const previousSelection = useRef(selectedCode);
  const userInteracting = useRef(false);
  const pendingReason = useRef<CameraAdjustmentReason | null>(null);
  const scheduledFrame = useRef(0);

  const updateDebugState = useCallback((reason: CameraAdjustmentReason) => {
    const stage = document.getElementById('map-viewport');
    const control = controls.current;
    if (!stage || !control || !(control.object instanceof OrthographicCamera)) return;
    stage.dataset.cameraState = JSON.stringify({
      zoom: control.object.zoom,
      target: control.target.toArray(),
      position: control.object.position.toArray(),
      reason,
    });
  }, []);

  const panByPixels = useCallback((correction: Point2D) => {
    const control = controls.current;
    if (!control || !(control.object instanceof OrthographicCamera)) return;
    const camera = control.object;
    const cameraRight = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const cameraUp = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const worldShift = cameraRight
      .multiplyScalar(-correction.x / camera.zoom)
      .add(cameraUp.multiplyScalar(correction.y / camera.zoom));
    camera.position.add(worldShift);
    control.target.add(worldShift);
  }, []);

  const keepSelectionVisible = useCallback(() => {
    const stage = document.getElementById('map-viewport');
    const control = controls.current;
    const label = selectedCode ? (labels as LabelMap)[selectedCode] : null;
    if (!stage || !control || !label || !(control.object instanceof OrthographicCamera)) return;
    const camera = control.object;
    const point = projection([label.longitude, label.latitude]);
    if (!point) return;
    const world = new Vector3(point[0], 0.34, point[1]).project(camera);
    const { width, height } = stage.getBoundingClientRect();
    const screen = { x: ((world.x + 1) / 2) * width, y: ((1 - world.y) / 2) * height };
    const safeRect = getSafeViewportRect(width, height, measureViewportInsets(stage));
    const correction = getCorrectionToSafeRect(screen, safeRect, 24);
    panByPixels(correction);
    stage.dataset.selectionCorrection = JSON.stringify(correction);
    stage.dataset.selectedSafe = 'true';
  }, [panByPixels, selectedCode]);

  const adjustCamera = useCallback(
    (reason: CameraAdjustmentReason) => {
      const stage = document.getElementById('map-viewport');
      const control = controls.current;
      if (!stage || !control || !(control.object instanceof OrthographicCamera)) return;
      if (userInteracting.current && reason !== 'manual-reset') {
        pendingReason.current = reason;
        return;
      }
      const camera = control.object;
      const before = snapshotCamera(camera, control);
      const { width, height } = stage.getBoundingClientRect();
      const nextInsets = measureViewportInsets(stage);
      const previousWidth = previousSize.current.width || width;
      const previousHeight = previousSize.current.height || height;
      const previousSafe = getSafeViewportRect(
        previousWidth,
        previousHeight,
        previousInsets.current,
      );
      const nextSafe = getSafeViewportRect(width, height, nextInsets);
      if (width < 1 || height < 1 || nextSafe.width < 40 || nextSafe.height < 40) return;

      if (reason === 'initial-fit' || reason === 'manual-reset') {
        camera.zoom = clampZoom(
          BASE_ZOOM * Math.min(nextSafe.width / width, nextSafe.height / height),
          MIN_ZOOM,
          MAX_ZOOM,
        );
        const shift = before.target.clone().multiplyScalar(-1);
        camera.position.add(shift);
        control.target.set(0, 0, 0);
        panByPixels(
          calculateInsetDelta(getSafeViewportRect(width, height, EMPTY_INSETS), nextSafe),
        );
        camera.updateProjectionMatrix();
        control.update();
        keepSelectionVisible();
      } else if (reason === 'selection-change') {
        keepSelectionVisible();
      } else if (!areInsetsEqual(previousInsets.current, nextInsets)) {
        const relativeScale = calculateRelativeZoom(previousSafe, nextSafe);
        if (reason === 'viewport-resize')
          camera.zoom = clampZoom(camera.zoom * relativeScale, MIN_ZOOM, MAX_ZOOM);
        panByPixels(calculateInsetDelta(previousSafe, nextSafe));
        keepSelectionVisible();
      }

      previousInsets.current = nextInsets;
      previousSize.current = { width, height };
      camera.updateProjectionMatrix();
      control.update();
      updateDebugState(reason);
    },
    [keepSelectionVisible, panByPixels, updateDebugState],
  );

  const scheduleAdjustment = useCallback(
    (reason: CameraAdjustmentReason) => {
      cancelAnimationFrame(scheduledFrame.current);
      scheduledFrame.current = requestAnimationFrame(() => adjustCamera(reason));
    },
    [adjustCamera],
  );

  const setControlsRef = useCallback(
    (instance: OrbitControlsImpl | null) => {
      controls.current = instance;
      if (instance && !initialized.current) {
        initialized.current = true;
        requestAnimationFrame(() => adjustCamera('initial-fit'));
      }
    },
    [adjustCamera],
  );

  useEffect(() => {
    if (previousSelection.current === selectedCode) return;
    previousSelection.current = selectedCode;
    if (initialized.current) scheduleAdjustment('selection-change');
  }, [scheduleAdjustment, selectedCode]);

  useEffect(() => {
    const stage = document.getElementById('map-viewport');
    if (!stage) return;
    const stageObserver = new ResizeObserver(() => scheduleAdjustment('viewport-resize'));
    stageObserver.observe(stage);
    const sheetObserver = new ResizeObserver(() => scheduleAdjustment('sheet-inset-change'));
    const sheet = document.getElementById('mobile-dashboard-sheet');
    if (sheet) sheetObserver.observe(sheet);
    const onInsetChange = () => scheduleAdjustment('sheet-inset-change');
    window.addEventListener('dashboard-insets-change', onInsetChange);
    return () => {
      cancelAnimationFrame(scheduledFrame.current);
      stageObserver.disconnect();
      sheetObserver.disconnect();
      window.removeEventListener('dashboard-insets-change', onInsetChange);
    };
  }, [scheduleAdjustment]);

  useEffect(() => {
    const reset = () => scheduleAdjustment('manual-reset');
    window.addEventListener('dashboard-reset-camera', reset);
    return () => window.removeEventListener('dashboard-reset-camera', reset);
  }, [scheduleAdjustment]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (shouldHandleCameraKey(event.key, event.target)) {
        event.preventDefault();
        pressed.current.add(event.key.toLowerCase());
      }
    };
    const up = (event: KeyboardEvent) => pressed.current.delete(event.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useFrame((_, delta) => {
    const control = controls.current;
    if (!control) return;
    const speed = delta * 1.25;
    if (pressed.current.has('arrowleft') || pressed.current.has('a'))
      control.setAzimuthalAngle(control.getAzimuthalAngle() - speed);
    if (pressed.current.has('arrowright') || pressed.current.has('d'))
      control.setAzimuthalAngle(control.getAzimuthalAngle() + speed);
    if (pressed.current.has('arrowup') || pressed.current.has('w'))
      control.setPolarAngle(Math.max(Math.PI / 7, control.getPolarAngle() - speed));
    if (pressed.current.has('arrowdown') || pressed.current.has('s'))
      control.setPolarAngle(Math.min(Math.PI / 2.15, control.getPolarAngle() + speed));
  });

  return (
    <OrbitControls
      ref={setControlsRef}
      makeDefault
      enableRotate
      autoRotate={autoRotate}
      autoRotateSpeed={0.7}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      minPolarAngle={Math.PI / 7}
      maxPolarAngle={Math.PI / 2.15}
      onStart={() => {
        userInteracting.current = true;
      }}
      onChange={() => updateDebugState('selection-change')}
      onEnd={() => {
        userInteracting.current = false;
        const reason = pendingReason.current;
        pendingReason.current = null;
        if (reason) scheduleAdjustment(reason);
      }}
    />
  );
}
