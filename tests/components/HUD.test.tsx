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
    useGameStore.setState({ score: 2400, level: 3, mode: 'campaign' });

    render(<HUD onPause={vi.fn()} />);

    expect(screen.getByTestId('hud-score')).toHaveTextContent('2400');
    expect(screen.getByTestId('hud-level')).toHaveTextContent(`3/${TOTAL_LEVELS}`);
  });

  it('shows only the level reached in endless, where the campaign total means nothing', () => {
    useGameStore.setState({ level: 15, mode: 'endless' });

    render(<HUD onPause={vi.fn()} />);

    expect(screen.getByTestId('hud-level')).toHaveTextContent('15');
    expect(screen.getByTestId('hud-level')).not.toHaveTextContent(`/${TOTAL_LEVELS}`);
  });

  it('shows only the level reached in a daily run', () => {
    useGameStore.setState({ level: 7, mode: 'daily' });

    render(<HUD onPause={vi.fn()} />);

    expect(screen.getByTestId('hud-level')).toHaveTextContent('7');
    expect(screen.getByTestId('hud-level')).not.toHaveTextContent(`/${TOTAL_LEVELS}`);
  });

  it('badges a campaign boss level, in text and not only in colour', () => {
    useGameStore.setState({ level: 6, mode: 'campaign' });

    render(<HUD onPause={vi.fn()} />);

    expect(screen.getByText('BOSS')).toBeInTheDocument();
  });

  it('does not badge a non-boss campaign level', () => {
    useGameStore.setState({ level: 3, mode: 'campaign' });

    render(<HUD onPause={vi.fn()} />);

    expect(screen.queryByText('BOSS')).not.toBeInTheDocument();
  });

  it('never badges a boss outside campaign, where chapters do not apply', () => {
    useGameStore.setState({ level: 6, mode: 'endless' });

    render(<HUD onPause={vi.fn()} />);

    expect(screen.queryByText('BOSS')).not.toBeInTheDocument();
  });

  it('announces the current wave of a multi-wave level', () => {
    useGameStore.setState({ level: 25, mode: 'campaign', wave: 2, waveTotal: 3 });

    render(<HUD onPause={vi.fn()} />);

    expect(screen.getByTestId('hud-wave')).toHaveTextContent('wave 2/3');
    expect(screen.getByTestId('hud-wave')).toHaveAttribute('aria-live', 'polite');
  });

  it('shows no wave counter on a single-wave level', () => {
    useGameStore.setState({ level: 3, mode: 'campaign', wave: 1, waveTotal: 1 });

    render(<HUD onPause={vi.fn()} />);

    expect(screen.queryByTestId('hud-wave')).not.toBeInTheDocument();
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
    useGameStore.setState({ combo: { id: 'kernelPanic', multiplier: 3 } });

    render(<HUD onPause={vi.fn()} />);
    expect(screen.getByText(/KERNEL PANIC/)).toBeInTheDocument();
    expect(screen.getByText('x3')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(COMBO_VISIBLE_MS);
    });

    expect(useGameStore.getState().combo).toBeNull();
    expect(screen.queryByText(/KERNEL PANIC/)).not.toBeInTheDocument();
  });

  it('flashes the power-up name, then clears it', () => {
    vi.useFakeTimers();
    useGameStore.setState({ powerUp: 'SLEEP' });

    render(<HUD onPause={vi.fn()} />);
    expect(screen.getByText('sleep()')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(COMBO_VISIBLE_MS);
    });

    expect(useGameStore.getState().powerUp).toBeNull();
    expect(screen.queryByText('sleep()')).not.toBeInTheDocument();
  });

  it('leaves the combo alone before its time is up', () => {
    vi.useFakeTimers();
    useGameStore.setState({ combo: { id: 'kernelPanic', multiplier: 3 } });

    render(<HUD onPause={vi.fn()} />);
    act(() => {
      vi.advanceTimersByTime(COMBO_VISIBLE_MS - 1);
    });

    expect(useGameStore.getState().combo).not.toBeNull();
    expect(screen.getByText(/KERNEL PANIC/)).toBeInTheDocument();
  });

  it('does not clear a combo that arrives after the HUD is gone', () => {
    vi.useFakeTimers();
    useGameStore.setState({ combo: { id: 'kernelPanic', multiplier: 3 } });
    const { unmount } = render(<HUD onPause={vi.fn()} />);

    unmount();
    act(() => {
      vi.advanceTimersByTime(COMBO_VISIBLE_MS * 2);
    });

    expect(useGameStore.getState().combo).not.toBeNull();
  });
});
