import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HUD } from '@/components/game/HUD';
import { TOTAL_LEVELS } from '@/config/levels';
import { labelForType } from '@/config/packetTypes';
import { useGameStore } from '@/store/useGameStore';

/** The HUD clears the combo and the power-up name after this long. */
const COMBO_VISIBLE_MS = 1200;

describe('HUD', () => {
  beforeEach(() => {
    useGameStore.setState({ ...useGameStore.getInitialState(), screen: 'game' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the running score and the level out of the campaign total', () => {
    useGameStore.setState({ score: 2400, level: 3 });

    render(<HUD onPause={vi.fn()} />);

    expect(screen.getByTestId('hud-score')).toHaveTextContent('2400');
    expect(screen.getByTestId('hud-level')).toHaveTextContent(`3/${TOTAL_LEVELS}`);
  });

  it('previews the packet that will be fired next', () => {
    useGameStore.setState({ nextPacket: 'ERROR' });

    render(<HUD onPause={vi.fn()} />);

    expect(screen.getByText('next')).toBeInTheDocument();
    expect(screen.getByText(labelForType('ERROR'))).toBeInTheDocument();
  });

  it('hides the preview until the engine reports a packet', () => {
    useGameStore.setState({ nextPacket: null });

    render(<HUD onPause={vi.fn()} />);

    expect(screen.queryByText('next')).not.toBeInTheDocument();
  });

  it('pauses the run from the HUD', async () => {
    const onPause = vi.fn();
    render(<HUD onPause={onPause} />);

    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));

    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('flashes the combo, then clears it so it does not sit over the board', () => {
    vi.useFakeTimers();
    useGameStore.setState({ combo: { text: 'CHAIN', multiplier: 3 } });

    render(<HUD onPause={vi.fn()} />);
    expect(screen.getByText(/CHAIN/)).toBeInTheDocument();
    expect(screen.getByText('x3')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(COMBO_VISIBLE_MS);
    });

    expect(useGameStore.getState().combo).toBeNull();
    expect(screen.queryByText(/CHAIN/)).not.toBeInTheDocument();
  });

  it('flashes the power-up name, then clears it', () => {
    vi.useFakeTimers();
    useGameStore.setState({ powerUp: 'sleep()' });

    render(<HUD onPause={vi.fn()} />);
    expect(screen.getByText('sleep()')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(COMBO_VISIBLE_MS);
    });

    expect(useGameStore.getState().powerUp).toBeNull();
  });

  it('leaves the combo alone before its time is up', () => {
    vi.useFakeTimers();
    useGameStore.setState({ combo: { text: 'CHAIN', multiplier: 3 } });

    render(<HUD onPause={vi.fn()} />);
    act(() => {
      vi.advanceTimersByTime(COMBO_VISIBLE_MS - 1);
    });

    expect(useGameStore.getState().combo).not.toBeNull();
  });

  it('does not clear a combo that arrives after the HUD is gone', () => {
    vi.useFakeTimers();
    useGameStore.setState({ combo: { text: 'CHAIN', multiplier: 3 } });
    const { unmount } = render(<HUD onPause={vi.fn()} />);

    unmount();
    act(() => {
      vi.advanceTimersByTime(COMBO_VISIBLE_MS * 2);
    });

    expect(useGameStore.getState().combo).not.toBeNull();
  });
});
