import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/game/GameScreen', () => ({
  GameScreen: () => <div>game screen</div>,
}));
vi.mock('@/services/leaderboardService', () => ({
  fetchTopScores: vi.fn(() => Promise.resolve([])),
  fetchPersonalBest: vi.fn(() => Promise.resolve(null)),
  isLeaderboardAvailable: vi.fn(() => false),
}));

import App from '@/App';
import { useGameStore } from '@/store/useGameStore';
import { useProgressStore } from '@/store/useProgressStore';
import type { Screen } from '@/store/useGameStore';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.setState({ ...useGameStore.getInitialState(), screen: 'menu' });
    useProgressStore.getState().clearProfile();
  });

  it.each([
    ['menu', /core dump/i],
    ['game', /game screen/i],
    ['levels', /level 1/i],
    ['profile', /profile/i],
    ['achievements', /achievements/i],
    ['leaderboard', /leaderboard/i],
    ['settings', /settings/i],
    ['privacy', /privacy/i],
  ])('shows the %s screen', (screenName, heading) => {
    useGameStore.setState({ screen: screenName as Screen });

    render(<App />);

    expect(screen.getAllByText(heading).length).toBeGreaterThan(0);
  });

  it('shows one screen at a time', () => {
    useGameStore.setState({ screen: 'settings' });

    render(<App />);

    expect(screen.queryByText('game screen')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('keeps the achievement toast available on every screen, not just in game', () => {
    useProgressStore.setState({ pending: ['hello-world'] });
    useGameStore.setState({ screen: 'menu' });

    render(<App />);

    expect(screen.getByRole('status')).toHaveTextContent(/achievement unlocked/i);
  });
});
