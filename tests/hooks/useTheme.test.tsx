import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { colorForType } from '@/config/packetTypes';
import { EMPTY_STATS } from '@/engine/core/stats';
import { useTheme } from '@/hooks/useTheme';
import { useProgressStore } from '@/store/useProgressStore';
import { useSettingsStore } from '@/store/useSettingsStore';

/** 5 levels cleared: 500 XP, rank 2, which unlocks the ring cursor. */
function reachRankTwo() {
  useProgressStore.setState({ stats: { ...EMPTY_STATS, runsPlayed: 1, levelsCleared: 5 } });
}

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    useProgressStore.getState().clearProfile();
    useSettingsStore.getState().resetSettings();
    // resetSettings also restores the default language, Italian; these tests read English.
    useSettingsStore.getState().setLanguage('en');
  });

  it('paints packets with the classic palette by default', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.packetColor('ERROR')).toBe(colorForType('ERROR'));
    expect(result.current.cursor.id).toBe('cursor-default');
  });

  it('ignores a selection the profile has not unlocked yet', () => {
    act(() => useSettingsStore.getState().selectCosmetic('palette', 'neon'));

    const { result } = renderHook(() => useTheme());

    expect(result.current.packetColor('ERROR')).toBe(colorForType('ERROR'));
  });

  it('applies an unlocked selection, and follows the profile when it unlocks', () => {
    act(() => useSettingsStore.getState().selectCosmetic('palette', 'okabe-ito'));
    act(() => useSettingsStore.getState().selectCosmetic('cursor', 'ring'));
    const { result } = renderHook(() => useTheme());

    act(() => reachRankTwo());

    expect(result.current.packetColor('ERROR')).toBe('#d55e00');
    expect(result.current.cursor.id).toBe('ring');
  });
});
