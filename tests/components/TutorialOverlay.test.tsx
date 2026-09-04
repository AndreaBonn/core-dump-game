import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TutorialOverlay } from '@/components/game/TutorialOverlay';
import { tutorialConfig } from '@/engine/core/runController';
import { useGameStore } from '@/store/useGameStore';
import { useSettingsStore } from '@/store/useSettingsStore';

describe('the tutorial run', () => {
  it('is one short, slow level with no power-ups or hazards to distract', () => {
    const config = tutorialConfig();
    const level = config.levelProvider(1);

    expect(level).not.toBeNull();
    expect(level!.chainLength).toBeLessThan(20);
    expect(level!.powerUpChance).toBe(0);
    expect(level!.hazardChance).toBe(0);
    expect(config.levelProvider(2)).toBeNull();
  });

  it('is won by clearing its only level', () => {
    expect(tutorialConfig().finalLevel).toBe(1);
  });
});

describe('TutorialOverlay', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.setState({ ...useGameStore.getInitialState(), screen: 'game' });
    useSettingsStore.setState({ tutorialSeen: false });
  });

  it('opens on the first thing a player needs to know', () => {
    render(<TutorialOverlay />);

    expect(screen.getByRole('region', { name: 'Tutorial' })).toBeInTheDocument();
    expect(screen.getByText(/aim and fire/i)).toBeInTheDocument();
    expect(screen.getByText(/step 1 of 4/i)).toBeInTheDocument();
  });

  it('moves on when the player acknowledges a step', async () => {
    render(<TutorialOverlay />);

    await userEvent.click(screen.getByRole('button', { name: /got it/i }));

    expect(screen.getByText(/match three/i)).toBeInTheDocument();
  });

  it('clears a step the player has already done, without asking', async () => {
    render(<TutorialOverlay />);
    await userEvent.click(screen.getByRole('button', { name: /got it/i }));
    expect(screen.getByText(/match three/i)).toBeInTheDocument();

    // Scoring is the thing that step asks for, so it should not need a button.
    act(() => {
      useGameStore.getState().setScore(30);
    });

    expect(screen.getByText(/swap the queue/i)).toBeInTheDocument();
  });

  it('can be skipped at any point, and does not come back', async () => {
    render(<TutorialOverlay />);

    await userEvent.click(screen.getByRole('button', { name: /skip tutorial/i }));

    expect(useSettingsStore.getState().tutorialSeen).toBe(true);
    expect(useGameStore.getState().screen).toBe('menu');
  });

  it('steps aside once every step is done', async () => {
    render(<TutorialOverlay />);

    await userEvent.click(screen.getByRole('button', { name: /got it/i }));
    act(() => {
      useGameStore.getState().setScore(30);
    });
    await userEvent.click(screen.getByRole('button', { name: /got it/i }));
    await userEvent.click(screen.getByRole('button', { name: /got it/i }));

    expect(screen.queryByRole('region', { name: 'Tutorial' })).not.toBeInTheDocument();
  });
});
