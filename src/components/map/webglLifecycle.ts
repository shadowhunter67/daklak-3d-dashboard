export interface WebGLContextHandlers {
  onLost: () => void;
  onRestored: () => void;
}

let cachedSupport: boolean | undefined;

export function hasWebGLSupport(createCanvas?: () => HTMLCanvasElement): boolean {
  if (cachedSupport !== undefined && !createCanvas) return cachedSupport;
  if (!createCanvas && typeof document === 'undefined') return false;
  try {
    const canvas = (createCanvas ?? (() => document.createElement('canvas')))();
    const supported = Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    if (!createCanvas) cachedSupport = supported;
    return supported;
  } catch {
    if (!createCanvas) cachedSupport = false;
    return false;
  }
}

export function subscribeWebGLContext(
  canvas: HTMLCanvasElement,
  { onLost, onRestored }: WebGLContextHandlers,
) {
  const handleLost = (event: Event) => {
    event.preventDefault();
    onLost();
  };
  canvas.dataset.webglLifecycle = 'ready';
  canvas.addEventListener('webglcontextlost', handleLost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  return () => {
    delete canvas.dataset.webglLifecycle;
    canvas.removeEventListener('webglcontextlost', handleLost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
  };
}
