import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/services/leaderboardService', () => ({
  fetchTopScores: vi.fn(),
  fetchPersonalBest: vi.fn(),
  isLeaderboardAvailable: vi.fn(),
}));

import { Leaderboard } from '@/components/menu/Leaderboard';
import {
  fetchPersonalBest,
  fetchTopScores,
  isLeaderboardAvailable,
} from '@/services/leaderboardService';
import { useAuthStore } from '@/store/useAuthStore';
import { useGameStore } from '@/store/useGameStore';
import type { ScoreEntry } from '@/types/leaderboard.types';

function entry(overrides: Partial<ScoreEntry> = {}): ScoreEntry {
  return {
    id: 'e1',
    userId: 'other',
    displayName: 'neo',
    score: 900,
    levelReached: 7,
    timestampMs: 0,
    ...overrides,
  };
}

describe('Leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.setState({ ...useGameStore.getInitialState(), screen: 'leaderboard' });
    useAuthStore.setState({ uid: 'me', ready: true });
    (isLeaderboardAvailable as Mock).mockReturnValue(true);
    (fetchTopScores as Mock).mockResolvedValue([]);
    (fetchPersonalBest as Mock).mockResolvedValue(null);
  });

  it('says the board is loading before the scores arrive', () => {
    render(<Leaderboard />);

    expect(screen.getByText('Loading scores...')).toBeInTheDocument();
  });

  it('lists the scores that came back, with name, level and points', async () => {
    (fetchTopScores as Mock).mockResolvedValue([entry({ displayName: 'trinity', score: 1200 })]);

    render(<Leaderboard />);

    const row = await screen.findByRole('listitem');
    expect(row).toHaveTextContent('trinity');
    expect(row).toHaveTextContent('1200');
    expect(row).toHaveTextContent('lvl 7');
  });

  it('invites the first score instead of showing an empty list', async () => {
    render(<Leaderboard />);

    expect(await screen.findByText(/no scores yet/i)).toBeInTheDocument();
  });

  it('says the board could not be loaded when the fetch fails', async () => {
    (fetchTopScores as Mock).mockRejectedValue(new Error('offline'));

    render(<Leaderboard />);

    expect(await screen.findByText('Could not load the leaderboard.')).toBeInTheDocument();
  });

  it('explains that the build has no leaderboard, and drops the fairness note with it', () => {
    (isLeaderboardAvailable as Mock).mockReturnValue(false);

    render(<Leaderboard />);

    expect(
      screen.getByText('The online leaderboard is not configured in this build.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/not verified/i)).not.toBeInTheDocument();
  });

  it('warns that the scores are unverified once a board is shown', async () => {
    render(<Leaderboard />);

    expect(await screen.findByText(/not verified/i)).toBeInTheDocument();
  });

  it('opens on the mode the player just played', async () => {
    useGameStore.setState({ mode: 'daily' });

    render(<Leaderboard />);

    await waitFor(() => expect(fetchTopScores).toHaveBeenCalledWith('daily'));
    expect(screen.getByRole('button', { name: 'Daily' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('falls back to the campaign after a tutorial, which has no board', async () => {
    useGameStore.setState({ mode: 'tutorial' });

    render(<Leaderboard />);

    await waitFor(() => expect(fetchTopScores).toHaveBeenCalledWith('campaign'));
    expect(screen.getByRole('button', { name: 'Campaign' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('loads another mode when its tab is chosen', async () => {
    render(<Leaderboard />);
    await screen.findByText(/no scores yet/i);
    (fetchTopScores as Mock).mockResolvedValue([entry({ displayName: 'morpheus' })]);

    await userEvent.click(screen.getByRole('button', { name: 'Endless' }));

    expect(await screen.findByText('morpheus')).toBeInTheDocument();
    expect(fetchTopScores).toHaveBeenLastCalledWith('endless');
  });

  it("shows the player's own best apart from the ranked rows, unranked", async () => {
    (fetchPersonalBest as Mock).mockResolvedValue(
      entry({ id: 'me', userId: 'me', displayName: 'me', score: 40 }),
    );

    render(<Leaderboard />);

    const best = await screen.findByText('your best');
    expect(best.parentElement).toHaveTextContent('40');
  });

  it('goes back to the menu', async () => {
    render(<Leaderboard />);

    await userEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(useGameStore.getState().screen).toBe('menu');
  });
});
