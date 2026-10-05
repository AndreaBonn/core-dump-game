import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Settings } from '@/components/menu/Settings';
import { LevelSelect } from '@/components/menu/LevelSelect';
import { useGameStore } from '@/store/useGameStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useProgressStore } from '@/store/useProgressStore';

describe('LanguageSwitch', () => {
  beforeEach(() => {
    useGameStore.setState({ ...useGameStore.getInitialState(), screen: 'settings' });
    useSettingsStore.getState().setLanguage('it');
  });

  it('sits next to the nickname in the settings, with Italian selected by default', () => {
    render(<Settings />);

    const group = screen.getByRole('group', { name: 'Lingua' });
    const italian = screen.getByRole('button', { name: 'Italiano' });
    const english = screen.getByRole('button', { name: 'English' });

    expect(group).toContainElement(italian);
    // Same row as the nickname's label, the closest the game has to a user name.
    expect(group.parentElement).toContainElement(
      screen.getByText('Nickname', { selector: 'label' }),
    );
    expect(italian).toHaveAttribute('aria-pressed', 'true');
    expect(english).toHaveAttribute('aria-pressed', 'false');
  });

  it('translates the whole screen in place when English is picked', async () => {
    render(<Settings />);
    expect(screen.getByRole('heading', { name: 'Impostazioni' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'English' }));

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Impostazioni' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem('coredump.language')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('switches back to Italian', async () => {
    useSettingsStore.getState().setLanguage('en');
    render(<Settings />);

    await userEvent.click(screen.getByRole('button', { name: 'Italiano' }));

    expect(screen.getByRole('heading', { name: 'Impostazioni' })).toBeInTheDocument();
    expect(useSettingsStore.getState().language).toBe('it');
  });
});

describe('Italian copy', () => {
  beforeEach(() => {
    useSettingsStore.getState().setLanguage('it');
    useProgressStore.getState().clearProfile();
  });

  it('agrees the star count in number', () => {
    useProgressStore.setState({ progress: { stars: { 1: 1, 2: 2 }, unlockedThrough: 3 } });
    render(<LevelSelect />);

    expect(screen.getByRole('button', { name: 'Livello 1, 1 stella su 3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Livello 2, 2 stelle su 3' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Livello 4, bloccato. Supera prima il livello 3.' }),
    ).toBeInTheDocument();
  });
});
