import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameOverScreen } from '@/components/game/GameOverScreen';
import type { GameResult } from '@/store/useGameStore';
import type { SaveStatus } from '@/types/leaderboard.types';

const lostRun: GameResult = { finalScore: 1500, levelReached: 4, won: false };

function renderScreen(overrides: Partial<Parameters<typeof GameOverScreen>[0]> = {}) {
  const props = {
    result: lostRun,
    defaultNickname: 'neo',
    saveStatus: 'idle' as SaveStatus,
    onSave: vi.fn(),
    onRetry: vi.fn(),
    onMenu: vi.fn(),
    ...overrides,
  };
  render(<GameOverScreen {...props} />);
  return props;
}

describe('GameOverScreen', () => {
  it('shows the score and the level the run reached', () => {
    renderScreen();

    expect(screen.getByText('1500')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('titles a lost run as a core dump and a won one as stable', () => {
    const { unmount } = render(
      <GameOverScreen
        result={lostRun}
        defaultNickname=""
        saveStatus="idle"
        onSave={vi.fn()}
        onRetry={vi.fn()}
        onMenu={vi.fn()}
      />,
    );
    expect(screen.getByRole('dialog', { name: 'CORE DUMPED' })).toBeInTheDocument();
    unmount();

    renderScreen({ result: { ...lostRun, won: true } });
    expect(screen.getByRole('dialog', { name: 'SYSTEM STABLE' })).toBeInTheDocument();
  });

  it('saves the nickname the player typed, not the one it was given', async () => {
    const props = renderScreen();

    const field = screen.getByLabelText(/nickname/i);
    await userEvent.clear(field);
    await userEvent.type(field, 'trinity');
    await userEvent.click(screen.getByRole('button', { name: /save score/i }));

    expect(props.onSave).toHaveBeenCalledWith('trinity');
  });

  it.each([
    ['saving', /saving/i],
    ['saved', /score saved/i],
    ['notABest', /still higher/i],
    ['error', /not saved/i],
  ])('reports the %s state to the player', (status, message) => {
    renderScreen({ saveStatus: status as SaveStatus });

    expect(screen.getByRole('status')).toHaveTextContent(message);
  });

  it('blocks a second submission while one is in flight', () => {
    renderScreen({ saveStatus: 'saving' });

    expect(screen.getByRole('button', { name: /save score/i })).toBeDisabled();
  });

  it('lets the player retry after a failed save', async () => {
    const props = renderScreen({ saveStatus: 'error' });

    expect(screen.getByRole('button', { name: /save score/i })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: /^retry$/i }));

    expect(props.onRetry).toHaveBeenCalledTimes(1);
  });

  it('hides the whole saving flow when there is no leaderboard to save to', () => {
    renderScreen({ saveStatus: 'unavailable' });

    expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save score/i })).not.toBeInTheDocument();
  });

  it('always offers a way back to the menu', async () => {
    const props = renderScreen();

    await userEvent.click(screen.getByRole('button', { name: /menu/i }));

    expect(props.onMenu).toHaveBeenCalledTimes(1);
  });
});
