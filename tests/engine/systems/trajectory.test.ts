import { describe, expect, it } from 'vitest';
import { predictLanding } from '@/engine/systems/trajectory';
import { Path } from '@/engine/entities/Path';
import { createPacket, resetPacketIds } from '@/engine/entities/DataPacket';
import { vec2 } from '@/engine/math/vec2';
import { beforeEach } from 'vitest';

const straightPath = new Path([vec2(0, 0), vec2(600, 0)]);

beforeEach(() => {
  resetPacketIds();
});

describe('predictLanding', () => {
  it('lands on the chain when the aim ray meets a packet', () => {
    const packets = [createPacket({ type: 'INFO', distance: 300 })];
    // Fire from the left, straight along the track toward the packet at (300,0).
    const landing = predictLanding(vec2(0, 0), 0, packets, straightPath);

    expect(landing.hit).toBe(true);
    expect(landing.point.x).toBeGreaterThan(260);
    expect(landing.point.x).toBeLessThanOrEqual(300);
    expect(landing.point.y).toBeCloseTo(0);
  });

  it('flies off the board when nothing is in the way', () => {
    const landing = predictLanding(vec2(0, 0), 0, [], straightPath);

    expect(landing.hit).toBe(false);
    expect(landing.point.x).toBeGreaterThan(600);
  });

  it('exits through the top edge when aimed upward into empty space', () => {
    const landing = predictLanding(vec2(300, 300), -Math.PI / 2, [], straightPath);

    expect(landing.hit).toBe(false);
    expect(landing.point.y).toBeLessThan(0);
  });

  it('stops at the first packet it reaches, not a later one', () => {
    const packets = [
      createPacket({ type: 'INFO', distance: 200 }),
      createPacket({ type: 'ERROR', distance: 400 }),
    ];
    const landing = predictLanding(vec2(0, 0), 0, packets, straightPath);

    expect(landing.hit).toBe(true);
    expect(landing.point.x).toBeLessThan(300);
  });
});
