import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/services/leaderboardService', () => ({
  deletePersonalScore: vi.fn(),
  isLeaderboardAvailable: vi.fn(),
}));
vi.mock('@/store/useAuthStore', () => ({
  useAuthStore: (selector: (state: { uid: string | null }) => unknown) => selector({ uid: 'uid1' }),
}));

import { Privacy } from '@/components/menu/Privacy';
import { deletePersonalScore, isLeaderboardAvailable } from '@/services/leaderboardService';
import { useGameStore } from '@/store/useGameStore';
import { useProgressStore } from '@/store/useProgressStore';
import { useSettingsStore } from '@/store/useSettingsStore';

describe('Privacy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (isLeaderboardAvailable as Mock).mockReturnValue(true);
    (deletePersonalScore as Mock).mockResolvedValue(undefined);
    useGameStore.setState({ ...useGameStore.getInitialState(), screen: 'privacy' });
  });

  it('names what is kept on the device and what is sent to the leaderboard', () => {
    render(<Privacy />);

    expect(screen.getByText(/never leave it/i)).toBeInTheDocument();
    expect(screen.getByText(/nickname you type/i)).toBeInTheDocument();
    expect(screen.getByText(/no email, no name, no account/i)).toBeInTheDocument();
  });

  it('warns that the nickname is public before the player picks one', () => {
    render(<Privacy />);

    expect(screen.getByText(/do not use your real name/i)).toBeInTheDocument();
  });

  it('says how long a saved score is kept', () => {
    render(<Privacy />);

    expect(screen.getByText(/stays until you delete it/i)).toBeInTheDocument();
  });

  it('deletes the score of every mode, not just the one last played', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Privacy />);

    await userEvent.click(screen.getByRole('button', { name: /delete my online scores/i }));

    await waitFor(() => expect(deletePersonalScore).toHaveBeenCalledTimes(3));
    expect(deletePersonalScore).toHaveBeenCalledWith('uid1', 'campaign');
    expect(deletePersonalScore).toHaveBeenCalledWith('uid1', 'endless');
    expect(deletePersonalScore).toHaveBeenCalledWith('uid1', 'daily');
    expect(await screen.findByRole('status')).toHaveTextContent(/have been deleted/i);
  });

  it('deletes nothing when the player backs out', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<Privacy />);

    await userEvent.click(screen.getByRole('button', { name: /delete my online scores/i }));

    expect(deletePersonalScore).not.toHaveBeenCalled();
  });

  it('says plainly that there is nothing online to delete in an offline build', async () => {
    (isLeaderboardAvailable as Mock).mockReturnValue(false);
    render(<Privacy />);

    await userEvent.click(screen.getByRole('button', { name: /delete my online scores/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/no online leaderboard/i);
    expect(deletePersonalScore).not.toHaveBeenCalled();
  });

  it('reports a failure instead of claiming the data is gone', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    (deletePersonalScore as Mock).mockRejectedValue(new Error('offline'));
    render(<Privacy />);

    await userEvent.click(screen.getByRole('button', { name: /delete my online scores/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/could not delete/i);
  });

  it('erases the preferences too, which the page promises and the profile alone did not', async () => {
    useSettingsStore.getState().setNickname('trinity');
    useSettingsStore.getState().markTutorialSeen();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Privacy />);

    await userEvent.click(screen.getByRole('button', { name: /erase this device/i }));

    expect(useSettingsStore.getState().nickname).toBe('');
    expect(useSettingsStore.getState().tutorialSeen).toBe(false);
    expect(localStorage.getItem('coredump.nickname')).toBeNull();
  });

  it('erases the local profile on confirmation', async () => {
    useProgressStore.getState().recordRunEnd({
      mode: 'campaign',
      score: 10,
      levelReached: 1,
      levelScore: 10,
      won: false,
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Privacy />);

    await userEvent.click(screen.getByRole('button', { name: /erase this device/i }));

    expect(useProgressStore.getState().stats.runsPlayed).toBe(0);
  });
});
