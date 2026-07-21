import { describe, expect, it } from 'vitest';
import {
  clampLevel,
  clampScore,
  MAX_SCORE,
  normalizeScore,
  sanitizeDisplayName,
} from '@/services/scoreValidation';

describe('clampScore', () => {
  it('floors and keeps scores within the accepted range', () => {
    expect(clampScore(1234.9)).toBe(1234);
    expect(clampScore(-5)).toBe(0);
    expect(clampScore(MAX_SCORE + 10)).toBe(MAX_SCORE - 1);
  });

  it('returns 0 for non-finite input', () => {
    expect(clampScore(Number.NaN)).toBe(0);
    expect(clampScore(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('clampLevel', () => {
  it('keeps the level within 1..100', () => {
    expect(clampLevel(0)).toBe(1);
    expect(clampLevel(3)).toBe(3);
    expect(clampLevel(200)).toBe(100);
  });
});

describe('sanitizeDisplayName', () => {
  it('trims and bounds a provided nickname', () => {
    expect(sanitizeDisplayName('  neo  ', 'abc123')).toBe('neo');
    expect(sanitizeDisplayName('x'.repeat(40), 'abc123')).toHaveLength(24);
  });

  it('falls back to User_<digits> derived from the uid when empty', () => {
    expect(sanitizeDisplayName('   ', 'uid98765')).toBe('User_9876');
  });

  it('pads the fallback when the uid has too few digits', () => {
    expect(sanitizeDisplayName('', 'ab1cd')).toBe('User_0001');
  });
});

describe('normalizeScore', () => {
  it('normalises all fields for submission', () => {
    expect(
      normalizeScore({ displayName: ' hax ', score: 42.7, levelReached: 999 }, 'uid7'),
    ).toEqual({ displayName: 'hax', score: 42, levelReached: 100 });
  });
});
