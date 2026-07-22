/** Easing helpers for the view layer. Each maps t (clamped to [0, 1]) to an eased value. */

function clamp01(t: number): number {
  if (t < 0) {
    return 0;
  }
  return t > 1 ? 1 : t;
}

/** Decelerating cubic: fast start, gentle stop. */
export function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

/**
 * Overshoots past 1 near the end before settling back, giving a springy "pop".
 * Returns 0 at t=0 and 1 at t=1.
 */
export function easeOutBack(t: number): number {
  const x = clamp01(t);
  const overshoot = 1.70158;
  return 1 + (overshoot + 1) * Math.pow(x - 1, 3) + overshoot * Math.pow(x - 1, 2);
}

/** Accelerating quadratic: gentle start, fast end. */
export function easeInQuad(t: number): number {
  const x = clamp01(t);
  return x * x;
}
