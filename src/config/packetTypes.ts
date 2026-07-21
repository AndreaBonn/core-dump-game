import type { PacketType } from '@/types/game.types';

export interface PacketTypeDefinition {
  readonly type: PacketType;
  readonly color: string;
  /** Foreground colour for the short label drawn on the packet. */
  readonly label: string;
}

/**
 * Packet palette, ordered by difficulty introduction. Colours and names are
 * based on standard log levels to reinforce the terminal theme (spec 5.2).
 */
export const PACKET_TYPES: readonly PacketTypeDefinition[] = [
  { type: 'ERROR', color: '#ff5555', label: 'E' },
  { type: 'SUCCESS', color: '#50fa7b', label: 'S' },
  { type: 'INFO', color: '#8be9fd', label: 'I' },
  { type: 'WARNING', color: '#f1fa8c', label: 'W' },
  { type: 'DEBUG', color: '#bd93f9', label: 'D' },
  { type: 'TRACE', color: '#ffb86c', label: 'T' },
  { type: 'FATAL', color: '#ff79c9', label: 'F' },
];

const COLOR_BY_TYPE: Record<PacketType, string> = Object.fromEntries(
  PACKET_TYPES.map((definition) => [definition.type, definition.color]),
) as Record<PacketType, string>;

const LABEL_BY_TYPE: Record<PacketType, string> = Object.fromEntries(
  PACKET_TYPES.map((definition) => [definition.type, definition.label]),
) as Record<PacketType, string>;

export function colorForType(type: PacketType): string {
  return COLOR_BY_TYPE[type];
}

export function labelForType(type: PacketType): string {
  return LABEL_BY_TYPE[type];
}

/** The first `count` packet types, used to scope colours per level. */
export function typesForCount(count: number): readonly PacketType[] {
  const clamped = Math.max(1, Math.min(count, PACKET_TYPES.length));
  return PACKET_TYPES.slice(0, clamped).map((definition) => definition.type);
}
