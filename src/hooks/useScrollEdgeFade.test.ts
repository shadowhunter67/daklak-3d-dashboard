import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useScrollEdgeFade } from './useScrollEdgeFade';

// jsdom never lays out content, so scrollWidth/clientWidth/scrollLeft are stubbed via
// defineProperty to reproduce the "content overflows, not yet scrolled to the end" and
// "scrolled all the way to the end" states this hook distinguishes.
function makeScrollableElement(scrollWidth: number, clientWidth: number, scrollLeft = 0) {
  const el = document.createElement('div');
  Object.defineProperty(el, 'scrollWidth', { value: scrollWidth, configurable: true });
  Object.defineProperty(el, 'clientWidth', { value: clientWidth, configurable: true });
  Object.defineProperty(el, 'scrollLeft', {
    value: scrollLeft,
    writable: true,
    configurable: true,
  });
  document.body.appendChild(el);
  return el;
}

describe('useScrollEdgeFade', () => {
  afterEach(cleanup);

  it('does not mark scroll-end while there is more content to the right', () => {
    const el = makeScrollableElement(300, 100, 0);
    renderHook(() => useScrollEdgeFade({ current: el }));
    expect(el.hasAttribute('data-scroll-end')).toBe(false);
  });

  it('marks scroll-end once content already fits without overflow', () => {
    const el = makeScrollableElement(100, 100, 0);
    renderHook(() => useScrollEdgeFade({ current: el }));
    expect(el.hasAttribute('data-scroll-end')).toBe(true);
  });

  it('marks scroll-end after scrolling to the true right edge, so the edge-fade can hide there', () => {
    const el = makeScrollableElement(300, 100, 0);
    renderHook(() => useScrollEdgeFade({ current: el }));
    expect(el.hasAttribute('data-scroll-end')).toBe(false);

    el.scrollLeft = 200; // scrollWidth - clientWidth: fully scrolled
    el.dispatchEvent(new Event('scroll'));
    expect(el.hasAttribute('data-scroll-end')).toBe(true);
  });

  it('un-marks scroll-end when scrolled back away from the edge', () => {
    const el = makeScrollableElement(300, 100, 200);
    renderHook(() => useScrollEdgeFade({ current: el }));
    expect(el.hasAttribute('data-scroll-end')).toBe(true);

    el.scrollLeft = 0;
    el.dispatchEvent(new Event('scroll'));
    expect(el.hasAttribute('data-scroll-end')).toBe(false);
  });

  it('is a no-op when the ref has no current element yet', () => {
    expect(() => renderHook(() => useScrollEdgeFade({ current: null }))).not.toThrow();
  });
});
