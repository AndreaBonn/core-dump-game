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

/** Logical board dimensions; the canvas is scaled to fit these. */
export const BOARD_WIDTH = 960;
export const BOARD_HEIGHT = 600;
