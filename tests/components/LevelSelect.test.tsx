import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LevelSelect } from '@/components/menu/LevelSelect';
import { CHAPTERS } from '@/config/campaign';
import { getLevel, TOTAL_LEVELS } from '@/config/levels';
import { useGameStore } from '@/store/useGameStore';
import { useProgressStore } from '@/store/useProgressStore';

function resetStores() {
  localStorage.clear();
  useGameStore.setState({ ...useGameStore.getInitialState(), screen: 'menu' });
  useProgressStore.getState().clearProfile();
}

describe('LevelSelect', () => {
  beforeEach(resetStores);

  it('locks every level except the first on a fresh profile', () => {
    render(<LevelSelect />);

    expect(screen.getByRole('button', { name: /Level 1, 0 of 3 stars/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Level 2, locked/ })).toBeDisabled();
  });

  it('starts the campaign from the chosen level', async () => {
    useProgressStore.getState().recordLevelResult(1, getLevel(1).starThresholds[0], 'campaign');
    render(<LevelSelect />);

    await userEvent.click(screen.getByRole('button', { name: /^Level 2,/ }));

    expect(useGameStore.getState().screen).toBe('game');
    expect(useGameStore.getState().startLevel).toBe(2);
    expect(useGameStore.getState().level).toBe(2);
  });

  it('announces the rating in the accessible name, not with colour alone', () => {
    useProgressStore.getState().recordLevelResult(1, getLevel(1).starThresholds[2], 'campaign');
    render(<LevelSelect />);

    expect(screen.getByRole('button', { name: /Level 1, 3 of 3 stars/ })).toBeInTheDocument();
  });

  it('lists every campaign level', () => {
    render(<LevelSelect />);

    expect(screen.getAllByRole('listitem')).toHaveLength(TOTAL_LEVELS);
  });

  it('goes back to the menu', async () => {
    render(<LevelSelect />);

    await userEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(useGameStore.getState().screen).toBe('menu');
  });

  it('groups levels under one heading per chapter', () => {
    render(<LevelSelect />);

    expect(screen.getByRole('heading', { name: 'Chapter 1 · Basics' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chapter 2 · Hazards' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Chapter 3 · Armored packets' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chapter 4 · Reversal' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chapter 5 · Waves' })).toBeInTheDocument();
  });

  it('shows the stars earned in a chapter against the stars available in it', () => {
    useProgressStore.getState().recordLevelResult(1, getLevel(1).starThresholds[2], 'campaign');
    render(<LevelSelect />);

    const chapterOneLength = CHAPTERS[0]!.levels.length;
    expect(screen.getByText(`3/${chapterOneLength * 3} stars`)).toBeInTheDocument();
    for (const chapter of CHAPTERS.slice(1)) {
      const region = screen.getByRole('region', { name: new RegExp(`^Chapter ${chapter.id} ·`) });
      expect(within(region).getByText(`0/${chapter.levels.length * 3} stars`)).toBeInTheDocument();
    }
  });

  it('marks the last level of a chapter as the boss in text, not only in colour', () => {
    useProgressStore.getState().recordLevelResult(5, getLevel(5).starThresholds[2], 'campaign');
    render(<LevelSelect />);

    const bossTile = screen.getByRole('button', { name: /Level 6, boss/ });
    expect(within(bossTile).getByText('BOSS')).toBeInTheDocument();
  });

  it('names a locked boss as a boss too', () => {
    render(<LevelSelect />);

    expect(screen.getByRole('button', { name: /Level 6, boss, locked/ })).toBeDisabled();
  });

  it('does not mark a non-boss level as the boss', () => {
    render(<LevelSelect />);

    const regularTile = screen.getByRole('button', { name: /^Level 1,/ });
    expect(within(regularTile).queryByText('BOSS')).not.toBeInTheDocument();
  });
});
