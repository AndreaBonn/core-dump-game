import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MainMenu } from '@/components/menu/MainMenu';
import { useGameStore } from '@/store/useGameStore';
import { useSettingsStore } from '@/store/useSettingsStore';

describe('MainMenu', () => {
  beforeEach(() => {
    useGameStore.setState({ ...useGameStore.getInitialState(), screen: 'menu' });
    useSettingsStore.setState({ tutorialSeen: true });
  });

  it.each([
    ['Play Campaign', 'campaign'],
    ['Endless', 'endless'],
    ['Daily Challenge', 'daily'],
    ['Tutorial', 'tutorial'],
  ])('%s starts a run in %s mode', async (label, mode) => {
    render(<MainMenu />);

    await userEvent.click(screen.getByRole('button', { name: label }));

    expect(useGameStore.getState().screen).toBe('game');
    expect(useGameStore.getState().mode).toBe(mode);
  });

  it.each([
    ['Select Level', 'levels'],
    ['Leaderboard', 'leaderboard'],
    ['Profile', 'profile'],
    ['Achievements', 'achievements'],
    ['Settings', 'settings'],
  ])('%s opens the %s screen without starting a run', async (label, target) => {
    render(<MainMenu />);

    await userEvent.click(screen.getByRole('button', { name: label }));

    expect(useGameStore.getState().screen).toBe(target);
  });

  it('offers exactly the nine entries the menu is meant to have', () => {
    render(<MainMenu />);

    expect(screen.getAllByRole('button')).toHaveLength(9);
  });

  it('teaches a first-time player instead of dropping them into level 1', async () => {
    useSettingsStore.setState({ tutorialSeen: false });
    render(<MainMenu />);

    await userEvent.click(screen.getByRole('button', { name: 'Play Campaign' }));

    expect(useGameStore.getState().mode).toBe('tutorial');
  });
});
