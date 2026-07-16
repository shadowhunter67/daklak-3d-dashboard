import { OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useMapStore } from '../../stores/mapStore';
import { shouldHandleCameraKey } from './cameraKeyboard';

export function CameraControls() {
  const controls = useRef<OrbitControlsImpl>(null);
  const pressed = useRef(new Set<string>());
  const autoRotate = useMapStore((state) => state.autoRotate);
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
