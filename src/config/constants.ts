export const PACKET_RADIUS = 16;

/** Centre-to-centre distance between adjacent packets in a compacted chain. */
export const PACKET_SPACING = PACKET_RADIUS * 2;

/** Minimum run length of same-type packets that triggers a match. */
export const MIN_MATCH = 3;

/** Speed of a fired projectile, in pixels per second. */
export const PROJECTILE_SPEED = 900;

/** Radius of the CPU cursor hub drawn at the centre of the board. */
export const CURSOR_RADIUS = 26;

/** Distance from the void within which the chain front triggers game over. */
export const VOID_RADIUS = 22;

/** Fixed simulation timestep in seconds (120 Hz) for deterministic updates. */
export const FIXED_TIMESTEP = 1 / 120;

/** Upper bound on accumulated time processed per frame, to avoid spirals. */
export const MAX_FRAME_TIME = 0.25;

/**
 * Simulation steps frozen when a shot chains explosions, by combo size. The
 * pause is what makes a big cascade land; it skips whole fixed steps rather
 * than shortening one, so the simulation stays on the same timestep.
 */
export const HIT_STOP_STEPS: readonly number[] = [0, 0, 6, 10, 16];

/** Bonus awarded for clearing a level without a packet reaching the void. */
export const LEVEL_CLEAR_BONUS = 500;

/** Logical board dimensions; the canvas is scaled to fit these. */
export const BOARD_WIDTH = 960;
export const BOARD_HEIGHT = 600;

/**
 * Largest distance from the board centre at which a level places a packet:
 * the widest starting radius a level can ask for (`levels.ts` tuning), plus a
 * packet radius so the outermost packet is fully inside. Paths must keep every
 * waypoint within this reach, which `tests/config/contentBox.test.ts` enforces.
 */
export const CONTENT_REACH = 270 + PACKET_RADIUS;

/**
 * The square region of the board the game actually occupies. On a portrait
 * viewport this is what gets fitted to the screen instead of the full 960x600
 * board, whose side margins are empty: fitting the board would shrink the game
 * to a third of the screen height.
 */
export const CONTENT_BOX = {
  x: BOARD_WIDTH / 2 - CONTENT_REACH,
  y: BOARD_HEIGHT / 2 - CONTENT_REACH,
  width: CONTENT_REACH * 2,
  height: CONTENT_REACH * 2,
} as const;
