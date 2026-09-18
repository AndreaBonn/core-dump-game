import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LevelCompleteScreen } from '@/components/game/LevelCompleteScreen';
import { PauseOverlay } from '@/components/game/PauseOverlay';
import { Button } from '@/components/shared/Button';

describe('PauseOverlay', () => {
  function renderOverlay() {
    const props = { onResume: vi.fn(), onRestart: vi.fn(), onMenu: vi.fn() };
    render(<PauseOverlay {...props} />);
    return props;
  }

  it('announces itself as the pause dialog', () => {
    renderOverlay();

    expect(screen.getByRole('dialog', { name: 'PAUSED' })).toBeInTheDocument();
  });

  it('resumes the run', async () => {
    const props = renderOverlay();

    await userEvent.click(screen.getByRole('button', { name: 'Resume' }));

    expect(props.onResume).toHaveBeenCalledTimes(1);
    expect(props.onRestart).not.toHaveBeenCalled();
  });

  it('restarts the level', async () => {
    const props = renderOverlay();

    await userEvent.click(screen.getByRole('button', { name: 'Restart level' }));

    expect(props.onRestart).toHaveBeenCalledTimes(1);
  });

  it('quits to the menu', async () => {
    const props = renderOverlay();

    await userEvent.click(screen.getByRole('button', { name: 'Quit to menu' }));

    expect(props.onMenu).toHaveBeenCalledTimes(1);
  });

  it('treats Escape as resume, so the pause key also unpauses', async () => {
    const props = renderOverlay();

    await userEvent.keyboard('{Escape}');

    expect(props.onResume).toHaveBeenCalledTimes(1);
  });
});

describe('LevelCompleteScreen', () => {
  const result = { levelScore: 800, bonus: 250 };

  it('breaks the total down into the level score and the clear bonus', () => {
    render(<LevelCompleteScreen result={result} totalScore={3050} onContinue={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'LEVEL CLEARED' })).toBeInTheDocument();
    expect(screen.getByText('800')).toBeInTheDocument();
    expect(screen.getByText('+250')).toBeInTheDocument();
    expect(screen.getByText('3050')).toBeInTheDocument();
  });

  it('continues to the next level', async () => {
    const onContinue = vi.fn();
    render(<LevelCompleteScreen result={result} totalScore={3050} onContinue={onContinue} />);

    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('cannot be dismissed with Escape: the player must acknowledge the level', async () => {
    const onContinue = vi.fn();
    render(<LevelCompleteScreen result={result} totalScore={3050} onContinue={onContinue} />);

    await userEvent.keyboard('{Escape}');

    expect(onContinue).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'LEVEL CLEARED' })).toBeInTheDocument();
  });
});

describe('Button', () => {
  it('is a plain button, not a form submit, unless asked otherwise', () => {
    render(<Button>Play</Button>);

    expect(screen.getByRole('button', { name: 'Play' })).toHaveAttribute('type', 'button');
  });

  it('submits when it is given the submit type', () => {
    render(<Button type="submit">Send</Button>);

    expect(screen.getByRole('button', { name: 'Send' })).toHaveAttribute('type', 'submit');
  });

  it('runs its action when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Play</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Play' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does nothing while disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Play
      </Button>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Play' }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('keeps the classes it is given alongside its own', () => {
    render(<Button className="w-full">Play</Button>);

    expect(screen.getByRole('button', { name: 'Play' })).toHaveClass('w-full');
  });
});
