import type { LevelSession } from '@/engine/LevelSession';
import { createRng } from '@/engine/math/rng';

// Any seed works: the copy only has to resolve where a shot lands, which the
// geometry decides; its draws (next packet, power-up targets) are throwaway.
const LOOKAHEAD_SEED = 1;

function copyValue(value: unknown, seen: WeakMap<object, unknown>): unknown {
  if (value === null || typeof value !== 'object') return value;
  const known = seen.get(value);
  if (known !== undefined) return known;
  const copy: Record<string | symbol, unknown> = Array.isArray(value)
    ? []
    : Object.create(Object.getPrototypeOf(value));
  seen.set(value, copy);
  for (const key of Reflect.ownKeys(value)) {
    copy[key] = copyValue((value as Record<string | symbol, unknown>)[key], seen);
  }
  return copy;
}

/**
 * A deep copy of a session that can be played forward without touching the
 * original, for trying a shot before taking it. Class instances keep their
 * prototypes and the immutable track, void and config are shared; the RNG, a
 * closure that cannot be copied, is replaced by a fresh one so the copy never
 * advances the original's stream. The module-level id
 * counters of packets and projectiles are shared, so playing the copy skips
 * ids in the original; no game rule reads an id, so outcomes are unchanged.
 */
export function cloneSession(session: LevelSession): LevelSession {
  const internals = session as unknown as {
    state: { path: object; voidHole: object; types: object };
    levelConfig: object;
  };
  // Never written after the level is built: the copy can share them, and the
  // sampled track is most of what a full copy would duplicate.
  const shared = [
    internals.state.path,
    internals.state.voidHole,
    internals.state.types,
    internals.levelConfig,
  ];
  const copy = copyValue(session, new WeakMap(shared.map((part) => [part, part]))) as LevelSession;
  const copied = copy as unknown as { state: { rng: unknown } };
  copied.state = { ...copied.state, rng: createRng(LOOKAHEAD_SEED) };
  return copy;
}
