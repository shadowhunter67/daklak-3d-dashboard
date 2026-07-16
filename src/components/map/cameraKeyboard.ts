const cameraKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's']);

export function isCameraKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true;
  return !target.closest('button, a, input, textarea, select, [contenteditable]');
}

export function shouldHandleCameraKey(key: string, target: EventTarget | null): boolean {
  const normalizedKey = key.length === 1 ? key.toLowerCase() : key;
  return cameraKeys.has(normalizedKey) && isCameraKeyboardTarget(target);
}
