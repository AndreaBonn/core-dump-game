import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '@/components/shared/Modal';

/** Nodes appended outside `render`: Testing Library's cleanup does not own them. */
const strayNodes: HTMLElement[] = [];

function appendOpener(): HTMLButtonElement {
  const opener = document.createElement('button');
  opener.textContent = 'Pause';
  document.body.append(opener);
  strayNodes.push(opener);
  return opener;
}

describe('Modal', () => {
  afterEach(() => {
    while (strayNodes.length > 0) {
      strayNodes.pop()!.remove();
    }
  });
  it('names the dialog so a screen reader announces what it is', () => {
    render(
      <Modal title="PAUSED">
        <button type="button">Resume</button>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog', { name: 'PAUSED' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('moves focus to the first control so the keyboard lands inside the dialog', () => {
    render(
      <Modal title="PAUSED">
        <button type="button">Resume</button>
        <button type="button">Quit</button>
      </Modal>,
    );

    expect(screen.getByRole('button', { name: 'Resume' })).toHaveFocus();
  });

  it('focuses the panel itself when the dialog holds no control', () => {
    render(
      <Modal title="WAIT">
        <p>Loading</p>
      </Modal>,
    );

    expect(document.activeElement).not.toBe(document.body);
  });

  it('leaves Tab alone when there is nothing in the dialog to trap it on', async () => {
    render(
      <Modal title="WAIT">
        <p>Loading</p>
      </Modal>,
    );
    const panel = document.activeElement;

    await userEvent.tab();

    expect(document.activeElement).not.toBe(panel);
  });

  it('skips a disabled control when placing the initial focus', () => {
    render(
      <Modal title="PAUSED">
        <button type="button" disabled>
          Resume
        </button>
        <button type="button">Quit</button>
      </Modal>,
    );

    expect(screen.getByRole('button', { name: 'Quit' })).toHaveFocus();
  });

  it('closes on Escape when the dialog is dismissable', async () => {
    const onClose = vi.fn();
    render(
      <Modal title="PAUSED" onClose={onClose}>
        <button type="button">Resume</button>
      </Modal>,
    );

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores Escape when the dialog has no way to be dismissed', async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal title="PAUSED" onClose={onClose}>
        <button type="button">Resume</button>
      </Modal>,
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <Modal title="PAUSED">
        <button type="button">Resume</button>
      </Modal>,
    );
    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('wraps Tab from the last control back to the first', async () => {
    render(
      <Modal title="PAUSED">
        <button type="button">Resume</button>
        <button type="button">Quit</button>
      </Modal>,
    );
    const resume = screen.getByRole('button', { name: 'Resume' });
    const quit = screen.getByRole('button', { name: 'Quit' });
    quit.focus();

    await userEvent.tab();

    expect(resume).toHaveFocus();
  });

  it('wraps Shift+Tab from the first control back to the last', async () => {
    render(
      <Modal title="PAUSED">
        <button type="button">Resume</button>
        <button type="button">Quit</button>
      </Modal>,
    );
    const quit = screen.getByRole('button', { name: 'Quit' });

    await userEvent.tab({ shift: true });

    expect(quit).toHaveFocus();
  });

  it('leaves Tab alone in the middle of the dialog', async () => {
    render(
      <Modal title="PAUSED">
        <button type="button">Resume</button>
        <button type="button">Restart</button>
        <button type="button">Quit</button>
      </Modal>,
    );

    await userEvent.tab();

    expect(screen.getByRole('button', { name: 'Restart' })).toHaveFocus();
  });

  it('gives focus back to whatever had it before the dialog opened', () => {
    const opener = appendOpener();
    opener.focus();

    const { unmount } = render(
      <Modal title="PAUSED">
        <button type="button">Resume</button>
      </Modal>,
    );
    expect(opener).not.toHaveFocus();

    unmount();

    expect(opener).toHaveFocus();
  });

  it('stops listening for keys once it is gone', async () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <Modal title="PAUSED" onClose={onClose}>
        <button type="button">Resume</button>
      </Modal>,
    );

    unmount();
    await userEvent.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
  });
});
