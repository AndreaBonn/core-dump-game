import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/** The engine the screen drives; the canvas itself has its own tests. */
const engine = {
  pause: vi.fn(),
  resume: vi.fn(),
  startLevel: vi.fn(),
  nextLevel: vi.fn(),
  startRun: vi.fn(),
};

/** The handlers the screen gives the canvas, so a test can fire engine events. */
let engineEvents: EngineEvents;

vi.mock('@/components/game/GameCanvas', () => ({
  GameCanvas: ({
    onReady,
    events,
  }: {
    onReady: (value: unknown) => void;
    events: EngineEvents;
  }) => {
    engineEvents = events;
    onReady(engine);
    return <div data-testid="canvas" />;
  },
}));
vi.mock('@/services/authService', () => ({ ensureSignedIn: vi.fn() }));
vi.mock('@/services/leaderboardService', () => ({
  isLeaderboardAvailable: vi.fn(),
  saveScore: vi.fn(),
}));

import { GameScreen } from '@/components/game/GameScreen';
import { ensureSignedIn } from '@/services/authService';
import { isLeaderboardAvailable, saveScore } from '@/services/leaderboardService';
import { getLevel } from '@/config/levels';
import { useGameStore } from '@/store/useGameStore';
import { useProgressStore } from '@/store/useProgressStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { RunMode } from '@/engine/core/runController';
import type { EngineEvents } from '@/types/game.types';

const lostRun = { finalScore: 1500, levelReached: 4, won: false };

function endRunWith(mode: RunMode = 'campaign') {
  useGameStore.setState({ mode, status: 'gameOver', gameResult: lostRun, score: 1500 });
}

describe('GameScreen', () => {
  afterEach(() => {
    // These tests spy on document.hidden; without this the getter stays
    // replaced for whatever runs next in this file.
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useGameStore.setState({ ...useGameStore.getInitialState(), screen: 'game' });
    useProgressStore.getState().clearProfile();
    useSettingsStore.getState().resetSettings();
    (isLeaderboardAvailable as Mock).mockReturnValue(true);
    (ensureSignedIn as Mock).mockResolvedValue('uid1');
    (saveScore as Mock).mockResolvedValue('saved');
  });

  describe('pausing', () => {
    it('pauses the engine and the run from the HUD', async () => {
      render(<GameScreen />);

      await userEvent.click(screen.getByRole('button', { name: 'Pause' }));

      expect(engine.pause).toHaveBeenCalledTimes(1);
      expect(useGameStore.getState().status).toBe('paused');
      expect(screen.getByRole('dialog', { name: 'PAUSED' })).toBeInTheDocument();
    });

    it('pauses when the tab is hidden, so the chain does not advance unattended', () => {
      render(<GameScreen />);

      act(() => {
        vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(useGameStore.getState().status).toBe('paused');
    });

    it('does not resume by itself when the tab comes back', () => {
      render(<GameScreen />);
      const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
      act(() => document.dispatchEvent(new Event('visibilitychange')));

      hidden.mockReturnValue(false);
      act(() => document.dispatchEvent(new Event('visibilitychange')));

      expect(useGameStore.getState().status).toBe('paused');
      expect(engine.resume).not.toHaveBeenCalled();
    });

    it('resumes the run from the pause overlay', async () => {
      render(<GameScreen />);
      await userEvent.click(screen.getByRole('button', { name: 'Pause' }));

      await userEvent.click(screen.getByRole('button', { name: 'Resume' }));

      expect(engine.resume).toHaveBeenCalledTimes(1);
      expect(useGameStore.getState().status).toBe('playing');
    });

    it('restarts the level the player is on, not the first one', async () => {
      useGameStore.setState({ level: 5, status: 'paused' });
      render(<GameScreen />);

      await userEvent.click(screen.getByRole('button', { name: 'Restart level' }));

      expect(engine.startLevel).toHaveBeenCalledWith(5);
      expect(useGameStore.getState().status).toBe('playing');
    });

    it('quits to the menu', async () => {
      useGameStore.setState({ status: 'paused' });
      render(<GameScreen />);

      await userEvent.click(screen.getByRole('button', { name: 'Quit to menu' }));

      expect(useGameStore.getState().screen).toBe('menu');
    });

    it('stops listening for the tab once the screen is gone', () => {
      const { unmount } = render(<GameScreen />);

      unmount();
      vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
      document.dispatchEvent(new Event('visibilitychange'));

      expect(useGameStore.getState().status).toBe('playing');
    });
  });

  describe('what the engine reports', () => {
    it('shows the running score and level the engine sends', () => {
      render(<GameScreen />);

      act(() => {
        engineEvents.onScoreChange(2400);
        engineEvents.onLevelChange(3);
        engineEvents.onNextPacketChange('ERROR');
      });

      expect(useGameStore.getState().score).toBe(2400);
      expect(screen.getByTestId('hud-score')).toHaveTextContent('2400');
      expect(screen.getByTestId('hud-level')).toHaveTextContent('3/');
      expect(useGameStore.getState().nextPacket).toBe('ERROR');
    });

    it('records a combo in the profile as well as flashing it on the HUD', () => {
      render(<GameScreen />);

      act(() => engineEvents.onComboChange({ text: 'CHAIN', multiplier: 4 }));

      expect(useGameStore.getState().combo).toEqual({ text: 'CHAIN', multiplier: 4 });
      expect(useProgressStore.getState().stats.bestCombo).toBe(4);
    });

    it('does not record a combo when the engine clears the label', () => {
      render(<GameScreen />);
      act(() => engineEvents.onComboChange({ text: 'CHAIN', multiplier: 4 }));

      act(() => engineEvents.onComboChange(null));

      expect(useGameStore.getState().combo).toBeNull();
      expect(useProgressStore.getState().stats.bestCombo).toBe(4);
    });

    it('names the power-up on the HUD and counts it in the profile', () => {
      render(<GameScreen />);

      act(() => engineEvents.onPowerUp('SLEEP'));

      expect(useGameStore.getState().powerUp).toBe('sleep()');
      expect(useProgressStore.getState().stats.powerUpsTriggered).toBe(1);
    });

    it('rates the cleared level in the profile, using the level just finished', () => {
      render(<GameScreen />);
      act(() => engineEvents.onLevelChange(1));

      act(() => engineEvents.onLevelComplete(getLevel(1).starThresholds[2], 250));

      expect(useGameStore.getState().status).toBe('levelComplete');
      expect(useProgressStore.getState().progress.stars[1]).toBe(3);
      expect(useProgressStore.getState().progress.unlockedThrough).toBe(2);
    });

    it('files the finished run in the profile as well as on the end screen', () => {
      render(<GameScreen />);

      act(() =>
        engineEvents.onRunEnd({
          mode: 'endless',
          score: 4200,
          levelReached: 9,
          levelScore: 300,
          won: false,
        }),
      );

      expect(useGameStore.getState().status).toBe('gameOver');
      expect(useProgressStore.getState().stats.bestScore.endless).toBe(4200);
      expect(screen.getByRole('dialog', { name: 'CORE DUMPED' })).toBeInTheDocument();
    });
  });

  describe('level complete', () => {
    it('continues into the next level', async () => {
      useGameStore.setState({
        status: 'levelComplete',
        levelResult: { levelScore: 800, bonus: 250 },
      });
      render(<GameScreen />);

      await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

      expect(engine.nextLevel).toHaveBeenCalledTimes(1);
      expect(useGameStore.getState().status).toBe('playing');
      expect(useGameStore.getState().levelResult).toBeNull();
    });
  });

  describe('tutorial', () => {
    it('remembers the tutorial once it has been finished', () => {
      useGameStore.setState({ mode: 'tutorial', status: 'gameWon', gameResult: lostRun });

      render(<GameScreen />);

      expect(useSettingsStore.getState().tutorialSeen).toBe(true);
    });

    it('remembers it just as well when the tutorial is lost', () => {
      useGameStore.setState({ mode: 'tutorial', status: 'gameOver', gameResult: lostRun });

      render(<GameScreen />);

      expect(useSettingsStore.getState().tutorialSeen).toBe(true);
    });

    it('does not count the tutorial as seen while it is still being played', () => {
      useGameStore.setState({ mode: 'tutorial', status: 'playing' });

      render(<GameScreen />);

      expect(useSettingsStore.getState().tutorialSeen).toBe(false);
      expect(screen.getByText(/skip/i)).toBeInTheDocument();
    });

    it('offers no score saving for a tutorial run', () => {
      useGameStore.setState({ mode: 'tutorial', status: 'gameOver', gameResult: lostRun });

      render(<GameScreen />);

      expect(screen.getByRole('status')).toHaveTextContent(/not scored/i);
      expect(screen.queryByRole('button', { name: /save score/i })).not.toBeInTheDocument();
    });
  });

  describe('saving the score', () => {
    async function saveAs(nickname: string) {
      const field = screen.getByLabelText(/nickname/i);
      await userEvent.clear(field);
      await userEvent.type(field, nickname);
      await userEvent.click(screen.getByRole('button', { name: /save score/i }));
    }

    it('saves the run under the nickname the player typed and keeps it for next time', async () => {
      endRunWith();
      render(<GameScreen />);

      await saveAs('trinity');

      expect(saveScore).toHaveBeenCalledWith(
        { displayName: 'trinity', score: 1500, levelReached: 4 },
        'uid1',
        'campaign',
      );
      expect(useSettingsStore.getState().nickname).toBe('trinity');
      expect(await screen.findByText(/score saved/i)).toBeInTheDocument();
    });

    it('says the stored best is still higher when the run does not beat it', async () => {
      (saveScore as Mock).mockResolvedValue('notABest');
      endRunWith();
      render(<GameScreen />);

      await saveAs('neo');

      expect(await screen.findByText(/still higher/i)).toBeInTheDocument();
    });

    it('reports a failed save instead of pretending it worked', async () => {
      (saveScore as Mock).mockRejectedValue(new Error('offline'));
      endRunWith();
      render(<GameScreen />);

      await saveAs('neo');

      expect(await screen.findByText(/not saved/i)).toBeInTheDocument();
    });

    it('reports an error when the player could not be signed in', async () => {
      (ensureSignedIn as Mock).mockResolvedValue(null);
      endRunWith();
      render(<GameScreen />);

      await saveAs('neo');

      expect(await screen.findByText(/not saved/i)).toBeInTheDocument();
      expect(saveScore).not.toHaveBeenCalled();
    });

    it('hides the saving flow when the build has no leaderboard', () => {
      (isLeaderboardAvailable as Mock).mockReturnValue(false);
      endRunWith();

      render(<GameScreen />);

      expect(screen.getByRole('status')).toHaveTextContent(/not configured/i);
      expect(screen.queryByLabelText(/nickname/i)).not.toBeInTheDocument();
    });

    it('opens the field on the nickname already stored', () => {
      useSettingsStore.getState().setNickname('morpheus');
      endRunWith();

      render(<GameScreen />);

      expect(screen.getByLabelText(/nickname/i)).toHaveValue('morpheus');
    });
  });

  describe('retrying', () => {
    it('starts the same mode and level again, on a clean save state', async () => {
      (saveScore as Mock).mockRejectedValue(new Error('offline'));
      useGameStore.setState({ mode: 'endless', startLevel: 1 });
      endRunWith('endless');
      render(<GameScreen />);
      const field = screen.getByLabelText(/nickname/i);
      await userEvent.type(field, 'neo');
      await userEvent.click(screen.getByRole('button', { name: /save score/i }));
      expect(await screen.findByText(/not saved/i)).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

      expect(engine.startRun).toHaveBeenCalledTimes(1);
      expect(useGameStore.getState().status).toBe('playing');
      expect(useGameStore.getState().mode).toBe('endless');
    });

    it('goes back to the menu from the end of a run', async () => {
      endRunWith();
      render(<GameScreen />);

      await userEvent.click(screen.getByRole('button', { name: 'Menu' }));

      expect(useGameStore.getState().screen).toBe('menu');
    });
  });
});
