import { cleanup, render } from '@testing-library/react';
import type { ComponentType } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { DioramaSceneProps } from './dioramaConfig';

// jsdom không có WebGL: giả lập lớp R3F (Canvas/hook) để RENDER thật từng scene và chạy toàn bộ phần
// dựng địa hình, cây, đá, nước, công trình. Phần không đo được ở đây (shader, GPU, camera) do e2e và
// kiểm tra bằng mắt trên bản build production đảm nhiệm.
vi.mock('@react-three/fiber', async () => {
  const React = await import('react');
  return {
    Canvas: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'canvas' }, children),
    useFrame: () => undefined,
    useThree: (select: (state: unknown) => unknown) =>
      select({
        invalidate: () => undefined,
        gl: { domElement: document.createElement('canvas') },
        camera: { position: { set: () => undefined, lerp: () => undefined } },
      }),
  };
});
vi.mock('@react-three/drei', () => ({ OrbitControls: () => null }));
// Bỏ qua khung Canvas/ánh sáng/bầu trời/camera (cần GPU); giữ nguyên mọi thành phần dựng nội dung.
vi.mock('./dioramaKit', async (importOriginal) => {
  const React = await import('react');
  const original = await importOriginal<typeof import('./dioramaKit')>();
  return {
    ...original,
    DioramaCanvas: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

const props: DioramaSceneProps = {
  preset: 'overview',
  reducedMotion: false,
  onContextLost: () => undefined,
  onContextRestored: () => undefined,
};

type SceneModule = Record<string, unknown>;
const loaders: Array<[string, () => Promise<SceneModule>]> = [
  ['waterfalls', () => import('./scenes/waterfalls')],
  ['waters', () => import('./scenes/waters')],
  ['landmarks', () => import('./scenes/landmarks')],
  ['structures', () => import('./scenes/structures')],
  ['krong-kmar', () => import('./KrongKmarScene')],
];

describe('diorama scenes mount without GPU', () => {
  beforeAll(() => {
    // React DOM không biết các thẻ R3F (mesh, group…) và in cảnh báo cho từng prop — không liên quan.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(cleanup);

  it.each(loaders)(
    'renders every scene in the %s group',
    async (_group, load) => {
      const module = await load();
      const scenes = Object.entries(module).filter(
        ([, value]) => typeof value === 'function',
      ) as Array<[string, ComponentType<DioramaSceneProps>]>;
      expect(scenes.length).toBeGreaterThan(0);
      for (const [name, Scene] of scenes) {
        const { container, unmount } = render(<Scene {...props} />);
        expect(container.firstChild, name).not.toBeNull();
        unmount();
      }
    },
    60_000,
  );

  it('also renders with reduced motion on and a different camera preset', async () => {
    const { DrayNurScene, GiaLongScene } = await import('./scenes/waterfalls');
    const { container } = render(
      <>
        <DrayNurScene {...props} reducedMotion preset="close" />
        <GiaLongScene {...props} reducedMotion preset="high" />
      </>,
    );
    expect(container.firstChild).not.toBeNull();
  }, 60_000);
});
