import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CosmeticPicker } from '@/components/menu/CosmeticPicker';
import { Profile } from '@/components/menu/Profile';
import { EMPTY_STATS } from '@/engine/core/stats';
import { useGameStore } from '@/store/useGameStore';
import { useProgressStore } from '@/store/useProgressStore';
import { useSettingsStore } from '@/store/useSettingsStore';

function resetStores() {
  localStorage.clear();
  useGameStore.setState({ ...useGameStore.getInitialState(), screen: 'menu' });
  useProgressStore.getState().clearProfile();
  useSettingsStore.getState().resetSettings();
  // resetSettings also restores the default language, Italian; these tests read English.
  useSettingsStore.getState().setLanguage('en');
}

describe('CosmeticPicker', () => {
  beforeEach(resetStores);

  it('offers one choice group per slot with the defaults selected', () => {
    render(<CosmeticPicker />);

    for (const name of ['Cursor', 'Chain', 'Palette']) {
      expect(screen.getByRole('group', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('radio', { name: /Classic/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /^Standard cursor/ })).toBeChecked();
  });

  it('lets a brand-new player pick a colour-blind palette at once', async () => {
    render(<CosmeticPicker />);

    await userEvent.click(screen.getByRole('radio', { name: /Okabe-Ito/ }));

    expect(useSettingsStore.getState().cosmetics.palette).toBe('okabe-ito');
    expect(screen.getByRole('radio', { name: /Okabe-Ito/ })).toBeChecked();
  });

  it('shows a locked item disabled, with what unlocks it written out', () => {
    render(<CosmeticPicker />);

    const neon = screen.getByRole('radio', { name: /Neon/ });
    expect(neon).toBeDisabled();
    const palette = screen.getByRole('group', { name: 'Palette' });
    expect(within(palette).getByText('clear 3 bosses')).toBeInTheDocument();
  });

  it('enables an item once the profile unlocks it', () => {
    useProgressStore.setState({ stats: { ...EMPTY_STATS, runsPlayed: 1, levelsCleared: 5 } });

    render(<CosmeticPicker />);

    expect(screen.getByRole('radio', { name: /^Ring/ })).toBeEnabled();
    expect(screen.getByRole('radio', { name: /^Diamond/ })).toBeDisabled();
  });

  it('is on the profile even before the first run', () => {
    render(<Profile />);

    expect(screen.getByRole('group', { name: 'Palette' })).toBeInTheDocument();
  });
});
