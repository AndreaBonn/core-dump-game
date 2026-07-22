/**
 * How close the chain front is to being swallowed, as a 0..1 danger level.
 * 0 while the front is further than `threshold` from the path end, then ramps
 * linearly to 1 as it reaches the void. Pure; drives the head-of-chain warning.
 * `threshold` and `pathLength` are expected positive (a real path).
 */
export function frontUrgency(frontDistance: number, pathLength: number, threshold: number): number {
  const dangerStart = pathLength - threshold;
  if (frontDistance <= dangerStart) {
    return 0;
  }
  const t = (frontDistance - dangerStart) / threshold;
  return t < 1 ? t : 1;
}
