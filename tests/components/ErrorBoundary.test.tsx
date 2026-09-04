import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

function Boom(): never {
  throw new Error('render exploded');
}

/**
 * React logs the caught error itself; silence it so a passing run does not look
 * like a failing one, and restore it afterwards.
 */
function silenceReactErrorLog() {
  return vi.spyOn(console, 'error').mockImplementation(() => {});
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders its children when nothing goes wrong', () => {
    render(
      <ErrorBoundary>
        <p>the game</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('the game')).toBeInTheDocument();
  });

  it('catches an error thrown while rendering instead of blanking the page', () => {
    silenceReactErrorLog();

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('offers a way out rather than leaving the player stuck', async () => {
    silenceReactErrorLog();
    const reload = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      reload,
    } as unknown as Location);

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    await userEvent.click(screen.getByRole('button', { name: /reload/i }));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not show the failed subtree next to the fallback', () => {
    silenceReactErrorLog();

    render(
      <ErrorBoundary>
        <p>the game</p>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.queryByText('the game')).not.toBeInTheDocument();
  });
});
