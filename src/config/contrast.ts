const MAX_CHANNEL = 255;
const HEX_RADIX = 16;
const SRGB_THRESHOLD = 0.04045;
const SRGB_LINEAR_DIVISOR = 12.92;
const SRGB_OFFSET = 0.055;
const SRGB_SCALE = 1.055;
const SRGB_EXPONENT = 2.4;
const LUMINANCE_OFFSET = 0.05;
const CHANNELS = [
  { offset: 1, weight: 0.2126 },
  { offset: 3, weight: 0.7152 },
  { offset: 5, weight: 0.0722 },
];
const HEX_CHANNEL_LENGTH = 2;

function linearChannel(hex: string): number {
  const value = Number.parseInt(hex, HEX_RADIX) / MAX_CHANNEL;
  return value <= SRGB_THRESHOLD
    ? value / SRGB_LINEAR_DIVISOR
    : ((value + SRGB_OFFSET) / SRGB_SCALE) ** SRGB_EXPONENT;
}

function luminance(hex: string): number {
  return CHANNELS.reduce(
    (sum, { offset, weight }) =>
      sum + weight * linearChannel(hex.slice(offset, offset + HEX_CHANNEL_LENGTH)),
    0,
  );
}

/** Return the WCAG contrast ratio of two opaque sRGB colors in #rrggbb format. */
export function contrastRatio(hexA: string, hexB: string): number {
  const a = luminance(hexA);
  const b = luminance(hexB);
  return (Math.max(a, b) + LUMINANCE_OFFSET) / (Math.min(a, b) + LUMINANCE_OFFSET);
}
