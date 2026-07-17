import { OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useRef } from 'react';
import { OrthographicCamera, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useMapStore } from '../../stores/mapStore';
import { shouldHandleCameraKey } from './cameraKeyboard';
import { calculateCameraFrame, measureViewportInsets } from './viewportInsets';

const BASE_ZOOM = 246;

export function CameraControls() {
  const controls = useRef<OrbitControlsImpl>(null);
  const pressed = useRef(new Set<string>());
  const autoRotate = useMapStore((state) => state.autoRotate);
  const applySafeFrame = useCallback(() => {
    const stage = document.getElementById('map-viewport');
    const control = controls.current;
    if (!stage || !control || !(control.object instanceof OrthographicCamera)) return;
    const camera = control.object;
    const { width, height } = stage.getBoundingClientRect();
    const frame = calculateCameraFrame(width, height, measureViewportInsets(stage));
    camera.zoom = BASE_ZOOM * frame.zoomScale;
    const worldPerPixel = 1 / camera.zoom;
    const cameraRight = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const cameraUp = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    control.target
      .set(0, 0, 0)
      .addScaledVector(cameraRight, frame.offsetX * worldPerPixel)
      .addScaledVector(cameraUp, -frame.offsetY * worldPerPixel);
    camera.updateProjectionMatrix();
    control.update();
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(applySafeFrame);
    window.addEventListener('resize', applySafeFrame);
    window.addEventListener('dashboard-insets-change', applySafeFrame);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', applySafeFrame);
      window.removeEventListener('dashboard-insets-change', applySafeFrame);
    };
  }, [applySafeFrame]);
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
      ref={controls}
      makeDefault
      enableRotate
      autoRotate={autoRotate}
      autoRotateSpeed={0.7}
      minZoom={60}
      maxZoom={340}
      minPolarAngle={Math.PI / 7}
      maxPolarAngle={Math.PI / 2.15}
    />
  );
}
