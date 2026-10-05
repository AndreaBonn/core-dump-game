import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/shared/Button';
import { i18n } from '@/i18n';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Last line of defence around the app. Without it a throw during render
 * unmounts the whole tree and leaves a black page with no way forward, which
 * on a game reads as a crash with no explanation.
 *
 * Nothing is reported anywhere: the error is logged to the console and stays
 * on the player's machine (no crash-reporting SDK, by decision DEC3 of the
 * hardening plan).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Core Dump crashed while rendering', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <div
        role="alert"
        className="flex h-full w-full flex-col items-center justify-center gap-4 bg-terminal-bg p-6 text-center font-mono"
      >
        {/* A class component cannot use the hook; a crash screen need not follow a live switch. */}
        <h1 className="text-2xl font-bold text-packet-error">{i18n.t('error.title')}</h1>
        <p className="max-w-sm text-sm text-terminal-muted">{i18n.t('error.body')}</p>
        <Button onClick={() => window.location.reload()}>{i18n.t('error.reload')}</Button>
      </div>
    );
  }
}
