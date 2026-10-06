import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Profile } from '@/components/menu/Profile';
import { AchievementToast } from '@/components/shared/AchievementToast';
import { getLevel } from '@/config/levels';
import { rankFor, rankPendingId } from '@/engine/core/ranks';
import { EMPTY_STATS } from '@/engine/core/stats';
import { xpFor } from '@/engine/core/xp';
import { useGameStore } from '@/store/useGameStore';
import { useProgressStore } from '@/store/useProgressStore';

function resetStores() {
  localStorage.clear();
  useGameStore.setState({ ...useGameStore.getInitialState(), screen: 'menu' });
  useProgressStore.getState().clearProfile();
}

/** 12 clears, 20 stars off any boss and 5 achievements: 1200 + 1000 + 375 = 2575 XP, rank 3 of 8. */
function seedMidProfile() {
  useProgressStore.setState({
    stats: { ...EMPTY_STATS, runsPlayed: 4, levelsCleared: 12 },
    progress: { stars: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 7: 3, 8: 2 }, unlockedThrough: 9 },
    earned: ['hello-world', 'first-commit', 'sudo', 'segfault', 'three-stars'],
  });
}

describe('Profile rank', () => {
  beforeEach(resetStores);

  it('shows the rank, the XP and a progress bar towards the next rank', () => {
    seedMidProfile();

    render(<Profile />);

    expect(screen.getByText('junior dev')).toBeInTheDocument();
    expect(screen.getByText('rank 3/8')).toBeInTheDocument();
    const bar = screen.getByRole('progressbar', { name: 'XP to the next rank' });
    expect(bar).toHaveAttribute('aria-valuenow', '2575');
    expect(bar).toHaveAttribute('aria-valuemin', '1500');
    expect(bar).toHaveAttribute('aria-valuemax', '3000');
    expect(screen.getByText('2575 / 3000 XP')).toBeInTheDocument();
    expect(bar).toHaveAttribute('aria-valuetext', '2575 / 3000 XP');
  });

  it('fills the bar and says so once the top rank is reached', () => {
    useProgressStore.setState({ stats: { ...EMPTY_STATS, runsPlayed: 1, levelsCleared: 250 } });

    render(<Profile />);

    expect(screen.getByText('root')).toBeInTheDocument();
    expect(screen.getByText('top rank reached')).toBeInTheDocument();
    expect(screen.getByText('25000 XP')).toBeInTheDocument();
    const bar = screen.getByRole('progressbar', { name: 'XP to the next rank' });
    expect(bar.getAttribute('aria-valuenow')).toBe(bar.getAttribute('aria-valuemax'));
  });
});

describe('rank-up notification', () => {
  beforeEach(resetStores);

  it('queues one rank-up entry when the profile crosses a rank threshold', () => {
    const store = useProgressStore.getState;
    let level = 1;
    while (rankFor(xpFor(store())).index < 2) {
      store().recordLevelResult(level, getLevel(level).starThresholds[2], 'campaign');
      level += 1;
    }

    expect(store().pending.filter((entry) => entry === rankPendingId('intern'))).toHaveLength(1);
  });

  it('queues a single rank-up when a richer save file jumps several ranks at once', () => {
    useProgressStore.getState().hydrateFromFile(
      JSON.stringify({
        progress: { stars: {}, unlockedThrough: 1 },
        stats: { ...EMPTY_STATS, runsPlayed: 9, levelsCleared: 60 },
        earned: [],
        // Same reset as the live profile, or the merge would discard the file as stale.
        resetAt: useProgressStore.getState().resetAt,
      }),
    );

    const ranks = useProgressStore.getState().pending.filter((entry) => entry.startsWith('rank:'));
    expect(ranks).toEqual([rankPendingId('devops')]);
  });

  it('queues nothing for the rank a profile already had', () => {
    useProgressStore.getState().recordLevelResult(1, 0, 'campaign');

    expect(useProgressStore.getState().pending.some((entry) => entry.startsWith('rank:'))).toBe(
      false,
    );
  });

  it('announces a rank-up in the toast with the new rank name', () => {
    useProgressStore.setState({ pending: [rankPendingId('sysadmin')] });

    render(<AchievementToast />);

    expect(screen.getByRole('status')).toHaveTextContent(/rank up/i);
    expect(screen.getByRole('status')).toHaveTextContent('sysadmin');
  });
});
