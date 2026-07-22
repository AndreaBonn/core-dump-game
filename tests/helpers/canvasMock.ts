/**
 * A canvas stub whose 2D context ignores every draw call, so engine tests can
 * exercise game logic without a real rendering surface. `getBoundingClientRect`
 * reports the given CSS size at the origin.
 */
export function createCanvasMock(width = 960, height = 600): HTMLCanvasElement {
  const ctx = new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === 'createRadialGradient' || prop === 'createLinearGradient') {
          return () => ({ addColorStop: () => {} });
        }
        if (prop === 'canvas') {
          return canvas;
        }
        return () => {};
      },
      set: () => true,
    },
  );
  const canvas = {
    width,
    height,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0, width, height }),
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as HTMLCanvasElement;
  return canvas;
}
