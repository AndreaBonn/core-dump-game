import { beforeEach, describe, expect, it } from 'vitest';
import { Chain } from '@/engine/entities/Chain';
import { VoidHole } from '@/engine/entities/VoidHole';
import { createPacket, resetPacketIds } from '@/engine/entities/DataPacket';
import { compactBehind, generateChainPackets } from '@/engine/core/chainOps';
import { createRng } from '@/engine/math/rng';
import { PACKET_SPACING } from '@/config/constants';
import type { PacketType } from '@/types/game.types';

beforeEach(() => {
  resetPacketIds();
});

describe('Chain', () => {
  it('advances every packet by speed * dt', () => {
    const chain = new Chain(
      [createPacket({ type: 'INFO', distance: 0 }), createPacket({ type: 'INFO', distance: 32 })],
      100,
    );
    chain.advance(0.5);
    expect(chain.packets[0]!.distance).toBe(50);
    expect(chain.packets[1]!.distance).toBe(82);
  });

  it('reports the front distance as the last packet', () => {
    const chain = new Chain(
      [createPacket({ type: 'INFO', distance: 10 }), createPacket({ type: 'ERROR', distance: 42 })],
      0,
    );
    expect(chain.frontDistance).toBe(42);
  });

  it('is empty and reports -Infinity front when it has no packets', () => {
    const chain = new Chain([], 50);
    expect(chain.isEmpty).toBe(true);
    expect(chain.frontDistance).toBe(Number.NEGATIVE_INFINITY);
  });
});

describe('VoidHole', () => {
  it('swallows the front once it reaches the threshold before the path end', () => {
    const hole = new VoidHole({ x: 0, y: 0 }, 500);
    expect(hole.hasSwallowed(477, 22)).toBe(false);
    expect(hole.hasSwallowed(478, 22)).toBe(true);
    expect(hole.hasSwallowed(500, 22)).toBe(true);
  });
});

describe('generateChainPackets', () => {
  const types: readonly PacketType[] = ['ERROR', 'SUCCESS', 'INFO', 'WARNING'];

  it('creates the requested number of packets', () => {
    const packets = generateChainPackets({ count: 20, types, rng: createRng(1) });
    expect(packets).toHaveLength(20);
  });

  it('spaces packets by PACKET_SPACING with the front just behind the start', () => {
    const packets = generateChainPackets({ count: 3, types, rng: createRng(1) });
    expect(packets.map((p) => p.distance)).toEqual([
      -3 * PACKET_SPACING,
      -2 * PACKET_SPACING,
      -1 * PACKET_SPACING,
    ]);
  });

  it('only uses the allowed packet types', () => {
    const packets = generateChainPackets({ count: 50, types, rng: createRng(7) });
    for (const packet of packets) {
      expect(types).toContain(packet.type);
    }
  });

  it('is deterministic for a given seed', () => {
    const a = generateChainPackets({ count: 10, types, rng: createRng(42) }).map((p) => p.type);
    const b = generateChainPackets({ count: 10, types, rng: createRng(42) }).map((p) => p.type);
    expect(a).toEqual(b);
  });

  it('creates no power-ups when the chance is zero', () => {
    const packets = generateChainPackets({ count: 40, types, rng: createRng(3) });
    expect(packets.every((p) => !p.isPowerUp)).toBe(true);
  });

  it('creates power-ups when the chance is one', () => {
    const packets = generateChainPackets({
      count: 10,
      types,
      rng: createRng(3),
      powerUpChance: 1,
    });
    expect(packets.every((p) => p.isPowerUp && p.powerUpType !== null)).toBe(true);
  });
});

describe('compactBehind', () => {
  it('pulls trailing packets forward to close a gap', () => {
    const packets = [
      createPacket({ type: 'INFO', distance: 0 }),
      createPacket({ type: 'INFO', distance: 200 }),
      createPacket({ type: 'INFO', distance: 232 }),
    ];
    compactBehind(packets, 2);
    expect(packets[1]!.distance).toBe(232 - PACKET_SPACING);
    expect(packets[0]!.distance).toBe(232 - 2 * PACKET_SPACING);
  });
});
