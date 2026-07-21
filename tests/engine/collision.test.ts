import { beforeEach, describe, expect, it } from 'vitest';
import { CpuCursor } from '@/engine/entities/CpuCursor';
import { createPacket, resetPacketIds } from '@/engine/entities/DataPacket';
import { Path } from '@/engine/entities/Path';
import { insertPacketAt } from '@/engine/core/chainOps';
import { findCollisionIndex, resolveInsertPosition } from '@/engine/systems/CollisionSystem';
import { PACKET_SPACING } from '@/config/constants';
import { vec2 } from '@/engine/math/vec2';
import type { DataPacket } from '@/types/game.types';

const straightPath = new Path([vec2(0, 0), vec2(600, 0)]);

beforeEach(() => {
  resetPacketIds();
});

function chainAt(distances: number[]): DataPacket[] {
  return distances.map((distance) => createPacket({ type: 'INFO', distance }));
}

describe('CpuCursor', () => {
  it('fires the current packet and advances the queue', () => {
    const cursor = new CpuCursor(vec2(0, 0), 'ERROR', 'SUCCESS');
    const fired = cursor.loadNext('INFO');
    expect(fired).toBe('ERROR');
    expect(cursor.currentType).toBe('SUCCESS');
    expect(cursor.nextType).toBe('INFO');
  });

  it('aims at a target by setting the angle toward it', () => {
    const cursor = new CpuCursor(vec2(0, 0), 'ERROR', 'SUCCESS');
    cursor.aimAt(vec2(10, 0));
    expect(cursor.angle).toBeCloseTo(0);
    cursor.aimAt(vec2(0, 10));
    expect(cursor.angle).toBeCloseTo(Math.PI / 2);
  });
});

describe('findCollisionIndex', () => {
  it('returns the nearest on-track packet within hit range', () => {
    const packets = chainAt([100, 132, 164]);
    const index = findCollisionIndex(packets, straightPath, vec2(133, 0));
    expect(index).toBe(1);
  });

  it('returns -1 when the point does not overlap the chain', () => {
    const packets = chainAt([100, 132, 164]);
    expect(findCollisionIndex(packets, straightPath, vec2(300, 0))).toBe(-1);
  });

  it('ignores packets still streaming in at negative distance', () => {
    const packets = chainAt([-32, -16]);
    expect(findCollisionIndex(packets, straightPath, vec2(0, 0))).toBe(-1);
  });
});

describe('resolveInsertPosition', () => {
  it('inserts in front of the hit packet when the impact is ahead', () => {
    const packets = chainAt([100, 132, 164]);
    expect(resolveInsertPosition(packets, straightPath, 1, vec2(140, 0))).toBe(2);
  });

  it('inserts behind the hit packet when the impact is behind', () => {
    const packets = chainAt([100, 132, 164]);
    expect(resolveInsertPosition(packets, straightPath, 1, vec2(124, 0))).toBe(1);
  });
});

describe('insertPacketAt', () => {
  it('keeps the front anchored and pushes the tail back by one spacing', () => {
    const packets = chainAt([0, PACKET_SPACING, PACKET_SPACING * 2]);
    insertPacketAt(packets, 2, createPacket({ type: 'ERROR', distance: 0 }));
    expect(packets).toHaveLength(4);
    const distances = packets.map((p) => p.distance);
    expect(distances[3]).toBe(PACKET_SPACING * 2);
    for (let i = 1; i < distances.length; i += 1) {
      expect(distances[i]! - distances[i - 1]!).toBeCloseTo(PACKET_SPACING);
    }
  });

  it('places a front insertion one spacing ahead of the previous front', () => {
    const packets = chainAt([0, PACKET_SPACING, PACKET_SPACING * 2]);
    insertPacketAt(packets, 3, createPacket({ type: 'ERROR', distance: 0 }));
    expect(packets[3]!.distance).toBe(PACKET_SPACING * 3);
  });
});
