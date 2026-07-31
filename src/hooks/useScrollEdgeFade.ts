import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Toggles `data-scroll-end="true"` on a horizontally-scrollable element once it has been
 * scrolled (or already fits) all the way to its right edge, so the CSS edge-fade affordance
 * (`.primary-nav::after` / `.header-meta::after` in global.css, mobile breakpoints) can hide
 * itself there via `[data-scroll-end="true"]::after { opacity: 0 }`.
 *
 * Without this, the fade — a `position: sticky` pseudo-element with no JS scroll-position
 * awareness — stays visible even once there is nothing left to scroll to, which reads as a
 * misleading "there's more content" signal (Phase 9 runtime verification, chrome-devtools MCP,
 * 320–430px). Listens to `scroll` and observes size changes (ResizeObserver) so it stays correct
 * across locale switches, viewport resizes, and orientation changes without re-measuring on
 * every render.
 */
export function useScrollEdgeFade(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const update = () => {
      const hasMoreToScroll = el.scrollWidth - el.scrollLeft - el.clientWidth > 1;
      el.toggleAttribute('data-scroll-end', !hasMoreToScroll);
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    // jsdom (unit tests) does not implement ResizeObserver — same guard as
    // AccessibleDirectory's resize handling elsewhere in this codebase.
    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    resizeObserver?.observe(el);

    return () => {
      el.removeEventListener('scroll', update);
      resizeObserver?.disconnect();
    };
  }, [ref]);
}
