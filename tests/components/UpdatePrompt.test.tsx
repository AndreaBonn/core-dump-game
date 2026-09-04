import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const setNeedRefresh = vi.fn();
const updateServiceWorker = vi.fn();
let needRefresh = false;

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [false, vi.fn()],
    updateServiceWorker,
  }),
}));

import { UpdatePrompt } from '@/components/shared/UpdatePrompt';

describe('UpdatePrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    needRefresh = false;
  });

  it('stays out of the way while the installed version is current', () => {
    render(<UpdatePrompt />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('announces a waiting version without interrupting play', () => {
    needRefresh = true;

    render(<UpdatePrompt />);

    // A status, not an alert or a dialog: it must not steal focus mid-run.
    expect(screen.getByRole('status')).toHaveTextContent(/new version/i);
  });

  it('applies the update only when the player asks for it', async () => {
    needRefresh = true;
    render(<UpdatePrompt />);

    await userEvent.click(screen.getByRole('button', { name: /update now/i }));

    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('lets the player postpone, and does not update behind their back', async () => {
    needRefresh = true;
    render(<UpdatePrompt />);

    await userEvent.click(screen.getByRole('button', { name: /later/i }));

    expect(setNeedRefresh).toHaveBeenCalledWith(false);
    expect(updateServiceWorker).not.toHaveBeenCalled();
  });
});
