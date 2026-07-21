import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  children: ReactNode;
}

/** Centred terminal-style panel used for pause, level, and game-over overlays. */
export function Modal({ title, children }: ModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="absolute inset-0 z-[400] flex items-center justify-center bg-terminal-bg/85 p-4"
    >
      <div className="w-full max-w-sm rounded-lg border border-terminal-border bg-terminal-panel p-6 shadow-2xl">
        <h2 className="mb-4 text-center font-mono text-xl font-bold text-terminal-accent">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
