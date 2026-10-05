import { describe, expect, it } from 'vitest';
import { buildLevelConfig, CAMPAIGN_SEED_BASE, LEVELS } from '@/config/levels';
import { CONTENT_BOX, CONTENT_REACH, PACKET_RADIUS } from '@/config/constants';
import { BOARD_CENTER } from '@/config/paths';

/**
 * The portrait viewport fits CONTENT_BOX, not the whole board, so anything a
 * level draws outside that square is cropped off screen on a phone. This is the
 * guard: every level, including the extrapolated ones an endless run reaches,
 * must keep its path inside. A new path shape (serpentine, loop) has to pass
 * this test in the same commit that introduces it.
 */
describe('level paths stay inside the content box', () => {
  const LEVELS_TO_CHECK = 50;

  it.each(LEVELS)('campaign level $level keeps every waypoint within CONTENT_REACH', (level) => {
    expect(level.waypoints.length).toBeGreaterThan(2);
    for (const point of level.waypoints) {
      expect(Math.abs(point.x - BOARD_CENTER.x)).toBeLessThanOrEqual(CONTENT_REACH);
      expect(Math.abs(point.y - BOARD_CENTER.y)).toBeLessThanOrEqual(CONTENT_REACH);
      expect(point.x - PACKET_RADIUS).toBeGreaterThanOrEqual(CONTENT_BOX.x);
      expect(point.x + PACKET_RADIUS).toBeLessThanOrEqual(CONTENT_BOX.x + CONTENT_BOX.width);
      expect(point.y - PACKET_RADIUS).toBeGreaterThanOrEqual(CONTENT_BOX.y);
      expect(point.y + PACKET_RADIUS).toBeLessThanOrEqual(CONTENT_BOX.y + CONTENT_BOX.height);
    }
  });

  it.each(Array.from({ length: LEVELS_TO_CHECK }, (_, index) => index + 1))(
    'level %i keeps every waypoint within the content box',
    (level) => {
      const { waypoints } = buildLevelConfig(level, CAMPAIGN_SEED_BASE);

      for (const point of waypoints) {
        expect(point.x - PACKET_RADIUS).toBeGreaterThanOrEqual(CONTENT_BOX.x);
        expect(point.x + PACKET_RADIUS).toBeLessThanOrEqual(CONTENT_BOX.x + CONTENT_BOX.width);
        expect(point.y - PACKET_RADIUS).toBeGreaterThanOrEqual(CONTENT_BOX.y);
        expect(point.y + PACKET_RADIUS).toBeLessThanOrEqual(CONTENT_BOX.y + CONTENT_BOX.height);
      }
    },
  );

  it('has a content box that is square and centred on the board', () => {
    expect(CONTENT_BOX.width).toBe(CONTENT_BOX.height);
    expect(CONTENT_BOX.x + CONTENT_BOX.width / 2).toBe(480);
    expect(CONTENT_BOX.y + CONTENT_BOX.height / 2).toBe(300);
  });
});
