import { describe, expect, it, vi } from 'vitest';
import { hasWebGLSupport, subscribeWebGLContext } from './webglLifecycle';

describe('WebGL lifecycle', () => {
  it('detects an available WebGL environment', () => {
    const canvas = {
      getContext: vi.fn((kind) => (kind === 'webgl2' ? {} : null)),
    } as unknown as HTMLCanvasElement;
    expect(hasWebGLSupport(() => canvas)).toBe(true);
  });
  it('detects an unsupported WebGL environment without throwing', () => {
    const canvas = { getContext: vi.fn(() => null) } as unknown as HTMLCanvasElement;
    expect(hasWebGLSupport((() => canvas) as () => HTMLCanvasElement)).toBe(false);
  });

  it('handles context loss and restore and removes both listeners', () => {
    const canvas = document.createElement('canvas');
    const onLost = vi.fn();
    const onRestored = vi.fn();
    const cleanup = subscribeWebGLContext(canvas, { onLost, onRestored });
    expect(canvas.dataset.webglLifecycle).toBe('ready');

    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(onLost).toHaveBeenCalledOnce();
    expect(onRestored).toHaveBeenCalledOnce();

    cleanup();
    expect(canvas.dataset.webglLifecycle).toBeUndefined();
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(onLost).toHaveBeenCalledOnce();
    expect(onRestored).toHaveBeenCalledOnce();
  });
});
