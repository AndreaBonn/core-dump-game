import type { DataPacket } from '@/types/game.types';
import { reversalStep } from '@/engine/core/chainMotion';

/**
 * The ordered train of data packets. Packets are kept sorted by ascending
 * `distance`; the front of the chain (closest to the void) is the last element.
 * The chain advances rigidly: every packet moves forward at the same speed.
 */
export class Chain {
  readonly packets: DataPacket[];
  speed: number;

  constructor(packets: DataPacket[], speed: number) {
    this.packets = packets;
    this.speed = speed;
  }

  get isEmpty(): boolean {
    return this.packets.length === 0;
  }

  /** Arc-length distance of the front packet, or -Infinity when empty. */
  get frontDistance(): number {
    const front = this.packets[this.packets.length - 1];
    return front ? front.distance : Number.NEGATIVE_INFINITY;
  }

  /** Moves packets together, limiting backward travel at the path entrance. */
  advance(dt: number): void {
    if (this.isEmpty) return;
    const requestedDelta = this.speed * dt;
    const delta =
      requestedDelta < 0
        ? reversalStep(this.frontDistance, requestedDelta) - this.frontDistance
        : requestedDelta;
    for (const packet of this.packets) {
      packet.distance += delta;
    }
  }
}
