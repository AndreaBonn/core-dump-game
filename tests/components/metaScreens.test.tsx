import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Achievements } from '@/components/menu/Achievements';
import { LevelSelect } from '@/components/menu/LevelSelect';
import { Profile } from '@/components/menu/Profile';
import { AchievementToast } from '@/components/shared/AchievementToast';
import { getLevel, TOTAL_LEVELS } from '@/config/levels';
import { ACHIEVEMENTS } from '@/engine/core/achievements';
import { useGameStore } from '@/store/useGameStore';
import { useProgressStore } from '@/store/useProgressStore';

function resetStores() {
  localStorage.clear();
  useGameStore.setState({ ...useGameStore.getInitialState(), screen: 'menu' });
  useProgressStore.getState().clearProfile();
}

describe('LevelSelect', () => {
  beforeEach(resetStores);

  it('locks every level except the first on a fresh profile', () => {
    render(<LevelSelect />);

    expect(screen.getByRole('button', { name: /Level 1, 0 of 3 stars/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Level 2, locked/ })).toBeDisabled();
  });

  it('starts the campaign from the chosen level', async () => {
    useProgressStore.getState().recordLevelResult(1, getLevel(1).starThresholds[0]);
    render(<LevelSelect />);

    await userEvent.click(screen.getByRole('button', { name: /Level 2/ }));

    expect(useGameStore.getState().screen).toBe('game');
    expect(useGameStore.getState().startLevel).toBe(2);
    expect(useGameStore.getState().level).toBe(2);
  });

  it('announces the rating in the accessible name, not with colour alone', () => {
    useProgressStore.getState().recordLevelResult(1, getLevel(1).starThresholds[2]);
    render(<LevelSelect />);

    expect(screen.getByRole('button', { name: /Level 1, 3 of 3 stars/ })).toBeInTheDocument();
  });

  it('lists every campaign level', () => {
    render(<LevelSelect />);

    expect(screen.getAllByRole('listitem')).toHaveLength(TOTAL_LEVELS);
  });

  it('goes back to the menu', async () => {
    render(<LevelSelect />);

    await userEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(useGameStore.getState().screen).toBe('menu');
  });
});

describe('Profile', () => {
  beforeEach(resetStores);

  it('invites a first run instead of showing a wall of zeroes', () => {
    render(<Profile />);

    expect(screen.getByText(/no runs recorded yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /play a first run/i })).toBeInTheDocument();
  });

  it('shows the recorded statistics once there is something to show', () => {
    useProgressStore.getState().recordRunEnd({
      mode: 'endless',
      score: 4200,
      levelReached: 14,
      levelScore: 300,
      won: false,
    });

    render(<Profile />);

    expect(screen.getByText('4200')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
  });

  it('asks before erasing a profile, and erases it on confirmation', async () => {
    useProgressStore.getState().recordRunEnd({
      mode: 'campaign',
      score: 100,
      levelReached: 1,
      levelScore: 100,
      won: false,
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Profile />);

    await userEvent.click(screen.getByRole('button', { name: /erase local progress/i }));

    expect(useProgressStore.getState().stats.runsPlayed).toBe(0);
  });

  it('keeps the profile when the player backs out of erasing it', async () => {
    useProgressStore.getState().recordRunEnd({
      mode: 'campaign',
      score: 100,
      levelReached: 1,
      levelScore: 100,
      won: false,
    });
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<Profile />);

    await userEvent.click(screen.getByRole('button', { name: /erase local progress/i }));

    expect(useProgressStore.getState().stats.runsPlayed).toBe(1);
  });

  it('shows a dash instead of a zero combo the player never chained', () => {
    useProgressStore.getState().recordRunEnd({
      mode: 'campaign',
      score: 100,
      levelReached: 1,
      levelScore: 100,
      won: false,
    });
    render(<Profile />);
    expect(screen.getByText('best combo').nextElementSibling).toHaveTextContent('-');

    act(() => useProgressStore.getState().noteCombo(5));

    expect(screen.getByText('best combo').nextElementSibling).toHaveTextContent('x5');
  });

  it('goes back to the menu', async () => {
    render(<Profile />);

    await userEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(useGameStore.getState().screen).toBe('menu');
  });

  it('starts a campaign run from the empty profile', async () => {
    render(<Profile />);

    await userEvent.click(screen.getByRole('button', { name: /play a first run/i }));

    expect(useGameStore.getState().screen).toBe('game');
    expect(useGameStore.getState().mode).toBe('campaign');
  });
});

describe('Achievements', () => {
  beforeEach(resetStores);

  it('lists the whole catalogue with a count of what is unlocked', () => {
    render(<Achievements />);

    expect(screen.getAllByRole('listitem')).toHaveLength(ACHIEVEMENTS.length);
    expect(screen.getByText(`0/${ACHIEVEMENTS.length}`)).toBeInTheDocument();
  });

  it('marks unlocked entries in words, not only in colour', () => {
    useProgressStore.getState().noteCombo(4);

    render(<Achievements />);

    expect(screen.getAllByText('unlocked')).toHaveLength(3);
    expect(screen.getAllByText('locked')).toHaveLength(ACHIEVEMENTS.length - 3);
    expect(screen.getByText(`3/${ACHIEVEMENTS.length}`)).toBeInTheDocument();
  });

  it('goes back to the menu', async () => {
    render(<Achievements />);

    await userEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(useGameStore.getState().screen).toBe('menu');
  });
});

describe('AchievementToast', () => {
  beforeEach(resetStores);

  it('shows nothing when nothing was just unlocked', () => {
    render(<AchievementToast />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    act(() => useProgressStore.setState({ pending: [ACHIEVEMENTS[0]!.id] }));

    expect(screen.getByRole('status')).toHaveTextContent(ACHIEVEMENTS[0]!.name);
  });

  it('stays silent on an id the catalogue no longer has, rather than announcing a blank', () => {
    useProgressStore.setState({ pending: ['retired-achievement'] });

    render(<AchievementToast />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('announces an unlock and steps aside on its own', () => {
    vi.useFakeTimers();
    try {
      useProgressStore.getState().noteCombo(2);
      render(<AchievementToast />);

      expect(screen.getByRole('status')).toHaveTextContent(/SEGFAULT/i);

      // Advance inside act so the state update the timeout schedules is
      // flushed before the assertion, rather than waited for on a real clock.
      act(() => {
        vi.advanceTimersByTime(4000);
      });

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows one unlock at a time when several land together', () => {
    useProgressStore.getState().noteCombo(4);

    render(<AchievementToast />);

    expect(screen.getAllByRole('status')).toHaveLength(1);
  });
});
