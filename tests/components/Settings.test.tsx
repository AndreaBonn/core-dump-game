import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Settings } from '@/components/menu/Settings';
import { useGameStore } from '@/store/useGameStore';
import { useSettingsStore } from '@/store/useSettingsStore';

function resetStores() {
  localStorage.clear();
  useGameStore.setState({ ...useGameStore.getInitialState(), screen: 'settings' });
  useSettingsStore.getState().resetSettings();
}

describe('Settings', () => {
  beforeEach(resetStores);

  it('offers to mute while the sound is on, and to unmute once it is off', async () => {
    render(<Settings />);
    const toggle = screen.getByRole('button', { name: 'Mute' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(toggle);

    expect(useSettingsStore.getState().muted).toBe(true);
    const pressed = screen.getByRole('button', { name: 'Unmute' });
    expect(pressed).toHaveAttribute('aria-pressed', 'true');
  });

  it('turns the sound back on when the toggle is pressed twice', async () => {
    render(<Settings />);

    await userEvent.click(screen.getByRole('button', { name: 'Mute' }));
    await userEvent.click(screen.getByRole('button', { name: 'Unmute' }));

    expect(useSettingsStore.getState().muted).toBe(false);
  });

  it('opens on the nickname already stored, not on an empty field', () => {
    useSettingsStore.getState().setNickname('neo');

    render(<Settings />);

    expect(screen.getByLabelText('Nickname')).toHaveValue('neo');
  });

  it('stores the nickname as it is typed', async () => {
    render(<Settings />);

    await userEvent.type(screen.getByLabelText('Nickname'), 'trinity');

    expect(useSettingsStore.getState().nickname).toBe('trinity');
  });

  it('caps the nickname field at the length the leaderboard stores', () => {
    render(<Settings />);

    expect(screen.getByLabelText('Nickname')).toHaveAttribute('maxLength', '24');
  });

  it('reaches the privacy screen from the settings', async () => {
    render(<Settings />);

    await userEvent.click(screen.getByRole('button', { name: /privacy and your data/i }));

    expect(useGameStore.getState().screen).toBe('privacy');
  });

  it('goes back to the menu', async () => {
    render(<Settings />);

    await userEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(useGameStore.getState().screen).toBe('menu');
  });
});
